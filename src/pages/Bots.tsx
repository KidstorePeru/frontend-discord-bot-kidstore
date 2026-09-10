import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { getBotsStatus } from '../services/api';
import type { BotsStatusResponse } from '../services/api';
import { Copy, CheckCircle2, Clock, Bot, Moon, WifiOff } from 'lucide-react';

// Roster fijo: siempre se muestran 20 cuentas. Las que la API reporta como
// conectadas llevan su nombre y estado reales; las demás aparecen como
// "Desconectado".
const ROSTER_SIZE = 20;
const ROSTER = Array.from({ length: ROSTER_SIZE }, (_, i) => `KidStore${String(i + 1).padStart(4, '0')}`);

const AVATAR_COLORS = [
  '#818cf8', '#34d399', '#f472b6', '#60a5fa', '#fb923c',
  '#a78bfa', '#4ade80', '#f87171', '#38bdf8', '#facc15',
  '#e879f9', '#2dd4bf', '#fb7185', '#a3e635', '#c084fc',
  '#93c5fd', '#6ee7b7', '#fca5a5', '#d8b4fe', '#fde047',
];

type BotAccount = BotsStatusResponse['accounts'][number];
type Tone = 'ok' | 'warn' | 'off' | 'sleep' | 'gone' | 'unknown';

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function Bots() {
  const { t, lang } = useLang();
  const [copied, setCopied] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BotAccount[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [inSchedule, setInSchedule] = useState(true);
  const [schedule, setSchedule] = useState<BotsStatusResponse['schedule'] | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    getBotsStatus()
      .then(d => {
        if (d.success) {
          setAccounts(d.accounts || []);
          setInSchedule(d.in_schedule ?? true);
          setSchedule(d.schedule ?? null);
          setCurrentTime(d.current_time ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copyId(name: string) {
    navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  }

  const es = lang === 'es';
  const apiFailed = !loading && accounts === null;
  const connected = accounts ?? [];
  const scheduleText = schedule
    ? `${pad(schedule.start_hour)}:00 – ${pad(schedule.end_hour)}:00 (${schedule.timezone})`
    : '';

  // Arma exactamente 20 tarjetas: primero las conectadas (datos reales),
  // luego se rellena con slots del roster hasta llegar a 20.
  const connectedNames = new Set(connected.map(a => a.display_name.toLowerCase()));
  const fillers = ROSTER.filter(n => !connectedNames.has(n.toLowerCase()));
  const needed = Math.max(0, ROSTER_SIZE - connected.length);
  const cards: { key: string; name: string; account: BotAccount | null }[] = [
    ...connected.map(a => ({ key: a.id || a.display_name, name: a.display_name, account: a })),
    ...fillers.slice(0, needed).map(n => ({ key: n, name: n, account: null as BotAccount | null })),
  ];

  function statusOf(account: BotAccount | null): { label: string; tone: Tone } {
    if (apiFailed) return { label: es ? 'Estado no disponible' : 'Status unavailable', tone: 'unknown' };
    if (!account) return { label: es ? 'Desconectado' : 'Disconnected', tone: 'gone' };
    if (!inSchedule) {
      return {
        label: es
          ? `Fuera de horario · vuelve a las ${pad(schedule?.start_hour ?? 0)}:00`
          : `Outside hours · back at ${pad(schedule?.start_hour ?? 0)}:00`,
        tone: 'sleep',
      };
    }
    if (!account.is_active) return { label: t('bots.st.inactive'), tone: 'off' };
    if (account.remaining_gifts <= 0) return { label: t('bots.st.nogifts'), tone: 'warn' };
    return {
      label: es
        ? `${account.remaining_gifts} envío${account.remaining_gifts === 1 ? '' : 's'} disponible${account.remaining_gifts === 1 ? '' : 's'} hoy`
        : `${account.remaining_gifts} deliver${account.remaining_gifts === 1 ? 'y' : 'ies'} available today`,
      tone: 'ok',
    };
  }

  const onlineCount = connected.filter(a => a.is_active).length;

  return (
    <div className="bots-page">
      <header className="bots-header">
        <div className="bots-header-icon"><Bot size={26} /></div>
        <div className="bots-header-text">
          <h1>{t('bots.title')}</h1>
          <p className="bots-sub">{t('bots.sub')}</p>
        </div>
        {!loading && !apiFailed && (
          <span className="bots-header-count" title={es ? 'Cuentas activas ahora mismo' : 'Accounts active right now'}>
            <span className="bots-count-dot" />
            {onlineCount} / {ROSTER_SIZE} {es ? 'activas' : 'active'}
          </span>
        )}
      </header>

      <div className="bots-info">
        <span className="bots-info-ic"><Clock size={16} /></span>
        <div>
          <strong>{t('bots.why')}</strong>
          <p>{t('bots.why.desc')}</p>
        </div>
      </div>

      {!loading && !inSchedule && !apiFailed && (
        <div className="bots-offline" role="note">
          <span className="bots-offline-ic"><Moon size={16} /></span>
          <div>
            <strong>{es ? 'Los bots están fuera de horario' : 'Bots are outside working hours'}</strong>
            <p>
              {es
                ? `El servicio opera de ${scheduleText}. Ahora en Lima son las ${currentTime}. Los envíos se reanudan solos — igual puedes agregarlos como amigos ahora.`
                : `Service runs ${scheduleText}. It's ${currentTime} in Lima now. Deliveries resume automatically — you can still add them as friends now.`}
            </p>
          </div>
        </div>
      )}

      <div className="bots-list-head">
        <h2>{t('bots.list.title')}</h2>
        <p>{t('bots.list.sub')}</p>
      </div>

      <div className="bots-grid">
        {cards.map((card, i) => {
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const st = statusOf(card.account);
          const initial = (card.name || '?').trim().charAt(0).toUpperCase();
          const canCopy = st.tone !== 'gone';
          return (
            <article className={`bot-card tone-${st.tone}`} key={card.key}>
              <div className="bot-card-top">
                <span className={`bot-dot tone-${st.tone}`} aria-hidden="true" />
                <div className="bot-avatar" style={{ '--bc': color } as React.CSSProperties}>
                  {st.tone === 'gone'
                    ? <WifiOff size={19} />
                    : st.tone === 'sleep'
                      ? <Moon size={20} />
                      : <span className="bot-avatar-letter">{initial}</span>}
                </div>
              </div>

              <div className="bot-card-body">
                <span className="bot-label">{t('bots.label')}</span>
                <strong className="bot-name" title={card.name}>{card.name}</strong>
                <span className={`bot-status tone-${st.tone}`}>{st.label}</span>
              </div>

              {canCopy ? (
                <button className="bot-copy" onClick={() => copyId(card.name)}>
                  {copied === card.name
                    ? <><CheckCircle2 size={15} /> {t('bots.copied')}</>
                    : <><Copy size={15} /> {t('bots.copy')}</>}
                </button>
              ) : (
                <span className="bot-copy bot-copy-disabled">{es ? 'No disponible' : 'Unavailable'}</span>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
