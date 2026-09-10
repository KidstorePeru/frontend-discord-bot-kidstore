import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { getBotsStatus } from '../services/api';
import type { BotsStatusResponse } from '../services/api';
import { Copy, CheckCircle2, Clock, Bot, Moon } from 'lucide-react';

// Colores para los avatares — se asignan por posición.
const AVATAR_COLORS = [
  '#818cf8', '#34d399', '#f472b6', '#60a5fa', '#fb923c',
  '#a78bfa', '#4ade80', '#f87171', '#38bdf8', '#facc15',
  '#e879f9', '#2dd4bf', '#fb7185', '#a3e635', '#c084fc',
];

// Lista de respaldo si la API de estado falla — solo nombres, sin estado.
const FALLBACK_BOTS = Array.from({ length: 15 }, (_, i) => ({
  display_name: `KidStore${String(i + 1).padStart(4, '0')}`,
  is_active: true,
  remaining_gifts: 5,
  id: `fallback-${i}`,
}));

type BotAccount = BotsStatusResponse['accounts'][number];

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

  // Cuentas a mostrar: las reales de la API, o el respaldo si falló.
  const list = (accounts && accounts.length > 0 ? accounts : FALLBACK_BOTS) as BotAccount[];

  const scheduleText = schedule
    ? `${pad(schedule.start_hour)}:00 – ${pad(schedule.end_hour)}:00 (${schedule.timezone})`
    : '';

  function statusOf(bot: BotAccount): { label: string; tone: 'ok' | 'warn' | 'off' | 'sleep' } {
    if (!inSchedule) {
      return {
        label: es
          ? `Fuera de horario · vuelve a las ${pad(schedule?.start_hour ?? 0)}:00`
          : `Outside hours · back at ${pad(schedule?.start_hour ?? 0)}:00`,
        tone: 'sleep',
      };
    }
    if (!bot.is_active) return { label: t('bots.st.inactive'), tone: 'off' };
    if (bot.remaining_gifts <= 0) return { label: t('bots.st.nogifts'), tone: 'warn' };
    return {
      label: es
        ? `${bot.remaining_gifts} envío${bot.remaining_gifts === 1 ? '' : 's'} disponible${bot.remaining_gifts === 1 ? '' : 's'} hoy`
        : `${bot.remaining_gifts} deliver${bot.remaining_gifts === 1 ? 'y' : 'ies'} available today`,
      tone: 'ok',
    };
  }

  return (
    <div className="bots-page">
      <header className="bots-header">
        <div className="bots-header-icon"><Bot size={26} /></div>
        <div className="bots-header-text">
          <h1>{t('bots.title')}</h1>
          <p className="bots-sub">{t('bots.sub')}</p>
        </div>
      </header>

      <div className="bots-info">
        <span className="bots-info-ic"><Clock size={16} /></span>
        <div>
          <strong>{t('bots.why')}</strong>
          <p>{t('bots.why.desc')}</p>
        </div>
      </div>

      {!loading && !inSchedule && (
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
        {list.map((bot, i) => {
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const st = statusOf(bot);
          const initial = (bot.display_name || '?').trim().charAt(0).toUpperCase();
          return (
            <article className={`bot-card tone-${st.tone}`} key={bot.id || bot.display_name}>
              <div className="bot-card-top">
                <span className={`bot-dot tone-${st.tone}`} aria-hidden="true" />
                <div className="bot-avatar" style={{ '--bc': color } as React.CSSProperties}>
                  {st.tone === 'sleep' ? <Moon size={20} /> : <span className="bot-avatar-letter">{initial}</span>}
                </div>
              </div>

              <div className="bot-card-body">
                <span className="bot-label">{t('bots.label')}</span>
                <strong className="bot-name" title={bot.display_name}>{bot.display_name}</strong>
                <span className={`bot-status tone-${st.tone}`}>{st.label}</span>
              </div>

              <button className="bot-copy" onClick={() => copyId(bot.display_name)}>
                {copied === bot.display_name
                  ? <><CheckCircle2 size={15} /> {t('bots.copied')}</>
                  : <><Copy size={15} /> {t('bots.copy')}</>}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
