import { useEffect } from 'react';
import { Coins, Loader2, Star } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { TRUSTPILOT_REVIEW_URL } from '../services/constants';

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLang();
  // Status keys are dynamic, cast is needed
  const result = t(`status.${status}` as never);
  const label = result !== `status.${status}` ? result : status;
  const colorMap: Record<string, string> = { pending: 'var(--amber-500)', processing: 'var(--blue-500)', sent: 'var(--green-500)', failed: 'var(--red-500)', refunded: 'var(--gray-500)' };
  return <span className="status-badge" style={{ '--badge-color': colorMap[status] || 'var(--text-muted)' } as React.CSSProperties}>{label}</span>;
}

export function KCBadge({ amount, size = 'md' }: { amount: number; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`kc-badge kc-${size}`}><Coins size={size === 'sm' ? 12 : size === 'lg' ? 20 : 16} />{amount.toLocaleString()} KC</span>;
}

export function PageLoader() {
  const { t } = useLang();
  return <div className="page-loader"><Loader2 className="spin" size={36} /><p>{t('loading')}</p></div>;
}

export function Toast({ message, type = 'info', onClose, duration = 4000 }: { message: string; type?: 'info' | 'success' | 'error'; onClose: () => void; duration?: number }) {
  // Se cierra solo después de `duration` ms — antes se quedaba en pantalla
  // hasta que alguien le diera clic manualmente.
  useEffect(() => {
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return <div className={`toast toast-${type}`} onClick={onClose}><span>{message}</span><button onClick={onClose}>&times;</button></div>;
}

// Invitación a dejar reseña en Trustpilot — se muestra tras una compra o
// recarga exitosa. El perfil kidstoreperu.net ya está reclamado en Trustpilot.
export function TrustpilotCTA() {
  const { lang } = useLang();
  const es = lang === 'es';
  return (
    <a
      href={TRUSTPILOT_REVIEW_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="trustpilot-cta"
    >
      <span className="trustpilot-cta-stars">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
      </span>
      <span className="trustpilot-cta-text">
        <strong>{es ? '¿Te gustó tu experiencia?' : 'Enjoyed your experience?'}</strong>
        {es ? 'Déjanos tu reseña en Trustpilot' : 'Leave us a review on Trustpilot'}
      </span>
    </a>
  );
}
