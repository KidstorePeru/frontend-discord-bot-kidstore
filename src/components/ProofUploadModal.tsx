import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, FileText, ImageUp, Loader2, Upload, X } from 'lucide-react';
import { createManualPayment, type ManualPaymentRequest } from '../services/api';
import { prepareProof, ProofPrepareError, type PreparedProof } from '../services/proofImage';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

export interface ProofSummary {
  packageId: string;
  customKC?: number;
  packageName: string;
  kc: number;
  amountLabel: string;
  methodId: string;
  methodLabel: string;
}

// Ventana para subir el comprobante de un pago manual (Yape, Plin, bancos,
// Bizum). El monto y los KC los vuelve a calcular el servidor.
export default function ProofUploadModal({
  summary,
  es,
  onClose,
  onDone,
}: {
  summary: ProofSummary;
  es: boolean;
  onClose: () => void;
  onDone: (req: ManualPaymentRequest) => void;
}) {
  const [proof, setProof] = useState<PreparedProof | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [operation, setOperation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => { if (!sending) onClose(); };
  useModalFocusTrap(true, boxRef, closeRef, close);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const nf = new Intl.NumberFormat('es-PE');
  // «S/ 31.20» nunca se parte entre dos líneas.
  const amount = summary.amountLabel.replace(/ /g, ' ');

  const onFile = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    setPreparing(true);
    try {
      const prepared = await prepareProof(file);
      setProof(prepared);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return prepared.isPdf ? null : URL.createObjectURL(prepared.blob);
      });
    } catch (err) {
      const code = err instanceof ProofPrepareError ? err.code : 'unreadable';
      setProof(null);
      setPreview(null);
      setError(code === 'too_large'
        ? (es ? 'El archivo supera 5 MB. Sube una captura de pantalla del comprobante.' : 'The file is over 5 MB. Upload a screenshot of the receipt.')
        : code === 'unsupported'
          ? (es ? 'Sube una imagen (JPG, PNG o WebP) o un PDF.' : 'Upload an image (JPG, PNG or WebP) or a PDF.')
          : (es ? 'No pudimos leer esa imagen. Prueba con una captura de pantalla.' : "We couldn't read that image. Try a screenshot."));
    } finally {
      setPreparing(false);
    }
  };

  const submit = async () => {
    if (!proof) { setError(es ? 'Sube la imagen o el PDF de tu comprobante.' : 'Upload the image or PDF of your receipt.'); return; }
    const op = operation.replace(/\s+/g, '');
    if (op && !/^[A-Za-z0-9-]{1,40}$/.test(op)) {
      setError(es ? 'El número de operación solo puede tener letras, números y guiones.' : 'The operation number can only have letters, numbers and dashes.');
      return;
    }
    if (!confirmed) { setError(es ? 'Confirma que ya realizaste el pago.' : 'Confirm that you already made the payment.'); return; }
    setSending(true);
    setError('');
    try {
      const req = await createManualPayment({
        packageId: summary.packageId, customKC: summary.customKC, method: summary.methodId,
        operationNumber: op, proof: proof.blob, fileName: proof.name,
      });
      setDone(true);
      onDone(req);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 409
        ? (es ? 'Ya tienes comprobantes en revisión. Espera a que los revisemos antes de enviar otro.' : 'You already have receipts under review. Wait for us to review them before sending another.')
        : status === 503
          ? (es ? 'La subida no está disponible ahora. Envíanos el comprobante por WhatsApp.' : 'Uploading is unavailable right now. Send us the receipt on WhatsApp.')
          : (err instanceof Error && err.message ? err.message : (es ? 'No se pudo enviar. Intenta de nuevo.' : "Couldn't send it. Try again.")));
    } finally {
      setSending(false);
    }
  };

  // Portal: la ventana se dibuja sobre toda la página aunque se abra dentro de
  // una sección animada (un transform rompe position: fixed).
  return createPortal(
    <div className="confirm-modal-overlay" onClick={close}>
      <div className="confirm-modal proof-modal" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="proof-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h2 id="proof-modal-title"><Upload size={18} /> {es ? 'Subir comprobante de pago' : 'Upload payment receipt'}</h2>
          <button ref={closeRef} onClick={close} disabled={sending} aria-label={es ? 'Cerrar' : 'Close'}><X size={16} /></button>
        </div>

        {done ? (
          <div className="confirm-modal-body proof-done">
            <CheckCircle size={44} />
            <p><strong>{es ? '¡Comprobante recibido!' : 'Receipt received!'}</strong></p>
            <p>
              {es
                ? 'Lo revisamos y tus KC se acreditan en máximo 30 minutos. Te avisaremos en la campana y por correo.'
                : "We'll review it and your KC will be credited within 30 minutes. We'll let you know in the bell and by email."}
            </p>
            <button className="btn btn-primary btn-sm" onClick={onClose}>{es ? 'Listo' : 'Done'}</button>
          </div>
        ) : (
          <>
            <div className="confirm-modal-body">
              <div className="proof-summary">
                {es ? 'Pagaste ' : 'You paid '}<strong>{amount}</strong>
                {es ? ' con ' : ' with '}<strong>{summary.methodLabel}</strong>
                {es ? ' por ' : ' for '}<strong>{summary.packageName} ({nf.format(summary.kc)} KC)</strong>.
              </div>

              <label className={`proof-drop${proof ? ' has-file' : ''}`}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                  disabled={sending || preparing}
                />
                {preparing ? (
                  <span className="proof-drop-inner"><Loader2 size={22} className="spin" /> {es ? 'Preparando…' : 'Preparing…'}</span>
                ) : proof ? (
                  <span className="proof-drop-inner">
                    {preview ? <img src={preview} alt={es ? 'Vista previa del comprobante' : 'Receipt preview'} /> : <FileText size={34} />}
                    <span className="proof-drop-change">{proof.isPdf ? proof.name : ''} {es ? 'Cambiar archivo' : 'Change file'}</span>
                  </span>
                ) : (
                  <span className="proof-drop-inner">
                    <ImageUp size={30} />
                    <strong>{es ? 'Elige la captura o foto del comprobante' : 'Choose the screenshot or photo of the receipt'}</strong>
                    <span>{es ? 'Desde tu galería, la cámara o tu PC · JPG, PNG o PDF · máx. 5 MB' : 'From your gallery, camera or PC · JPG, PNG or PDF · max 5 MB'}</span>
                  </span>
                )}
              </label>

              <label className="proof-field">
                <span>{es ? 'N.º de operación (opcional)' : 'Operation number (optional)'}</span>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={40}
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                  placeholder={es ? 'Lo encuentras en tu comprobante' : "It's on your receipt"}
                  disabled={sending}
                />
              </label>

              <label className="proof-check">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={sending} />
                <span>{es ? `Confirmo que ya realicé el pago de ${amount}.` : `I confirm I already paid ${amount}.`}</span>
              </label>

              <p className="proof-note">
                {es
                  ? 'Solo lo verá nuestro equipo para verificar tu pago, y se borra automáticamente al mes.'
                  : 'Only our team will see it to verify your payment, and it is deleted automatically after a month.'}
              </p>
              {error && <p className="proof-error" role="alert">{error}</p>}
            </div>
            <div className="confirm-modal-footer">
              <button className="btn btn-ghost" onClick={close} disabled={sending}>{es ? 'Cancelar' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={() => void submit()} disabled={sending || preparing}>
                {sending ? <><Loader2 size={15} className="spin" /> {es ? 'Enviando…' : 'Sending…'}</> : <><Upload size={15} /> {es ? 'Enviar comprobante' : 'Send receipt'}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
