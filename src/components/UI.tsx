import { Coins, Loader2 } from 'lucide-react';
import { useLang } from '../context/LangContext';

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLang();
  const key = `status.${status}` as any;
  const label = t(key) !== key ? t(key) : status;
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

export function Toast({ message, type = 'info', onClose }: { message: string; type?: 'info' | 'success' | 'error'; onClose: () => void; }) {
  return <div className={`toast toast-${type}`} onClick={onClose}><span>{message}</span><button onClick={onClose}>&times;</button></div>;
}
