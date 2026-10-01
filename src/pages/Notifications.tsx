import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Loader2, Mail } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import {
  getNotificationPrefs, getNotifications, markNotificationsRead, updateNotificationPrefs,
  type AppNotification, type NotificationPrefs,
} from '../services/api';
import { describeNotification, timeAgo } from '../services/notifications';
import { NotificationIcon } from '../components/NotificationBell';
import { useSEO } from '../hooks/useSEO';

function DiscordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

// Historial de avisos (90 días) y preferencias de aviso por correo y Discord.
// Los avisos en la web siempre se muestran.
export default function Notifications() {
  const { lang } = useLang();
  const { customer } = useAuth();
  const es = lang === 'es';

  useSEO({
    title: es ? 'Notificaciones' : 'Notifications',
    description: es ? 'Tus avisos de KidStorePeru.' : 'Your KidStorePeru notifications.',
    noindex: true,
  });

  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [prefsError, setPrefsError] = useState('');

  const load = async () => {
    setFailed(false);
    try {
      const res = await getNotifications(50);
      setItems(res.notifications);
      if (res.unread > 0) void markNotificationsRead().catch(() => {});
    } catch {
      setFailed(true);
    }
  };

  useEffect(() => {
    void load();
    getNotificationPrefs().then(setPrefs).catch(() => setPrefs({ email: true, discord: true }));
  }, []);

  const changePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const before = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setPrefsError('');
    try {
      setPrefs(await updateNotificationPrefs(next));
    } catch {
      setPrefs(before);
      setPrefsError(es ? 'No se pudo guardar el cambio. Intenta de nuevo.' : "Couldn't save the change. Try again.");
    }
  };

  const hasEmail = !!customer?.email;
  const hasDiscord = !!customer?.discord_linked;

  return (
    <div className="wish-page">
      <header className="wish-header">
        <div className="wish-header-icon"><Bell size={24} /></div>
        <div>
          <h1>{es ? 'Notificaciones' : 'Notifications'}</h1>
          <p>{es ? 'Tus pedidos entregados, recargas y lo que vuelva de tu lista de deseos.' : 'Your delivered orders, recharges, and anything from your wishlist that comes back.'}</p>
        </div>
      </header>

      <section className="wish-card">
        <h2>{es ? 'Cómo te avisamos' : 'How we notify you'}</h2>
        <p className="wish-hint" style={{ marginTop: 0 }}>
          {es ? 'En la web siempre verás tus avisos en la campana. Además puedes recibirlos por:' : "You'll always see your notifications in the bell on the site. You can also get them by:"}
        </p>
        <label className="notif-pref">
          <span className="notif-pref-ic"><Mail size={16} /></span>
          <span className="notif-pref-text">
            <strong>{es ? 'Correo' : 'Email'}</strong>
            <span>{hasEmail ? customer?.email : (es ? 'No tienes un correo registrado.' : "You don't have an email on file.")}</span>
          </span>
          <input
            type="checkbox"
            className="notif-switch"
            checked={hasEmail && !!prefs?.email}
            disabled={!prefs || !hasEmail}
            onChange={(e) => void changePref('email', e.target.checked)}
          />
        </label>
        <label className="notif-pref">
          <span className="notif-pref-ic"><DiscordIcon /></span>
          <span className="notif-pref-text">
            <strong>Discord</strong>
            <span>
              {hasDiscord
                ? (es ? 'Por mensaje privado del bot de KidStorePeru.' : 'By direct message from the KidStorePeru bot.')
                : <>{es ? 'Vincula tu Discord en ' : 'Link your Discord in '}<Link to="/account">{es ? 'Mi cuenta' : 'My account'}</Link>{es ? ' para recibirlos.' : ' to get them.'}</>}
            </span>
          </span>
          <input
            type="checkbox"
            className="notif-switch"
            checked={hasDiscord && !!prefs?.discord}
            disabled={!prefs || !hasDiscord}
            onChange={(e) => void changePref('discord', e.target.checked)}
          />
        </label>
        <p className="wish-hint">
          {es ? 'Por correo y Discord solo te avisamos de tu ' : 'By email and Discord we only send alerts from your '}
          <Link to="/wishlist">{es ? 'lista de deseos' : 'wishlist'}</Link>
          {es ? '. Los correos de pedidos y recargas te siguen llegando igual.' : '. Order and recharge emails keep arriving as usual.'}
        </p>
        {prefsError && <p className="wish-message is-error" role="alert">{prefsError}</p>}
      </section>

      <section className="wish-card">
        <h2><BellRing size={18} /> {es ? 'Recientes' : 'Recent'}</h2>
        {failed ? (
          <div className="wish-empty">
            <p>{es ? 'No se pudieron cargar tus notificaciones.' : "Couldn't load your notifications."}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>{es ? 'Reintentar' : 'Retry'}</button>
          </div>
        ) : items === null ? (
          <div className="wish-empty"><Loader2 size={18} className="spin" /></div>
        ) : items.length === 0 ? (
          <p className="wish-empty">{es ? 'Todavía no tienes notificaciones.' : "You don't have any notifications yet."}</p>
        ) : (
          <ul className="notif-list">
            {items.map((n) => {
              const v = describeNotification(n, es);
              return (
                <li key={n.id}>
                  <Link to={v.to} className={`notif-item${n.read ? '' : ' is-unread'}`}>
                    <span className={`notif-thumb notif-thumb--${v.icon}`}>
                      {v.image ? <img src={v.image} alt="" loading="lazy" /> : <NotificationIcon icon={v.icon} />}
                    </span>
                    <span className="notif-text">
                      <span className="notif-title">{v.title}</span>
                      {v.sub && <span className="notif-sub">{v.sub}</span>}
                      <span className="notif-time">{timeAgo(n.created_at, es)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="wish-hint">{es ? 'Los avisos se guardan 90 días.' : 'Notifications are kept for 90 days.'}</p>
      </section>
    </div>
  );
}
