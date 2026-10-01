import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, RefreshCw, X } from 'lucide-react';

// Panel admin → Comprobantes: pagos manuales (Yape, Plin, bancos, Bizum) que
// los clientes subieron desde la web. Se verifica el pago y se aprueba
// (acredita los KC una sola vez) o se rechaza con un motivo que ve el cliente.

export interface AdminManualPayment {
  id: string;
  package_name: string;
  kc_amount: number;
  amount: number;
  currency: string;
  method: string;
  operation_number: string;
  proof_content_type: string;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  proof_deleted: boolean;
  created_at: string;
  customer_epic: string;
  customer_email: string;
  duplicate_ops: number;
}

type Fetcher = (path: string, key?: string, opts?: RequestInit) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const REASONS = [
  'No encontramos el pago con estos datos.',
  'El monto pagado no coincide con el paquete.',
  'El comprobante no se ve claro. Sube una captura completa.',
  'Este comprobante ya se usó en otra recarga.',
];

const METHOD_LABELS: Record<string, string> = { yape: 'Yape', plin: 'Plin', bcp: 'BCP', interbank: 'Interbank', bbva: 'BBVA', bizum: 'Bizum' };

function money(amount: number, currency: string) {
  return currency === 'EUR' ? `€${amount.toFixed(2)}` : `S/ ${amount.toFixed(2)}`;
}

function ProofPreview({ item, fetchBlob }: { item: AdminManualPayment; fetchBlob: (path: string) => Promise<Blob> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const isPdf = item.proof_content_type === 'application/pdf';

  const load = useCallback(async () => {
    setState('loading');
    try {
      const blob = await fetchBlob(`/admin/manual-payments/${item.id}/proof`);
      setUrl(URL.createObjectURL(blob));
      setState('idle');
    } catch {
      setState('error');
    }
  }, [fetchBlob, item.id]);

  useEffect(() => { if (item.status === 'pending' && !item.proof_deleted) void load(); }, [item.status, item.proof_deleted, load]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (item.proof_deleted) return <p className="mpa-muted">Imagen borrada automáticamente (se guardan 30 días).</p>;
  if (state === 'loading') return <div className="mpa-proof mpa-proof-empty"><Loader2 size={20} className="spin" /></div>;
  if (state === 'error') return <button className="btn btn-ghost btn-sm" onClick={() => void load()}><RefreshCw size={13} /> Reintentar cargar comprobante</button>;
  if (!url) return <button className="btn btn-ghost btn-sm" onClick={() => void load()}><FileText size={13} /> Ver comprobante</button>;
  if (isPdf) return <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Abrir PDF</a>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mpa-proof" title="Abrir en tamaño completo">
      <img src={url} alt="Comprobante de pago" />
    </a>
  );
}

export default function ManualPaymentsAdmin({ adminFetch, fetchBlob, notify, onChanged }: {
  adminFetch: Fetcher;
  fetchBlob: (path: string) => Promise<Blob>;
  notify: (msg: string, type: 'success' | 'error') => void;
  onChanged?: () => void;
}) {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [items, setItems] = useState<AdminManualPayment[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const r = await adminFetch(`/admin/manual-payments${filter ? `?status=${filter}` : ''}`);
      setItems(r.requests || []);
    } catch (e: unknown) {
      setItems([]);
      notify(e instanceof Error ? e.message : 'Error cargando comprobantes', 'error');
    }
  }, [adminFetch, filter, notify]);

  useEffect(() => { void load(); }, [load]);

  const approve = async (it: AdminManualPayment) => {
    const ok = window.confirm(`¿Confirmas que recibiste ${money(it.amount, it.currency)} por ${METHOD_LABELS[it.method] ?? it.method}?\n\nSe acreditarán ${it.kc_amount.toLocaleString('es-PE')} KC a ${it.customer_epic}.`);
    if (!ok) return;
    setBusy(it.id);
    try {
      await adminFetch(`/admin/manual-payments/${it.id}/approve`, undefined, { method: 'PUT' });
      notify(`Aprobado: +${it.kc_amount.toLocaleString('es-PE')} KC a ${it.customer_epic}`, 'success');
      onChanged?.();
      await load();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'No se pudo aprobar', 'error');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (it: AdminManualPayment) => {
    if (!reason.trim()) { notify('Escribe el motivo del rechazo', 'error'); return; }
    setBusy(it.id);
    try {
      await adminFetch(`/admin/manual-payments/${it.id}/reject`, undefined, { method: 'PUT', body: JSON.stringify({ reason }) });
      notify('Comprobante rechazado; el cliente recibió el motivo', 'success');
      setRejecting(null);
      onChanged?.();
      await load();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'No se pudo rechazar', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-table-section">
      <p className="admin-tab-sub">
        Pagos manuales que los clientes subieron desde la web. Verifica en tu app (Yape, Plin o banco) que llegó el <strong>monto exacto</strong> antes de aprobar.
        Al aprobar se acreditan los KC una sola vez y el cliente recibe aviso y correo. Las imágenes se borran solas a los 30 días.
      </p>
      <div className="adm-section-head" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="adm-count">{items ? `${items.length} comprobante(s)` : 'Cargando…'}</span>
        <div className="adm-filter-row">
          {([['pending', 'Pendientes'], ['approved', 'Aprobados'], ['rejected', 'Rechazados'], ['', 'Todos']] as const).map(([k, l]) => (
            <button key={k || 'all'} className={`adm-filter-btn ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
          <button className="adm-filter-btn" onClick={() => void load()} title="Actualizar"><RefreshCw size={13} /></button>
        </div>
      </div>

      {items === null ? (
        <div className="admin-loading"><Loader2 className="spin" size={24} /></div>
      ) : items.length === 0 ? (
        <p className="admin-tab-sub" style={{ textAlign: 'center', padding: 24 }}>No hay comprobantes en esta lista.</p>
      ) : (
        <div className="mpa-list">
          {items.map((it) => (
            <div key={it.id} className={`mpa-card is-${it.status}`}>
              <div className="mpa-top">
                <strong>{it.customer_epic || '—'}</strong>
                <span className="mpa-muted">{it.customer_email}</span>
                <span className="mpa-muted">{new Date(it.created_at).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`mpa-status is-${it.status}`}>{it.status === 'pending' ? 'Pendiente' : it.status === 'approved' ? 'Aprobado' : 'Rechazado'}</span>
              </div>
              <div className="mpa-body">
                <ProofPreview item={it} fetchBlob={fetchBlob} />
                <div className="mpa-info">
                  <div><span>Monto a verificar</span><strong className="mpa-amount">{money(it.amount, it.currency)}</strong></div>
                  <div><span>Método</span><strong>{METHOD_LABELS[it.method] ?? it.method}</strong></div>
                  <div><span>KC</span><strong>{it.kc_amount.toLocaleString('es-PE')} KC · {it.package_name}</strong></div>
                  <div><span>N.º de operación</span><strong>{it.operation_number || '—'}</strong></div>
                  <div><span>Solicitud</span><strong>{it.id.slice(0, 8).toUpperCase()}</strong></div>
                  {it.duplicate_ops > 0 && (
                    <p className="mpa-warn"><AlertTriangle size={14} /> Este número de operación aparece en {it.duplicate_ops} solicitud(es) más: posible comprobante repetido.</p>
                  )}
                  {it.status === 'rejected' && it.reject_reason && <p className="mpa-muted">Motivo: {it.reject_reason}</p>}
                  {it.reviewed_by && <p className="mpa-muted">Revisado por {it.reviewed_by}{it.reviewed_at ? ` · ${new Date(it.reviewed_at).toLocaleString('es-PE')}` : ''}</p>}
                </div>
              </div>

              {it.status === 'pending' && (
                rejecting === it.id ? (
                  <div className="mpa-reject">
                    <select value={REASONS.includes(reason) ? reason : ''} onChange={(e) => setReason(e.target.value || '')}>
                      {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      <option value="">Otro motivo…</option>
                    </select>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Motivo (lo verá el cliente)" />
                    <div className="mpa-actions">
                      <button className="btn btn-danger btn-sm" disabled={busy === it.id} onClick={() => void reject(it)}>
                        {busy === it.id ? <Loader2 size={14} className="spin" /> : <X size={14} />} Confirmar rechazo
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="mpa-actions">
                    <button className="btn btn-primary btn-sm" disabled={busy === it.id} onClick={() => void approve(it)}>
                      {busy === it.id ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />} Aprobar y acreditar
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busy === it.id} onClick={() => { setRejecting(it.id); setReason(REASONS[0]); }}>
                      <X size={14} /> Rechazar
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
