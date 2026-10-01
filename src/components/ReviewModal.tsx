import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Star, X, CheckCircle } from 'lucide-react';
import { createReview } from '../services/api';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

const MAX_COMMENT = 500;

// Calificar un pedido entregado (reseña verificada). La reseña se publica en
// la portada después de que el admin la revise.
export default function ReviewModal({
  order,
  es,
  onClose,
  onDone,
}: {
  order: { id: string; item_name: string; item_image?: string };
  es: boolean;
  onClose: () => void;
  onDone: (orderId: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => { if (!sending) onClose(); };
  useModalFocusTrap(true, boxRef, closeRef, close);

  const labels = es
    ? ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']
    : ['Very bad', 'Bad', 'Okay', 'Good', 'Excellent'];

  const submit = async () => {
    if (rating === 0) { setError(es ? 'Elige de 1 a 5 estrellas.' : 'Pick 1 to 5 stars.'); return; }
    setSending(true);
    setError('');
    try {
      await createReview(order.id, rating, comment.trim());
      setSent(true);
      onDone(order.id);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 409
        ? (es ? 'Ya dejaste una reseña para este pedido.' : 'You already reviewed this order.')
        : (es ? 'No se pudo enviar tu reseña. Intenta de nuevo.' : "Couldn't send your review. Try again."));
    } finally {
      setSending(false);
    }
  };

  const shown = hover || rating;

  // Portal: la ventana se dibuja sobre toda la página aunque se abra dentro de
  // una sección animada (un transform rompe position: fixed).
  return createPortal(
    <div className="confirm-modal-overlay" onClick={close}>
      <div
        className="confirm-modal review-modal"
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <h2 id="review-modal-title"><Star size={18} /> {es ? '¿Qué tal tu compra?' : 'How was your purchase?'}</h2>
          <button ref={closeRef} onClick={close} disabled={sending} aria-label={es ? 'Cerrar' : 'Close'}><X size={16} /></button>
        </div>

        {sent ? (
          <div className="confirm-modal-body review-done">
            <CheckCircle size={40} />
            <p><strong>{es ? '¡Gracias por tu reseña!' : 'Thanks for your review!'}</strong></p>
            <p>{es ? 'La publicaremos en la web cuando la revisemos.' : "We'll publish it on the site once we review it."}</p>
            <button className="btn btn-primary btn-sm" onClick={onClose}>{es ? 'Listo' : 'Done'}</button>
          </div>
        ) : (
          <>
            <div className="confirm-modal-body">
              <div className="review-item">
                {order.item_image && <img src={order.item_image} alt="" />}
                <strong>{order.item_name}</strong>
              </div>

              <div
                className="review-stars"
                role="radiogroup"
                aria-label={es ? 'Calificación' : 'Rating'}
                onMouseLeave={() => setHover(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} — ${labels[n - 1]}`}
                    className={n <= shown ? 'is-on' : ''}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => { setRating(n); setError(''); }}
                  >
                    <Star size={30} fill={n <= shown ? 'currentColor' : 'none'} />
                  </button>
                ))}
                <span className="review-stars-label">{shown ? labels[shown - 1] : ''}</span>
              </div>

              <label className="review-comment">
                <span>{es ? 'Comentario (opcional)' : 'Comment (optional)'}</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                  maxLength={MAX_COMMENT}
                  rows={4}
                  placeholder={es ? 'Cuéntanos cómo te fue: rapidez, atención, etc.' : 'Tell us how it went: speed, support, etc.'}
                />
                <small>{comment.length}/{MAX_COMMENT}</small>
              </label>
              <p className="review-note">
                {es
                  ? 'Se mostrará con tu nombre de Epic abreviado y la etiqueta «Compra verificada».'
                  : 'It will be shown with your Epic name shortened and a "Verified purchase" tag.'}
              </p>
              {error && <p className="review-error" role="alert">{error}</p>}
            </div>
            <div className="confirm-modal-footer">
              <button className="btn btn-ghost" onClick={close} disabled={sending}>{es ? 'Cancelar' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={() => void submit()} disabled={sending}>
                {sending ? <><Loader2 size={15} className="spin" /> {es ? 'Enviando…' : 'Sending…'}</> : (es ? 'Enviar reseña' : 'Send review')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
