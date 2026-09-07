import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { getVoucher } from '../services/api';
import type { Voucher as VoucherData } from '../services/api';
import { PageLoader } from '../components/UI';
import { AlertCircle, Download, Printer, ArrowLeft } from 'lucide-react';

type Kind = 'pago' | 'pedido' | 'recarga';

function fmtDate(iso: string, es: boolean) {
  const d = new Date(iso);
  return d.toLocaleDateString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(es ? 'es-PE' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function Voucher() {
  const { kind, id } = useParams<{ kind: Kind; id: string }>();
  const { lang } = useLang();
  const es = lang === 'es';

  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!kind || !id) { setError(es ? 'Comprobante inválido' : 'Invalid receipt'); setLoading(false); return; }
    getVoucher(kind, id)
      .then(setVoucher)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : (es ? 'No se pudo cargar el comprobante' : "Couldn't load the receipt")))
      .finally(() => setLoading(false));
  }, [kind, id, es]);

  if (loading) return <PageLoader />;

  if (error || !voucher) {
    return (
      <div className="vc-page">
        <div className="vc-error">
          <AlertCircle size={40} />
          <h1>{es ? 'Comprobante no disponible' : 'Receipt not available'}</h1>
          <p>{error || (es ? 'Este comprobante no existe o todavía no está listo.' : "This receipt doesn't exist or isn't ready yet.")}</p>
          <Link to="/dashboard" className="btn btn-primary"><ArrowLeft size={15} />{es ? 'Ir al panel' : 'Go to dashboard'}</Link>
        </div>
      </div>
    );
  }

  const isOrder = voucher.type === 'order';
  const amount = isOrder ? `${voucher.price_kc?.toLocaleString()} KC` : `S/ ${(voucher.amount_pen || 0).toFixed(2)}`;

  return (
    <div className="vc-page">
      <div className="vc-toolbar no-print">
        <Link to="/dashboard/orders" className="vc-back"><ArrowLeft size={15} />{es ? 'Volver' : 'Back'}</Link>
      </div>

      <div className="vc-card">
        <div className="vc-top">
          <img src="/logotipo.png" alt="KidStorePeru" className="vc-logo" />
          <div className="vc-meta">
            <span>{es ? 'Comprobante' : 'Receipt'} #{voucher.reference}</span>
            <span>{fmtDate(voucher.created_at, es)}</span>
          </div>
        </div>

        <span className="vc-status">{es ? 'Pago confirmado' : 'Payment confirmed'}</span>

        {isOrder && (
          <div className="vc-item">
            <img
              src={voucher.item_image || '/kidcoin.png'}
              alt=""
              className="vc-thumb"
              onError={e => { (e.target as HTMLImageElement).src = '/kidcoin.png'; }}
            />
            <div>
              <p className="vc-h">{voucher.item_name}</p>
              <p className="vc-amount"><img src="/kidcoin.png" alt="KC" className="vc-kc-icon" />{amount}</p>
            </div>
          </div>
        )}
        {!isOrder && (
          <>
            <p className="vc-h">{es ? 'Total pagado' : 'Total paid'}</p>
            <p className="vc-amount">{amount}</p>
          </>
        )}

        <table className="vc-table">
          <tbody>
            <tr><td>{es ? 'Cliente' : 'Customer'}</td><td>{voucher.customer_name}</td></tr>
            {!isOrder && <tr><td>{es ? 'Producto' : 'Product'}</td><td>{voucher.product_name}</td></tr>}
            {!isOrder && voucher.kc_amount ? <tr><td>{es ? 'KC acreditado' : 'KC credited'}</td><td>{voucher.kc_amount.toLocaleString()} KC</td></tr> : null}
            {isOrder && <tr><td>{es ? 'Cuenta Epic' : 'Epic account'}</td><td>{voucher.epic_username}</td></tr>}
            {!isOrder && <tr><td>{es ? 'Método de pago' : 'Payment method'}</td><td>{voucher.gateway}</td></tr>}
            {voucher.external_id && <tr><td>{es ? 'ID de operación' : 'Operation ID'}</td><td>{voucher.external_id}</td></tr>}
          </tbody>
        </table>

        <div className="vc-actions no-print">
          <button className="vc-btn primary" onClick={() => window.print()}><Download size={14} />{es ? 'Descargar PDF' : 'Download PDF'}</button>
          <button className="vc-btn ghost" onClick={() => window.print()}><Printer size={14} />{es ? 'Imprimir' : 'Print'}</button>
        </div>

        <div className="vc-disclaimer">
          <span className="tag">{es ? 'Sobre este comprobante' : 'About this receipt'}</span>
          <p>
            {es
              ? 'Este es un comprobante interno de tu compra en KidStorePeru, válido como constancia de pago. Aún no es una boleta electrónica emitida ante SUNAT. Cuando actives la facturación electrónica, tus comprobantes futuros incluirán la serie y el código QR oficiales.'
              : "This is an internal receipt for your KidStorePeru purchase, valid as proof of payment. It is not yet an electronic invoice issued to Peru's tax authority (SUNAT)."}
          </p>
        </div>

        <p className="vc-support">
          {es ? '¿Dudas sobre este comprobante? Escríbenos a ' : 'Questions about this receipt? Email us at '}
          <a href="mailto:contacto@kidstoreperu.com">contacto@kidstoreperu.com</a>
        </p>
      </div>
    </div>
  );
}
