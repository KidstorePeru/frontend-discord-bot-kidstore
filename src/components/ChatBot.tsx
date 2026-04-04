import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, Globe, Rocket, HelpCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { chatStart, chatSendMessage } from '../services/api';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function ChatBot() {
  const { lang } = useLang();
  const es = lang === 'es';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedAt = localStorage.getItem('kc_chat_saved_at');
      if (savedAt && Date.now() - Number(savedAt) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('kc_chat_messages');
        localStorage.removeItem('kc_chat_session');
        localStorage.removeItem('kc_chat_saved_at');
        return [];
      }
      const saved = localStorage.getItem('kc_chat_messages');
      if (saved) return JSON.parse(saved) as Message[];
    } catch {}
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<string | null>(localStorage.getItem('kc_chat_session'));
  const sseRef = useRef<EventSource | null>(null);
  const langRef = useRef(lang);

  // Poll for new messages (replaces SSE which doesn't work with ngrok free)
  const connectSSE = useCallback((sid: string) => {
    // Stop any existing poll
    if (sseRef.current) { clearInterval(sseRef.current as unknown as number); }

    const AB = import.meta.env.VITE_AUTOBUYER_URL || 'http://localhost:7788';
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${AB}/api/v1/chat/poll/${sid}`, {
          headers: { 'ngrok-skip-browser-warning': '1' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const msgs: { role?: string; text?: string }[] = data.messages || [];
        for (const msg of msgs) {
          if (msg.role === 'bot' && msg.text) {
            setMessages(prev => [...prev, { role: 'bot', content: msg.text! }]);
          }
        }
      } catch { /* retry next interval */ }
    }, 1000);

    // Store interval ID in sseRef for cleanup (reuse ref to avoid new state)
    sseRef.current = pollInterval as unknown as EventSource;
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('kc_chat_messages', JSON.stringify(messages.slice(-80)));
        localStorage.setItem('kc_chat_saved_at', String(Date.now()));
      } catch {}
    }
  }, [messages]);

  // Reset session when language changes so the bot replies in the new language
  useEffect(() => {
    if (lang !== langRef.current) {
      langRef.current = lang;
      if (sseRef.current) { clearInterval(sseRef.current as unknown as number); sseRef.current = null; }
      sessionRef.current = null;
      localStorage.removeItem('kc_chat_session');
      setMessages([]);
      localStorage.removeItem('kc_chat_messages');
      if (open) {
        (async () => {
          try {
            const sid = await chatStart();
            sessionRef.current = sid;
            localStorage.setItem('kc_chat_session', sid);
            connectSSE(sid);
          } catch {}
        })();
      }
    }
  }, [lang, open, connectSSE]);

  // Start or resume session when chat opens
  useEffect(() => {
    if (!open) return;

    async function initSession() {
      try {
        let sid = sessionRef.current;
        if (!sid) {
          sid = await chatStart();
          sessionRef.current = sid;
          localStorage.setItem('kc_chat_session', sid);
        }
        connectSSE(sid);
      } catch { /* session init failed — will retry on next message */ }
    }

    initSession();

    return () => {
      if (sseRef.current) { clearInterval(sseRef.current as unknown as number); sseRef.current = null; }
    };
  }, [open, connectSSE]);

  // Listen for external open-chatbot event (from Store page after payment)
  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent).detail;
      setOpen(true);
      if (detail?.code) {
        const code = detail.code as string;
        const product = (detail.product as string) || '';
        setTimeout(() => {
          const congratsMsg = es
            ? `🎉 **Felicidades!** Compraste **${product}**\n\nTu codigo de activacion es: **${code}**\n\nActivando automaticamente...`
            : `🎉 **Congratulations!** You purchased **${product}**\n\nYour activation code is: **${code}**\n\nActivating automatically...`;
          setMessages(prev => [...prev, { role: 'bot', content: congratsMsg }]);
          setTimeout(() => sendDirect(`!activar ${code}`), 1500);
        }, 500);
      }
    }
    window.addEventListener('open-chatbot', handleOpen);
    return () => window.removeEventListener('open-chatbot', handleOpen);
  }, [es]);

  function quickSend(text: string) {
    setInput('');
    sendDirect(text);
  }

  async function sendDirect(directText: string) {
    const text = directText.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      let sid = sessionRef.current;
      if (!sid) {
        sid = await chatStart();
        sessionRef.current = sid;
        localStorage.setItem('kc_chat_session', sid);
        connectSSE(sid);
      }
      await chatSendMessage(sid, text);
    } catch (err) {
      // Session might have expired — create a new one and retry
      try {
        const sid = await chatStart();
        sessionRef.current = sid;
        localStorage.setItem('kc_chat_session', sid);
        connectSSE(sid);
        await chatSendMessage(sid, text);
      } catch {
        setMessages(prev => [...prev, { role: 'bot', content: es ? '❌ Error de conexion. Intenta de nuevo.' : '❌ Connection error. Please try again.' }]);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendDirect(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function clearChat() {
    setMessages([]);
    localStorage.removeItem('kc_chat_messages');
    if (sseRef.current) { clearInterval(sseRef.current as unknown as number); sseRef.current = null; }
    setLoading(false);
    // Create a fresh session so the welcome message arrives again
    try {
      const sid = await chatStart();
      sessionRef.current = sid;
      localStorage.setItem('kc_chat_session', sid);
      connectSSE(sid);
    } catch { /* will retry on next message */ }
  }

  return (
    <>
      {!open && (
        <button className="chatbot-btn" onClick={() => setOpen(true)} aria-label="Chat">
          <MessageCircle size={24} />
        </button>
      )}

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <Bot size={20} />
              <div>
                <strong>{es ? 'Soporte KidStore' : 'KidStore Support'}</strong>
                <span>{es ? 'Bot de comandos' : 'Command Bot'}</span>
              </div>
            </div>
            <button className="chatbot-clear" onClick={clearChat} title={es ? 'Limpiar chat' : 'Clear chat'}><Trash2 size={15} /></button>
            <button className="chatbot-close" onClick={() => setOpen(false)}><X size={18} /></button>
          </div>

          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <Loader2 size={20} className="spin" style={{color: 'var(--accent)'}} />
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`chatbot-bubble chatbot-bubble-${msg.role === 'user' ? 'user' : 'assistant'}`}>
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}

            {/* Quick bar after last bot message */}
            {messages.length > 0 && !loading && messages[messages.length - 1].role === 'bot' && (
              <div className="chatbot-quick-bar">
                <button onClick={() => quickSend(es ? '!activar' : '!activate')}><Rocket size={12}/> {es ? 'Activar' : 'Activate'}</button>
                <button onClick={() => quickSend(es ? '!cancelar' : '!cancel')}><X size={12}/> {es ? 'Cancelar' : 'Cancel'}</button>
                <button onClick={() => quickSend('!region')}><Globe size={12}/> Region</button>
                <button onClick={() => quickSend(es ? '!verificar' : '!verify')}><ShieldCheck size={12}/> {es ? 'Verificar' : 'Verify'}</button>
                <button onClick={() => quickSend(es ? '!soporte' : '!support')}><HelpCircle size={12}/> {es ? 'Soporte' : 'Support'}</button>
                <button onClick={() => clearChat()}><HelpCircle size={12}/> {es ? 'Comandos' : 'Commands'}</button>
              </div>
            )}

            {loading && (
              <div className="chatbot-bubble chatbot-bubble-assistant chatbot-typing">
                <Loader2 size={14} className="spin" />
                {es ? 'Enviando...' : 'Sending...'}
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          <div className="chatbot-input-area">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={es ? 'Escribe un comando...' : 'Type a command...'}
              disabled={loading}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function renderContent(text: string | undefined) {
  if (!text) return null;
  const paragraphs = text.split('\n\n');
  return (
    <div className="chatbot-content">
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n');
        // Detect command list lines: start with emoji or • followed by backtick code
        const isCmdLine = (l: string) => {
          const t = l.trimStart();
          return (t.startsWith('•') || /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(t)) && t.includes('`');
        };
        const cmdLines = lines.filter(isCmdLine);
        if (cmdLines.length >= 2) {
          const nonCmdLines = lines.filter(l => !isCmdLine(l));
          return (
            <div key={pi} className="chatbot-para">
              {nonCmdLines.map((line, li) => (
                <span key={`t${li}`}>{renderLine(line)}{li < nonCmdLines.length - 1 && <br/>}</span>
              ))}
              <div className="chatbot-cmd-list">
                {cmdLines.map((line, li) => {
                  // Extract emoji and rest of content
                  const t = line.trimStart();
                  const emojiMatch = t.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}•]\s*)/u);
                  const emoji = emojiMatch ? emojiMatch[1].trim() : '•';
                  const content = emojiMatch ? t.slice(emojiMatch[0].length) : t.replace(/^\s*•\s*/, '');
                  return (
                    <div key={li} className="chatbot-cmd-item">
                      <span className="chatbot-cmd-bullet">{emoji}</span>
                      <span className="chatbot-cmd-text">{renderLine(content)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        // Normal paragraph
        return (
          <div key={pi} className="chatbot-para">
            {lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {renderLine(line)}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function renderLine(line: string) {
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:[^)]+)\)/);
    const urlMatch = remaining.match(/(https?:\/\/[^\s]+)/);

    const matches = [
      boldMatch ? { type: 'bold', index: boldMatch.index!, length: boldMatch[0].length, content: boldMatch[1] } : null,
      codeMatch ? { type: 'code', index: codeMatch.index!, length: codeMatch[0].length, content: codeMatch[1] } : null,
      linkMatch ? { type: 'link', index: linkMatch.index!, length: linkMatch[0].length, content: linkMatch[1], url: linkMatch[2] } : null,
      urlMatch && !linkMatch ? { type: 'url', index: urlMatch.index!, length: urlMatch[0].length, content: urlMatch[1], url: urlMatch[1] } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);
    }

    if (first.type === 'bold') {
      parts.push(<strong key={key++}>{first.content}</strong>);
    } else if (first.type === 'code') {
      parts.push(<code key={key++}>{first.content}</code>);
    } else if (first.type === 'link') {
      parts.push(<a key={key++} href={(first as {url:string}).url} target="_blank" rel="noopener noreferrer">{first.content}</a>);
    } else if (first.type === 'url') {
      const url = (first as {url:string}).url;
      const isEpic = url.includes('epicgames.com/activate');
      parts.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className={isEpic ? 'chatbot-epic-btn' : ''}>
          {isEpic ? '🔐 Epic Games Login' : url.length > 50 ? url.slice(0, 50) + '...' : url}
        </a>
      );
    }

    remaining = remaining.slice(first.index + first.length);
  }

  return <>{parts}</>;
}
