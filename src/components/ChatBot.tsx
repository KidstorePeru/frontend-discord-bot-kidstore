import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, Globe, Rocket, HelpCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { chatStart, chatSendMessage, chatStreamURL } from '../services/api';

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

  // Connect SSE when chat opens
  const connectSSE = useCallback((sid: string) => {
    if (sseRef.current) { sseRef.current.close(); }
    const es2 = new EventSource(chatStreamURL(sid));
    sseRef.current = es2;

    es2.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.role === 'bot' && data.text) {
          setMessages(prev => [...prev, { role: 'bot', content: data.text }]);
        }
        // User echoes come back too — skip them (we already show the user's message)
      } catch {}
    };

    es2.onopen = () => {};
    es2.onerror = () => {
      // Try to reconnect after 3s
      setTimeout(() => {
        if (sseRef.current === es2 && sessionRef.current === sid) {
          connectSSE(sid);
        }
      }, 3000);
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem('kc_chat_messages', JSON.stringify(messages.slice(-80))); } catch {}
    }
  }, [messages]);

  // Reset session when language changes so the bot replies in the new language
  useEffect(() => {
    if (lang !== langRef.current) {
      langRef.current = lang;
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
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
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
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

  function clearChat() {
    setMessages([]);
    localStorage.removeItem('kc_chat_messages');
    // Also reset session so we get a fresh one
    sessionRef.current = null;
    localStorage.removeItem('kc_chat_session');
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setLoading(false);
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
                <Bot size={36} />
                <div>
                  <p style={{fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)', marginBottom: 4}}>
                    {es ? 'Hola! Bienvenido' : 'Hi! Welcome'}
                  </p>
                  <p>{es ? 'Selecciona una opcion o escribe un comando' : 'Select an option or type a command'}</p>
                </div>
                <div className="chatbot-quick-actions">
                  <button className="chatbot-quick-btn" onClick={() => quickSend('!activar')}>
                    <Rocket size={16}/> {es ? 'Activar compra' : 'Activate purchase'}
                  </button>
                  <button className="chatbot-quick-btn" onClick={() => quickSend('!region')}>
                    <Globe size={16}/> {es ? 'Ver region' : 'Check region'}
                  </button>
                  <button className="chatbot-quick-btn" onClick={() => quickSend('!verificar')}>
                    <ShieldCheck size={16}/> {es ? 'Verificar' : 'Verify eligibility'}
                  </button>
                  <button className="chatbot-quick-btn" onClick={() => quickSend('!soporte')}>
                    <HelpCircle size={16}/> {es ? 'Soporte' : 'Support'}
                  </button>
                </div>
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
                <button onClick={() => quickSend('help')}><HelpCircle size={12}/> {es ? 'Comandos' : 'Commands'}</button>
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
        // Check if this paragraph is a bullet list
        const bulletLines = lines.filter(l => l.trimStart().startsWith('•'));
        if (bulletLines.length >= 2) {
          // Render as styled command list
          const nonBullets = lines.filter(l => !l.trimStart().startsWith('•'));
          return (
            <div key={pi} className="chatbot-para">
              {nonBullets.map((line, li) => (
                <span key={`t${li}`}>{renderLine(line)}{li < nonBullets.length - 1 && <br/>}</span>
              ))}
              <div className="chatbot-cmd-list">
                {bulletLines.map((line, li) => {
                  const content = line.replace(/^\s*•\s*/, '');
                  return (
                    <div key={li} className="chatbot-cmd-item">
                      <span className="chatbot-cmd-bullet">•</span>
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

    const matches = [
      boldMatch ? { type: 'bold', index: boldMatch.index!, length: boldMatch[0].length, content: boldMatch[1] } : null,
      codeMatch ? { type: 'code', index: codeMatch.index!, length: codeMatch[0].length, content: codeMatch[1] } : null,
      linkMatch ? { type: 'link', index: linkMatch.index!, length: linkMatch[0].length, content: linkMatch[1], url: linkMatch[2] } : null,
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
    }

    remaining = remaining.slice(first.index + first.length);
  }

  return <>{parts}</>;
}
