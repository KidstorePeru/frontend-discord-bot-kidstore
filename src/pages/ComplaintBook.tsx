import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardList, CheckCircle2, AlertCircle, Loader2, Search } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { submitComplaint, getComplaintStatus } from '../services/api';
import type { ComplaintRequest, ComplaintStatus } from '../services/api';

const emptyForm: ComplaintRequest = {
  kind: 'reclamo',
  full_name: '',
  document_type: 'DNI',
  document_number: '',
  email: '',
  phone: '',
  address: '',
  is_minor: false,
  guardian_name: '',
  order_id: '',
  amount_involved: undefined,
  product_description: '',
  detail: '',
  consumer_request: '',
};

export default function ComplaintBook() {
  const { lang } = useLang();
  const es = lang === 'es';

  const [form, setForm] = useState<ComplaintRequest>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ reference: string } | null>(null);

  const [lookupRef, setLookupRef] = useState('');
  const [lookupStatus, setLookupStatus] = useState<ComplaintStatus | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  function update<K extends keyof ComplaintRequest>(key: K, value: ComplaintRequest[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.is_minor && !form.guardian_name?.trim()) {
      setError(es ? 'Si el consumidor es menor de edad, indica el nombre del padre/madre/apoderado.' : 'If the consumer is a minor, please provide the parent/guardian name.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: ComplaintRequest = { ...form };
      if (!payload.phone) delete payload.phone;
      if (!payload.address) delete payload.address;
      if (!payload.guardian_name) delete payload.guardian_name;
      if (!payload.order_id) delete payload.order_id;
      const res = await submitComplaint(payload);
      setResult({ reference: res.reference });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (es ? 'No se pudo registrar tu reclamo. Intenta de nuevo.' : "Couldn't submit your complaint. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError('');
    setLookupStatus(null);
    if (!lookupRef.trim()) return;
    setLookingUp(true);
    try {
      const status = await getComplaintStatus(lookupRef.trim());
      setLookupStatus(status);
    } catch {
      setLookupError(es ? 'No se encontró un reclamo con ese código.' : 'No complaint found with that code.');
    } finally {
      setLookingUp(false);
    }
  }

  if (result) {
    return (
      <div className="legal-page">
        <div className="legal-inner legal-inner-narrow">
          <div className="cb-success">
            <CheckCircle2 size={44} style={{ color: '#22c55e' }} />
            <h1>{es ? '¡Reclamo registrado!' : 'Complaint submitted!'}</h1>
            <p className="cb-success-ref">{result.reference}</p>
            <p>
              {es
                ? 'Guarda este código para hacer seguimiento a tu reclamo. Te enviamos una copia de lo que declaraste a tu correo.'
                : 'Save this code to track your complaint. We sent a copy of what you submitted to your email.'}
            </p>
            <p className="cb-success-plazo">
              {es
                ? 'Tienes derecho a una respuesta en un plazo máximo de 15 días hábiles improrrogables, conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571, modificada por la Ley N° 31435).'
                : "You're entitled to a response within a maximum of 15 business days, which cannot be extended, under Peru's Consumer Protection and Defense Code (Law N° 29571, as amended by Law N° 31435)."}
            </p>
            <div className="cb-success-actions">
              <button className="btn btn-ghost" onClick={() => { setResult(null); setForm(emptyForm); }}>
                {es ? 'Presentar otro reclamo' : 'Submit another complaint'}
              </button>
              <Link to="/" className="btn btn-primary">{es ? 'Ir al inicio' : 'Go home'}</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="legal-page">
      <div className="legal-inner legal-inner-narrow">
        <Link to="/" className="legal-back"><ArrowLeft size={16}/> {es ? 'Volver al inicio' : 'Back to home'}</Link>

        <div className="legal-header">
          <div className="legal-icon" style={{background:'rgba(124,58,237,0.1)',color:'#7c3aed',borderColor:'rgba(124,58,237,0.2)'}}><ClipboardList size={28}/></div>
          <div>
            <h1>{es ? 'Libro de Reclamaciones Virtual' : 'Virtual Complaints Book'}</h1>
            <p className="legal-updated">
              {es ? 'Conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571) — Perú' : "Under Peru's Consumer Protection and Defense Code (Law N° 29571)"}
            </p>
          </div>
        </div>

        <div className="legal-body" style={{ marginBottom: 8 }}>
          <div className="legal-highlight">
            {es
              ? 'Este es un canal gratuito para presentar un reclamo (disconformidad con el producto o servicio) o una queja (disconformidad con la atención). Presentarlo aquí no te impide acudir directamente a INDECOPI.'
              : 'This is a free channel to file a complaint (dissatisfaction with the product/service) or a grievance (dissatisfaction with customer service). Filing here does not stop you from going directly to INDECOPI.'}
          </div>
        </div>

        {/* Consultar estado */}
        <details className="cb-lookup">
          <summary><Search size={14}/> {es ? '¿Ya presentaste un reclamo? Consulta su estado' : 'Already filed a complaint? Check its status'}</summary>
          <form onSubmit={handleLookup} className="cb-lookup-form">
            <input
              type="text"
              placeholder={es ? 'Código, ej: KS-260908-A1B2C3' : 'Code, e.g: KS-260908-A1B2C3'}
              value={lookupRef}
              onChange={e => setLookupRef(e.target.value)}
            />
            <button className="btn btn-ghost btn-sm" type="submit" disabled={lookingUp}>
              {lookingUp ? <Loader2 size={14} className="spin"/> : (es ? 'Buscar' : 'Search')}
            </button>
          </form>
          {lookupError && <p className="cb-lookup-error"><AlertCircle size={13}/> {lookupError}</p>}
          {lookupStatus && (
            <div className="cb-lookup-result">
              <div><strong>{es ? 'Estado' : 'Status'}:</strong> {
                lookupStatus.status === 'pendiente' ? (es ? 'Pendiente' : 'Pending') :
                lookupStatus.status === 'respondido' ? (es ? 'Respondido' : 'Responded') :
                (es ? 'Cerrado' : 'Closed')
              }</div>
              {lookupStatus.admin_response && (
                <div className="cb-lookup-response">
                  <strong>{es ? 'Respuesta' : 'Response'}:</strong>
                  <p>{lookupStatus.admin_response}</p>
                </div>
              )}
            </div>
          )}
        </details>

        <form className="cb-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error"><AlertCircle size={15} />{error}</div>}

          <h2 className="cb-section-title">{es ? '1. Tipo de solicitud' : '1. Request type'}</h2>
          <div className="cb-kind-grid">
            <label className={`cb-kind-card ${form.kind === 'reclamo' ? 'active' : ''}`}>
              <input type="radio" name="kind" checked={form.kind === 'reclamo'} onChange={() => update('kind', 'reclamo')} />
              <strong>{es ? 'Reclamo' : 'Complaint'}</strong>
              <span>{es ? 'Disconformidad relacionada al producto o servicio (ej: no llegó, llegó incorrecto).' : 'Dissatisfaction related to the product or service (e.g., not delivered, wrong item).'}</span>
            </label>
            <label className={`cb-kind-card ${form.kind === 'queja' ? 'active' : ''}`}>
              <input type="radio" name="kind" checked={form.kind === 'queja'} onChange={() => update('kind', 'queja')} />
              <strong>{es ? 'Queja' : 'Grievance'}</strong>
              <span>{es ? 'Disconformidad no relacionada al producto, sino con la atención recibida.' : "Dissatisfaction not related to the product, but to the service/attention received."}</span>
            </label>
          </div>

          <h2 className="cb-section-title">{es ? '2. Datos del consumidor' : '2. Consumer details'}</h2>
          <label className="field">
            <span>{es ? 'Nombres y apellidos' : 'Full name'}</span>
            <input type="text" required value={form.full_name} onChange={e => update('full_name', e.target.value)} />
          </label>
          <div className="cb-row-2">
            <label className="field">
              <span>{es ? 'Tipo de documento' : 'Document type'}</span>
              <select value={form.document_type} onChange={e => update('document_type', e.target.value as ComplaintRequest['document_type'])}>
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="Pasaporte">{es ? 'Pasaporte' : 'Passport'}</option>
              </select>
            </label>
            <label className="field">
              <span>{es ? 'Número de documento' : 'Document number'}</span>
              <input type="text" required value={form.document_number} onChange={e => update('document_number', e.target.value)} />
            </label>
          </div>
          <div className="cb-row-2">
            <label className="field">
              <span>Email</span>
              <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} />
            </label>
            <label className="field">
              <span>{es ? 'Teléfono (opcional)' : 'Phone (optional)'}</span>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>{es ? 'Domicilio (opcional)' : 'Address (optional)'}</span>
            <input type="text" value={form.address} onChange={e => update('address', e.target.value)} />
          </label>
          <label className="cb-checkbox">
            <input type="checkbox" checked={form.is_minor} onChange={e => update('is_minor', e.target.checked)} />
            <span>{es ? 'El consumidor es menor de edad' : 'The consumer is a minor'}</span>
          </label>
          {form.is_minor && (
            <label className="field">
              <span>{es ? 'Nombre del padre/madre/apoderado' : 'Parent/guardian name'}</span>
              <input type="text" required value={form.guardian_name} onChange={e => update('guardian_name', e.target.value)} />
            </label>
          )}

          <h2 className="cb-section-title">{es ? '3. Bien contratado' : '3. Product or service'}</h2>
          <label className="field">
            <span>{es ? 'Producto o servicio' : 'Product or service'}</span>
            <input type="text" required placeholder={es ? 'Ej: Skin "Renegade Raider", recarga de KC, etc.' : 'E.g: "Renegade Raider" skin, KC recharge, etc.'} value={form.product_description} onChange={e => update('product_description', e.target.value)} />
          </label>
          <div className="cb-row-2">
            <label className="field">
              <span>{es ? 'N° de pedido (opcional)' : 'Order number (optional)'}</span>
              <input type="text" value={form.order_id} onChange={e => update('order_id', e.target.value)} />
            </label>
            <label className="field">
              <span>{es ? 'Monto reclamado S/ (opcional)' : 'Amount involved S/ (optional)'}</span>
              <input type="number" min="0" step="0.01" value={form.amount_involved ?? ''} onChange={e => update('amount_involved', e.target.value ? Number(e.target.value) : undefined)} />
            </label>
          </div>

          <h2 className="cb-section-title">{es ? '4. Detalle' : '4. Detail'}</h2>
          <label className="field">
            <span>{form.kind === 'reclamo' ? (es ? 'Detalle del reclamo' : 'Complaint detail') : (es ? 'Detalle de la queja' : 'Grievance detail')}</span>
            <textarea required minLength={10} rows={4} value={form.detail} onChange={e => update('detail', e.target.value)} />
          </label>
          <label className="field">
            <span>{es ? 'Pedido del consumidor (¿qué solicitas?)' : 'Consumer request (what are you asking for?)'}</span>
            <textarea required rows={3} value={form.consumer_request} onChange={e => update('consumer_request', e.target.value)} />
          </label>

          <p className="legal-note">
            {es
              ? 'Al presentar este formulario declaras que la información es verdadera. Recibirás una copia de este reclamo en tu correo, junto con tu código de seguimiento.'
              : 'By submitting this form you declare the information is true. You will receive a copy of this complaint by email, along with your tracking code.'}
          </p>

          <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="spin" /> : (es ? 'Presentar reclamo' : 'Submit complaint')}
          </button>
        </form>
      </div>
    </div>
  );
}
