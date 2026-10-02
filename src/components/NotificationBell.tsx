import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Gift, AlertCircle, Coins, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getNotifications, getAccountPulse, markNotificationsRead, type AppNotification } from '../services/api';
import { describeNotification, timeAgo, type NotificationView } from '../services/notifications';
import { emitAccountChanged, onAccountCheck } from '../services/accountEvents';

const POLL_MS = 30_000;
// Mientras el cliente espera la revisión de un comprobante se consulta más
// seguido, para que vea sus KC casi al instante cuando se aprueba.
const FAST_POLL_MS = 5_000;

export function NotificationIcon({ icon, size = 18 }: { icon: NotificationView['icon']; size?: number }) {
  if (icon === 'gift') return <Gift size={size} />;
  if (icon === 'alert') return <AlertCircle size={size} />;
  if (icon === 'coin') return <Coins size={size} />;
  return <Bell size={size} />;
}

// Campana de la barra superior: contador de avisos sin leer y panel con los más
// recientes (al abrirlo se marcan como leídos). Su consulta periódica (cada
// 30 s, cada 5 s si hay un comprobante en revisión, al volver a la pestaña y al
// cambiar de página) también trae el saldo: si cambió, actualiza la cuenta y
// avisa a la página abierta, así los KC aparecen sin recargar.
export default function NotificationBell() {
  const { customer, refresh } = useAuth();
  const { lang } = useLang();
  const es = lang === 'es';
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const customerId = customer?.id;

  // Lo último visto, en refs para no reiniciar el ciclo de consultas.
  const shownBalance = useRef<number | undefined>(customer?.kc_balance);
  useEffect(() => { shownBalance.current = customer?.kc_balance; }, [customer?.kc_balance]);
  const last = useRef<{ balance?: number; pending?: number }>({});
  const waitingReview = useRef(false);

  const refreshCount = useCallback(async () => {
    if (!customerId || document.visibilityState === 'hidden') return;
    try {
      const p = await getAccountPulse();
      setUnread(p.unread);
      waitingReview.current = p.pendingManual > 0;
      if (p.kcBalance !== undefined && shownBalance.current !== undefined && p.kcBalance !== shownBalance.current) {
        void refresh(); // saldo de la barra y de la cuenta
      }
      const prev = last.current;
      if ((prev.balance !== undefined && prev.balance !== p.kcBalance) || (prev.pending !== undefined && prev.pending !== p.pendingManual)) {
        emitAccountChanged(); // p. ej. Recargar vuelve a cargar sus comprobantes
      }
      last.current = { balance: p.kcBalance, pending: p.pendingManual };
    } catch { /* se reintenta en la próxima consulta */ }
  }, [customerId, refresh]);

  // Cada consulta (del ciclo, al volver a la pestaña, al navegar o porque la
  // página la pidió) reprograma la siguiente: si descubre un comprobante en
  // revisión, la próxima va a los 5 s y no a lo que quedaba de los 30 s.
  const runPulse = useRef<() => void>(() => {});
  useEffect(() => {
    if (!customerId) { setUnread(0); setItems(null); last.current = {}; waitingReview.current = false; return; }
    let timer: number | undefined;
    let stopped = false;
    const run = async () => {
      window.clearTimeout(timer);
      await refreshCount();
      if (stopped) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(run, waitingReview.current ? FAST_POLL_MS : POLL_MS);
    };
    runPulse.current = () => void run();
    void run();
    const onFocus = () => void run();
    const onVisible = () => { if (document.visibilityState === 'visible') void run(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const stopCheck = onAccountCheck(onFocus);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      runPulse.current = () => {};
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      stopCheck();
    };
  }, [customerId, refreshCount]);

  // Al navegar se cierra el panel y se actualiza el contador (al montar ya
  // consulta el ciclo de arriba: no se duplica la petición).
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    setOpen(false);
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    runPulse.current();
  }, [location.pathname]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await getNotifications(8);
      setItems(res.notifications);
      if (res.unread > 0) {
        await markNotificationsRead();
        setUnread(0);
      }
    } catch {
      setFailed(true);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!customer) return null;

  const label = es
    ? `Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`
    : `Notifications${unread > 0 ? ` (${unread} unread)` : ''}`;

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`navbar-icon-btn notif-btn${open ? ' is-open' : ''}`}
        onClick={toggle}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label={es ? 'Notificaciones' : 'Notifications'}>
          <div className="notif-panel-head">
            <strong>{es ? 'Notificaciones' : 'Notifications'}</strong>
          </div>
          <div className="notif-panel-list">
            {failed ? (
              <div className="notif-empty">
                <p>{es ? 'No se pudieron cargar las notificaciones.' : "Couldn't load your notifications."}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>{es ? 'Reintentar' : 'Retry'}</button>
              </div>
            ) : items === null ? (
              <div className="notif-empty"><Loader2 size={18} className="spin" /></div>
            ) : items.length === 0 ? (
              <div className="notif-empty">
                <p>{es ? 'Aquí verás tus pedidos entregados, recargas y lo que vuelva de tu lista de deseos.' : "You'll see delivered orders, recharges, and anything from your wishlist that comes back here."}</p>
              </div>
            ) : (
              items.map((n) => {
                const v = describeNotification(n, es);
                return (
                  <Link key={n.id} to={v.to} className={`notif-item${n.read ? '' : ' is-unread'}`} onClick={() => setOpen(false)}>
                    <span className={`notif-thumb notif-thumb--${v.icon}`}>
                      {v.image ? <img src={v.image} alt="" loading="lazy" /> : <NotificationIcon icon={v.icon} />}
                    </span>
                    <span className="notif-text">
                      <span className="notif-title">{v.title}</span>
                      {v.sub && <span className="notif-sub">{v.sub}</span>}
                      <span className="notif-time">{timeAgo(n.created_at, es)}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
          <div className="notif-panel-foot">
            <Link to="/notifications" onClick={() => setOpen(false)}>{es ? 'Ver todas' : 'See all'}</Link>
            <Link to="/wishlist" onClick={() => setOpen(false)}>{es ? 'Mi lista de deseos' : 'My wishlist'}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
