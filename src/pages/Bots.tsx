import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { Copy, CheckCircle2, Clock, Bot, ShieldOff, ShieldCheck, AlertTriangle, Moon } from 'lucide-react';

const STATIC_BOTS = Array.from({ length: 15 }, (_, i) => ({
  num: i + 1,
  epicId: `KidStore${String(i + 1).padStart(4, '0')}`,
  color: [
    '#818cf8','#34d399','#f472b6','#60a5fa','#fb923c',
    '#a78bfa','#4ade80','#f87171','#38bdf8','#facc15',
    '#e879f9','#2dd4bf','#fb7185','#a3e635','#c084fc',
  ][i],
}));

interface BotAccount {
  id: string;
  display_name: string;
  remaining_gifts: number;
  is_active: boolean;
}

interface BotsStatusResponse {
  success: boolean;
  accounts: BotAccount[];
  in_schedule: boolean;
  reason: string;
  schedule: {
    enabled: boolean;
    start_hour: number;
    end_hour: number;
    timezone: string;
  };
  current_time: string;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function Bots() {
  const { t, lang } = useLang();
  const [copied, setCopied] = useState<number | null>(null);
  const [linkedBots, setLinkedBots] = useState<BotAccount[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [inSchedule, setInSchedule] = useState(true);
  const [schedule, setSchedule] = useState<BotsStatusResponse['schedule'] | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    fetch('/api/store/bots-status', {
      headers: { Authorization: `Bearer ${localStorage.getItem('kc_token') || ''}` },
    })
      .then(r => r.json())
      .then((d: BotsStatusResponse) => {
        if (d.success) {
          setLinkedBots(d.accounts || []);
          setInSchedule(d.in_schedule ?? true);
          setSchedule(d.schedule ?? null);
          setCurrentTime(d.current_time ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBots(false));
  }, []);

  function copyId(epicId: string, idx: number) {
    navigator.clipboard.writeText(epicId);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  const es = lang === 'es';

  // Si está fuera de horario los bots se muestran "apagados"
  const effectiveBots = inSchedule ? linkedBots : linkedBots.map(b => ({ ...b, is_active: false, remaining_gifts: 0 }));

  const hasAvailableBots = inSchedule && linkedBots.some(b => b.is_active && b.remaining_gifts > 0);
  const activeBots = linkedBots.filter(b => b.is_active);
  const hasLinked = linkedBots.length > 0;

  // Texto del horario formateado
  const scheduleText = schedule
    ? `${pad(schedule.start_hour)}:00 — ${pad(schedule.end_hour)}:00 (${schedule.timezone})`
    : '';

  return (
    <div className="bots-page">
      <div className="bots-header">
        <div className="bots-header-icon"><Bot size={28} /></div>
        <div>
          <h1>{t('bots.title')}</h1>
          <p className="bots-sub">{t('bots.sub')}</p>
        </div>
      </div>

      <div className="bots-info">
        <Clock size={20} />
        <div>
          <strong>{t('bots.why')}</strong>
          <p>{t('bots.why.desc')}</p>
        </div>
      </div>

      {/* ── Estado del servicio ── */}
      {!loadingBots && hasLinked && (
        <div className="bots-status-section">
          <h2 className="bots-status-title">{es ? 'Estado del servicio' : 'Service status'}</h2>

          {/* Banner principal — 3 estados posibles */}
          {!inSchedule ? (
            /* ── FUERA DE HORARIO ── */
            <div className="bots-availability bots-offline">
              <Moon size={20} />
              <div>
                <strong>{es ? 'Bots fuera de horario de trabajo' : 'Bots outside working hours'}</strong>
                <span>
                  {es
                    ? `El servicio opera de ${scheduleText}. Hora Lima actual: ${currentTime}. Los envíos se reanudan automáticamente en el horario indicado.`
                    : `Service operates from ${scheduleText}. Current Lima time: ${currentTime}. Deliveries resume automatically during operating hours.`}
                </span>
              </div>
            </div>
          ) : hasAvailableBots ? (
            /* ── DISPONIBLE ── */
            <div className="bots-availability available">
              <ShieldCheck size={20} />
              <div>
                <strong>{es ? 'Servicio disponible' : 'Service available'}</strong>
                <span>
                  {activeBots.length} {es ? 'cuenta(s) activa(s) — puedes realizar tu compra.' : 'active account(s) — you can place your order.'}
                  {scheduleText && ` ${es ? 'Horario:' : 'Hours:'} ${scheduleText}`}
                </span>
              </div>
            </div>
          ) : (
            /* ── SIN GIFTS ── */
            <div className="bots-availability unavailable">
              <ShieldOff size={20} />
              <div>
                <strong>{es ? 'Servicio no disponible ahora' : 'Service currently unavailable'}</strong>
                <span>
                  {es
                    ? 'Todas las cuentas han agotado sus envíos del día o están inactivas. Los gifts se resetean diariamente. Intenta más tarde.'
                    : 'All accounts have used their daily gifts or are inactive. Gifts reset daily. Try again later.'}
                </span>
              </div>
            </div>
          )}

          {/* Cards de estado */}
          <div className="bots-status-grid">
            {effectiveBots.map(bot => (
              <div
                key={bot.id}
                className={`bot-status-card ${!inSchedule ? 'offline' : !bot.is_active ? 'inactive' : bot.remaining_gifts === 0 ? 'no-gifts' : ''}`}
              >
                <div className="bsc-header">
                  <div className={`bsc-avatar ${!inSchedule ? 'offline' : ''}`}>{bot.display_name[0]}</div>
                  <div className="bsc-info">
                    <strong>{bot.display_name}</strong>
                    <span className={`bsc-badge ${!inSchedule ? 'offline' : bot.is_active ? 'active' : 'inactive'}`}>
                      {!inSchedule
                        ? (es ? '● Fuera de horario' : '● Outside hours')
                        : bot.is_active ? '● Activo' : '● Inactivo'}
                    </span>
                  </div>
                </div>

                <div className="bsc-stats">
                  <div className="bsc-stat">
                    <span>{es ? 'Envíos disponibles hoy' : 'Gifts available today'}</span>
                    <div className="bsc-gifts">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`bsc-dot ${!inSchedule ? '' : i < bot.remaining_gifts && bot.is_active ? 'on' : ''}`}
                        />
                      ))}
                      <strong className={
                        !inSchedule ? 'text-muted-soft' :
                        !bot.is_active ? 'text-red' :
                        bot.remaining_gifts === 0 ? 'text-amber' : 'text-green'
                      }>
                        {!inSchedule ? '—' : bot.is_active ? `${bot.remaining_gifts}/5` : '—'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Avisos */}
                {!inSchedule && (
                  <div className="bsc-warning bsc-warning-offline">
                    <Moon size={13} />
                    {es
                      ? `Retoma a las ${pad(schedule?.start_hour ?? 0)}:00 hora Lima`
                      : `Resumes at ${pad(schedule?.start_hour ?? 0)}:00 Lima time`}
                  </div>
                )}
                {inSchedule && !bot.is_active && (
                  <div className="bsc-warning">
                    <AlertTriangle size={13} />
                    {es ? 'Temporalmente inactivo. El servicio se restaurará pronto.' : 'Temporarily inactive. Service will be restored soon.'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cuentas a agregar ── */}
      <h2 className="bots-add-title">
        {es ? 'Cuentas a agregar como amigos' : 'Add as friends in Epic Games'}
        <span className="bots-add-sub">
          {es ? 'Agrega al menos una de estas cuentas en Epic Games' : 'Add at least one of these accounts in Epic Games'}
        </span>
      </h2>

      <div className="bots-grid">
        {STATIC_BOTS.map((bot) => {
          const linked = effectiveBots.find(
            lb => lb.display_name.toLowerCase() === bot.epicId.toLowerCase()
          );
          const isLinked = !!linked;
          const isActive = inSchedule && (linked?.is_active ?? false);
          const giftsOk = inSchedule && (linked?.remaining_gifts ?? 0) > 0;

          return (
            <div
              className={`bot-card ${!inSchedule && isLinked ? 'bot-linked-offline' : isLinked ? (isActive ? 'bot-linked-active' : 'bot-linked-inactive') : ''}`}
              key={bot.num}
            >
              {isLinked && (
                <span className={`bot-link-badge ${
                  !inSchedule ? 'offline' :
                  isActive && giftsOk ? 'active' :
                  isActive ? 'no-gifts' : 'inactive'
                }`}>
                  {!inSchedule
                    ? (es ? '🌙 Sin horario' : '🌙 Offline')
                    : isActive && giftsOk
                    ? (es ? '✓ Disponible' : '✓ Available')
                    : isActive
                    ? (es ? 'Sin envíos hoy' : 'No gifts today')
                    : (es ? '✗ Inactivo' : '✗ Inactive')}
                </span>
              )}

              <div className="bot-avatar" style={{
                background: `linear-gradient(135deg, ${!inSchedule && isLinked ? '#64748b33' : bot.color + '33'}, ${!inSchedule && isLinked ? '#64748b22' : bot.color + '22'})`,
                borderColor: `${!inSchedule && isLinked ? '#64748b44' : bot.color + '44'}`,
                opacity: !inSchedule && isLinked ? 0.6 : 1,
              }}>
                <div className="bot-avatar-inner" style={{ background: !inSchedule && isLinked ? '#64748b' : bot.color }}>
                  {!inSchedule && isLinked ? <Moon size={22} color="#fff" /> : <Bot size={26} color="#fff" />}
                  <span className="bot-num">{bot.num}</span>
                </div>
                <span className={`bot-status-dot ${
                  !inSchedule && isLinked ? 'offline-dot' :
                  isLinked && isActive && giftsOk ? 'active' :
                  isLinked && isActive ? 'no-gifts-dot' :
                  isLinked ? 'inactive-dot' : ''
                }`} />
              </div>

              <div className="bot-info">
                <span className="bot-label">EPIC ID</span>
                <strong className="bot-epicid">{bot.epicId}</strong>
                {isLinked && !inSchedule && (
                  <span className="bot-gifts-available no-gifts">
                    {es ? 'Fuera de horario' : 'Outside hours'}
                  </span>
                )}
                {isLinked && inSchedule && isActive && (
                  <span className={`bot-gifts-available ${giftsOk ? '' : 'no-gifts'}`}>
                    {giftsOk
                      ? (es ? `${linked!.remaining_gifts} envío(s) hoy` : `${linked!.remaining_gifts} gift(s) today`)
                      : (es ? 'Sin envíos por hoy' : 'No gifts today')}
                  </span>
                )}
                {isLinked && inSchedule && !isActive && (
                  <span className="bot-gifts-available no-gifts">
                    {es ? 'Inactivo temporalmente' : 'Temporarily inactive'}
                  </span>
                )}
              </div>

              <button className="bot-copy-btn" onClick={() => copyId(bot.epicId, bot.num)}>
                {copied === bot.num
                  ? <><CheckCircle2 size={15} />{es ? ' Copiado' : ' Copied'}</>
                  : <><Copy size={15} /> {t('bots.copy')}</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
