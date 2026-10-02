import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CheckCircle, X } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

// Se abre en Recargar cuando un comprobante que el cliente estaba esperando se
// aprueba: los KC ya están en su cuenta, sin recargar la página.
export default function ManualApprovedModal({ kc, es, onClose }: { kc: number; es: boolean; onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalFocusTrap(true, boxRef, closeRef, onClose);

  return createPortal(
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal proof-modal" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="mp-approved-title" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h2 id="mp-approved-title"><CheckCircle size={18} /> {es ? '¡Comprobante aprobado!' : 'Receipt approved!'}</h2>
          <button ref={closeRef} onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}><X size={16} /></button>
        </div>
        <div className="confirm-modal-body proof-done">
          <CheckCircle size={44} />
          <p className="mp-approved-kc">+{new Intl.NumberFormat('es-PE').format(kc)} KC</p>
          <p>
            {es
              ? 'Verificamos tu pago y tus KidCoins ya están en tu cuenta.'
              : 'We verified your payment and your KidCoins are now in your account.'}
          </p>
          <div className="mp-approved-actions">
            <Link to="/store" className="btn btn-primary btn-sm" onClick={onClose}>{es ? 'Ir a la tienda' : 'Go to the store'}</Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
