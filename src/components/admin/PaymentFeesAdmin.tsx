import { useEffect, useState } from 'react';
import { Loader2, Save, Percent } from 'lucide-react';
import { KC_PACKAGES } from '../../services/constants';
import { getExchangeRates } from '../../services/api';
import { gatewayTotal, bizumTotal, priceUSD, type PaymentFees, type GatewayFee } from '../../services/fees';

// Panel admin → Pagos → Comisiones: lo que cobran Mercado Pago, PayPal y
// cripto, y lo que cuesta traer a Perú lo cobrado por Bizum. El cliente paga
// ese costo encima del precio, así la tienda recibe siempre el precio exacto.

type Fetcher = (path: string, key?: string, opts?: RequestInit) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const pen = (n: number) => `S/ ${n.toFixed(2)}`;
const eur = (n: number) => `€${n.toFixed(2)}`;
const usd = (n: number) => `US$${n.toFixed(2)}`;

function NumField({ label, value, onChange, suffix, step = 0.01, hint }: {
  label: string; value: number; onChange: (v: number) => void; suffix: string; step?: number; hint?: string;
}) {
  return (
    <label className="pf-field">
      <span>{label}</span>
      <span className="pf-input">
        <input type="number" min={0} step={step} aria-label={`${label} (${suffix})`} value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
        <em>{suffix}</em>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function PaymentFeesAdmin({ adminFetch, notify }: {
  adminFetch: Fetcher;
  notify: (msg: string, type: 'success' | 'error') => void;
}) {
  const [fees, setFees] = useState<PaymentFees | null>(null);
  const [saved, setSaved] = useState<PaymentFees | null>(null);
  const [meta, setMeta] = useState<{ updated_by?: string; updated_at?: string }>({});
  const [eurRate, setEurRate] = useState(0.246);
  const [usdRate, setUsdRate] = useState(0.267);
  const [saving, setSaving] = useState(false);

  // Se carga una sola vez: si se recargara con cada aviso del panel, se
  // perdería lo que el admin está escribiendo.
  useEffect(() => {
    adminFetch('/admin/payment-fees')
      .then((r) => { setFees(r.fees); setSaved(r.fees); setMeta({ updated_by: r.updated_by, updated_at: r.updated_at }); })
      .catch((e: unknown) => notify(e instanceof Error ? e.message : 'No se pudieron cargar las comisiones', 'error'));
    getExchangeRates().then((r) => { if (r.EUR) setEurRate(r.EUR); if (r.USD) setUsdRate(r.USD); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fees) return <div className="admin-loading"><Loader2 className="spin" size={22} /></div>;

  const mp = fees.mercadopago;
  const pp = fees.paypal;
  const np = fees.nowpayments;
  const bz = fees.bizum;
  const setGW = (g: 'mercadopago' | 'paypal' | 'nowpayments', k: keyof GatewayFee, v: number) =>
    setFees({ ...fees, [g]: { ...fees[g], [k]: v } });
  const setMP = (k: keyof GatewayFee, v: number) => setGW('mercadopago', k, v);
  const setBZ = (k: keyof typeof bz, v: number) => setFees({ ...fees, bizum: { ...bz, [k]: v } });
  const dirty = JSON.stringify(fees) !== JSON.stringify(saved);

  const save = async () => {
    setSaving(true);
    try {
      const r = await adminFetch('/admin/payment-fees', undefined, { method: 'PUT', body: JSON.stringify(fees) });
      setFees(r.fees); setSaved(r.fees); setMeta({ updated_by: 'ti', updated_at: new Date().toISOString() });
      notify('Comisiones guardadas: los próximos pagos ya las usan', 'success');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'No se pudieron guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pf-card">
      <header className="pf-head">
        <h3><Percent size={16} /> Comisiones a cargo del cliente</h3>
        <p>
          El cliente paga la comisión <strong>encima del precio</strong>, así tú recibes siempre el precio exacto del paquete.
          Si algún pago de Mercado Pago o PayPal llega con menos, te avisamos por Discord para que ajustes la tarifa.
        </p>
      </header>

      <div className="pf-grid">
        <div className="pf-box">
          <h4>Mercado Pago</h4>
          <p className="pf-help">Tu tarifa está en Mercado Pago: abre cualquier cobro recibido y mira el "Cargo de Mercado Pago" y el IGV.</p>
          <div className="pf-fields">
            <NumField label="Comisión" value={mp.percent} onChange={(v) => setMP('percent', v)} suffix="%" />
            <NumField label="Cargo fijo por venta" value={mp.fixed} onChange={(v) => setMP('fixed', v)} suffix="S/" />
            <NumField label="IGV sobre la comisión" value={mp.tax} onChange={(v) => setMP('tax', v)} suffix="%" step={1} />
            <NumField label="Margen extra (opcional)" value={mp.margin} onChange={(v) => setMP('margin', v)} suffix="%" hint="Para cubrir imprevistos; normalmente 0." />
          </div>
        </div>
        <div className="pf-box">
          <h4>PayPal (cobra en dólares)</h4>
          <p className="pf-help">Tu tarifa está en PayPal → Actividad → detalle de un cobro ("Comisión"). Para cobros del extranjero, Perú cobra 5.4% + 1.5% internacional + US$0.30. Si al retirar a tu banco pierdes en el cambio, súmalo en "Margen extra".</p>
          <div className="pf-fields">
            <NumField label="Comisión" value={pp.percent} onChange={(v) => setGW('paypal', 'percent', v)} suffix="%" />
            <NumField label="Cargo fijo por venta" value={pp.fixed} onChange={(v) => setGW('paypal', 'fixed', v)} suffix="US$" />
            <NumField label="Margen extra (opcional)" value={pp.margin} onChange={(v) => setGW('paypal', 'margin', v)} suffix="%" />
          </div>
        </div>
        <div className="pf-box">
          <h4>Cripto (NOWPayments)</h4>
          <p className="pf-help">La comisión de NOWPayments y la de la red ya las paga el cliente al pagar ("Fee Paid by User"), así que normalmente aquí va 0. Usa el margen solo si al retirar o convertir pierdes algo.</p>
          <div className="pf-fields">
            <NumField label="Margen extra (opcional)" value={np.margin} onChange={(v) => setGW('nowpayments', 'margin', v)} suffix="%" />
          </div>
        </div>
        <div className="pf-box">
          <h4>Bizum (remesa a Perú)</h4>
          <p className="pf-help">Lo que cuesta traer a Perú lo cobrado: la comisión de la remesa y cuánto peor es su tipo de cambio que el de mercado.</p>
          <div className="pf-fields">
            <NumField label="Comisión de la remesa" value={bz.percent} onChange={(v) => setBZ('percent', v)} suffix="%" />
            <NumField label="Cargo fijo por envío" value={bz.fixed} onChange={(v) => setBZ('fixed', v)} suffix="€" />
            <NumField label="Pérdida en el tipo de cambio" value={bz.fx_margin} onChange={(v) => setBZ('fx_margin', v)} suffix="%" hint="Ej.: si el mercado da S/4.00 por euro y la remesa S/3.92, son 2%." />
          </div>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table pf-preview">
          <thead><tr>
            <th>Paquete</th><th>Precio (recibes)</th><th>Mercado Pago</th><th>PayPal</th><th>Cripto</th><th>Bizum</th>
          </tr></thead>
          <tbody>
            {KC_PACKAGES.map((p) => {
              const base = priceUSD(p.price_pen, usdRate);
              const m = gatewayTotal(p.price_pen, mp);
              const q = gatewayTotal(base, pp);
              const c = gatewayTotal(base, np);
              const b = bizumTotal(p.price_pen, eurRate, bz);
              return (
                <tr key={p.id}>
                  <td>{p.name} · {p.kc.toLocaleString('es-PE')} KC</td>
                  <td><strong>{pen(p.price_pen)}</strong> <span className="text-muted">({usd(base)})</span></td>
                  <td>{pen(m.total)} <span className="text-muted">(+ {pen(m.fee)})</span></td>
                  <td>{usd(q.total)} <span className="text-muted">(+ {usd(q.fee)})</span></td>
                  <td>{usd(c.total)} <span className="text-muted">{c.fee > 0 ? `(+ ${usd(c.fee)})` : '+ red'}</span></td>
                  <td>{eur(b.total)} <span className="text-muted">(+ {eur(b.fee)})</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="pf-foot">
        <span className="text-muted">
          {meta.updated_at ? `Última modificación: ${meta.updated_by || '—'} · ${new Date(meta.updated_at).toLocaleString('es-PE')}` : 'Usando las tarifas públicas (Mercado Pago 3.49% + S/1 + IGV; PayPal 6.9% + US$0.30) hasta que guardes las tuyas.'}
        </span>
        <button className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Guardar comisiones
        </button>
      </footer>
    </section>
  );
}
