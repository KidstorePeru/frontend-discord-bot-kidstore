import { CheckCircle, Clock, XCircle } from 'lucide-react';
import type { ManualPaymentRequest } from '../services/api';
import { paymentMethodLabel } from '../services/paymentMethods';

const nf = new Intl.NumberFormat('es-PE');

export function manualAmount(amount: number, currency: string): string {
  return currency === 'EUR' ? `€${amount.toFixed(2)}` : `S/ ${amount.toFixed(2)}`;
}

// Comprobantes de pago manual que envió el cliente y en qué quedaron.
export default function ManualPaymentsList({ requests, es, onRetry }: {
  requests: ManualPaymentRequest[];
  es: boolean;
  onRetry?: () => void;
}) {
  if (requests.length === 0) return null;
  return (
    <ul className="mp-list">
      {requests.map((r) => {
        const date = new Date(r.created_at).toLocaleString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return (
          <li key={r.id} className={`mp-item is-${r.status}`}>
            <span className="mp-ic" aria-hidden="true">
              {r.status === 'approved' ? <CheckCircle size={18} /> : r.status === 'rejected' ? <XCircle size={18} /> : <Clock size={18} />}
            </span>
            <span className="mp-text">
              <strong>
                {nf.format(r.kc_amount)} KC · {manualAmount(r.amount, r.currency)} · {paymentMethodLabel(r.method, es)}
              </strong>
              <span>
                {r.status === 'pending' && (es ? 'En revisión — te avisamos apenas lo verifiquemos.' : "Under review — we'll let you know as soon as we verify it.")}
                {r.status === 'approved' && (es ? 'Aprobado: KC acreditados.' : 'Approved: KC credited.')}
                {r.status === 'rejected' && (es ? `Rechazado: ${r.reject_reason ?? ''}` : `Rejected: ${r.reject_reason ?? ''}`)}
              </span>
              <small>{date}</small>
            </span>
            {r.status === 'rejected' && onRetry && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>{es ? 'Volver a subir' : 'Upload again'}</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
