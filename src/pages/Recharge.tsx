import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useCurrency } from '../context/CurrencyContext';
import { KC_PACKAGES, formatReferencePrice } from '../services/constants';
import { DEFAULT_PAYMENT_FEES, gatewayTotal, bizumTotal, type PaymentFees } from '../services/fees';
import type { PaymentInfo } from '../services/constants';
import { getPaymentInfo, getExchangeRates, createPayment, cancelPayment, tryRefreshToken, getMyManualPayments, getPaymentFees, type ManualPaymentRequest } from '../services/api';
import ProofUploadModal from '../components/ProofUploadModal';
import ManualPaymentsList, { justApprovedKC } from '../components/ManualPaymentsList';
import ManualApprovedModal from '../components/ManualApprovedModal';
import { onAccountChanged, requestAccountCheck } from '../services/accountEvents';
import { track } from '../services/analytics';
import type { KCPackage } from '../types';
import { Zap, MessageCircle, Copy, CheckCircle, ArrowRight, RefreshCw, Loader2, X, Upload } from 'lucide-react';
import { TrustpilotCTA } from '../components/UI';
import SegTabs from '../components/SegTabs';
import { useSEO } from '../hooks/useSEO';

// Pago manual solo existe para PEN (Perú) y EUR (España) — para las demás
// divisas se usa el pago automático (Mercado Pago, con tarjeta de cualquier país).
type Currency = 'PEN' | 'EUR';
type MethodId = 'yape' | 'plin' | 'bcp' | 'interbank' | 'bbva' | 'bizum';

interface PayMethod {
  id: MethodId;
  label: string;
  icon: string;
  qr: string | null;
  currency: Currency[];
  color: string;
  // true: lleva el recargo de la remesa a Perú (Bizum), ver services/fees.ts.
  surcharge?: boolean;
  // true si el método solo funciona en un país puntual dentro de su divisa
  // (ej. Bizum es exclusivo de España, aunque EUR también cubre Italia).
  spainOnly?: boolean;
}

const METHODS: PayMethod[] = [
  { id:'yape',      label:'Yape',      icon:'/yape.png',       qr:'/yape-qr.png',             currency:['PEN'],  color:'#72147E' },
  { id:'plin',      label:'Plin',      icon:'/plin.png',       qr:'/plin-qr.png',             currency:['PEN'],  color:'#00B4A2' },
  { id:'bcp',       label:'BCP',       icon:'/bcp.png',        qr:'/transferencia-bancos.png', currency:['PEN'],  color:'#003DA5' },
  { id:'interbank', label:'Interbank', icon:'/interbank.png',  qr:'/transferencia-bancos.png', currency:['PEN'],  color:'#00A14B' },
  { id:'bbva',      label:'BBVA',      icon:'/bbva.png',       qr:'/transferencia-bancos.png', currency:['PEN'],  color:'#004999' },
  { id:'bizum',     label:'Bizum',     icon:'/bizum.png',      qr:'/bizum-qr.png',             currency:['EUR'],  color:'#00AFAA', surcharge: true, spainOnly: true },
];

const PKG_TAGS: Record<string, { label_es: string; label_en: string; color: string }> = {
  gamer:  { label_es:'⭐ Popular', label_en:'⭐ Popular',    color:'#8b5cf6' },
  pro:    { label_es:'🔥 Más vendido', label_en:'🔥 Best Seller', color:'#f59e0b' },
  legend: { label_es:'👑 Premium', label_en:'👑 Premium',    color:'#ec4899' },
};

// Este polling usaba fetch() directo con el token pegado a mano, sin
// ninguna renovación — si el token vencía justo durante los hasta 6
// minutos que puede durar el polling de un pago, se quedaba pidiendo con
// un token viejo sin nunca refrescarlo. Comparte la misma renovación
// "single-flight" que el resto de la app (services/api.ts).
async function fetchPaymentStatus(base: string, paymentId: string): Promise<{ status?: string; kc_amount?: number } | null> {
  const doFetch = () => fetch(`${base}/store/payment-status/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('kc_token') || ''}` },
  });
  let res = await doFetch();
  if (res.status === 401 && localStorage.getItem('kc_refresh_token')) {
    if (await tryRefreshToken()) res = await doFetch();
  }
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.transaction ?? null;
}

export default function Recharge() {
  const { customer, refresh } = useAuth();
  const { t, lang }   = useLang();
  useSEO({
    title: lang === 'es' ? 'Recargar KidCoins' : 'Recharge KidCoins',
    description: lang === 'es'
      ? 'Recarga KidCoins con Yape, Plin, transferencia, Bizum o tarjeta (Mercado Pago) y compra en la tienda de Fortnite.'
      : 'Recharge KidCoins with Yape, Plin, bank transfer, Bizum or card (Mercado Pago) and shop the Fortnite store.',
  });
  const { currency: refCurrency, rates: refRates } = useCurrency();
  const [copied, setCopied]         = useState('');
  const [selected, setSelected]     = useState<string | null>(null);
  // El pago manual solo existe para la divisa detectada/seleccionada por el
  // cliente cuando esta es PEN o EUR — no hay selector manual de divisa.
  const manualCurrency: Currency | null =
    refCurrency === 'PEN' ? 'PEN' : refCurrency === 'EUR' ? 'EUR' : null;
  const [method, setMethod]         = useState<MethodId | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customKC, setCustomKC]     = useState('');
  const [rates, setRates]           = useState<{usd:number;eur:number} | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [payInfo, setPayInfo] = useState<PaymentInfo | null>(null);
  // Comisiones vigentes (las configura el admin): Mercado Pago y recargo de Bizum.
  const [fees, setFees] = useState<PaymentFees>(DEFAULT_PAYMENT_FEES);
  const [payTab, setPayTab] = useState<'online' | 'manual'>('online');
  const [payLoading, setPayLoading] = useState('');
  const [payPending, setPayPending] = useState(false);
  // 'error' es solo para cuando el backend CONFIRMÓ que el pago falló o
  // expiró. 'unconfirmed' es para cuando cerrar la ventana o que se agote
  // el tiempo de espera nos deja sin saber qué pasó — eso no prueba que el
  // pago haya fallado, así que nunca se muestra como si lo fuera.
  const [payResult, setPayResult] = useState<'success'|'error'|'unconfirmed'|null>(null);
  const [payKcCredited, setPayKcCredited] = useState(0);
  // Comprobantes de pago manual: los que ya envió el cliente y si la subida
  // está disponible (si no, se ofrece WhatsApp/Discord como antes).
  const [manualReqs, setManualReqs] = useState<ManualPaymentRequest[]>([]);
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  const [showProofModal, setShowProofModal] = useState(false);
  const [approvedKC, setApprovedKC] = useState(0); // comprobante aprobado mientras el cliente esperaba
  const manualRef = useRef<{ list: ManualPaymentRequest[]; loaded: boolean }>({ list: [], loaded: false });
  const loadManualReqs = () => {
    getMyManualPayments()
      .then((r) => {
        const kc = justApprovedKC(manualRef.current.list, r.requests);
        if (kc > 0) setApprovedKC(kc);
        manualRef.current = { list: r.requests, loaded: true };
        setManualReqs(r.requests);
        setUploadsEnabled(r.enabled);
      })
      .catch(() => {
        // Sin backend al abrir la página: queda el contacto por WhatsApp/Discord.
        // Un fallo en una recarga posterior no esconde la subida.
        if (!manualRef.current.loaded) setUploadsEnabled(false);
      });
  };
  useEffect(() => {
    loadManualReqs();
    // La campana avisa cuando cambia el saldo o se revisa un comprobante.
    return onAccountChanged(loadManualReqs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Medición: recarga acreditada (una vez por cada pago aprobado).
  useEffect(() => {
    if (payResult === 'success') track('recarga_aprobada', { kc: payKcCredited });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payResult]);

  useEffect(() => {
    setRatesLoading(true);
    getExchangeRates()
      .then(d => { if (d.USD) setRates({ usd: d.USD, eur: d.EUR }); })
      .catch(() => setRates({ usd: 0.267, eur: 0.246 }))
      .finally(() => setRatesLoading(false));
    getPaymentInfo()
      .then(setPayInfo)
      .catch(() => {});
    getPaymentFees()
      .then(setFees)
      .catch(() => {}); // se muestran las de por defecto; el cobro real lo calcula el servidor
  }, []);

  function convertRaw(pen: number, cur: Currency): number {
    if (cur === 'PEN') return pen;
    return pen * (rates?.eur ?? 0.246);
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(''), 2000);
  }

  function pkgImg(kc: number) {
    const m: Record<number,string> = {800:'800-kc',2400:'2400-kc',4500:'4500-kc',12500:'12500-kc'};
    return m[kc] ? `/${m[kc]}.png` : '';
  }

  // Mismo precio para pago manual y automático — S/ 1.30 cada 100 KC.
  const KC_RATE = 0.013;
  const customKCNum = parseInt(customKC) || 0;
  const customPricePen = parseFloat((customKCNum * KC_RATE).toFixed(2));
  const customPricePenOnline = customPricePen;

  // Get the active price based on payment tab
  const getPrice = (pkg: KCPackage): number => {
    if (payTab === 'online' && pkg.price_pen_online) return pkg.price_pen_online;
    if (payTab === 'online' && pkg.id === 'custom') return customPricePenOnline;
    return pkg.price_pen;
  };

  const customPkg: KCPackage | undefined = customMode && customKCNum >= 100 ? {
    id: 'custom',
    name: lang === 'es' ? 'Personalizado' : 'Custom',
    kc: customKCNum,
    price_pen: customPricePen,
    price_usd: parseFloat((customPricePen * (rates?.usd ?? 0.267)).toFixed(2)),
    price_eur: parseFloat((customPricePen * (rates?.eur ?? 0.246)).toFixed(2)),
    emoji: '✨',
    color: '#7c3aed',
  } : undefined;

  const selectedPkg: KCPackage | undefined = customMode
    ? customPkg
    : KC_PACKAGES.find((p: KCPackage) => p.id === selected);

  const availableMethods = manualCurrency ? METHODS.filter(m => m.currency.includes(manualCurrency)) : [];
  const activeMethod = METHODS.find(m => m.id === method);

  async function handleGateway(gateway: string) {
    if (!selectedPkg || payLoading) return;
    track('recarga_pago', { metodo: gateway });
    setPayLoading(gateway);
    try {
      const isCustom = selectedPkg.id === 'custom';
      const onlinePrice = getPrice(selectedPkg);
      const res = await createPayment(gateway, 'kc_recharge', selectedPkg.id,
        isCustom ? { name: `${selectedPkg.kc} KC (personalizado)`, price: onlinePrice, kc: selectedPkg.kc } : undefined,
      );
      // Open payment in new window
      const payWindow = window.open(res.checkout_url, '_blank');
      if (!payWindow) {
        alert(es
          ? 'Tu navegador bloqueó la ventana de pago. Permite las ventanas emergentes (popups) e intenta de nuevo.'
          : 'Your browser blocked the payment window. Please allow popups and try again.');
        setPayLoading('');
        return;
      }
      setPayLoading('');
      setPayPending(true);

      // Poll for payment completion (120 × 3 s = 6 min max)
      const BASE = import.meta.env.VITE_API_URL || '/api';
      let settled = false;
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 3000));

        // Si el popup ya volvió a nuestro propio dominio en /payment/return con
        // status=failure, la pasarela nos está diciendo directamente que el
        // pago se canceló o falló — no tiene sentido seguir esperando hasta 6
        // minutos a que el backend lo detecte solo. Mientras el popup sigue en
        // el dominio de la pasarela (checkout de Mercado Pago) leer
        // su URL falla por cross-origin, lo cual es normal y se ignora.
        let returnedAsFailure = false;
        try {
          const href = payWindow.location.href;
          if (href.includes('/payment/return') && href.includes('status=failure')) {
            returnedAsFailure = true;
          }
        } catch { /* todavía en el dominio de la pasarela — normal */ }

        try {
          const tx = await fetchPaymentStatus(BASE, res.payment_id);
          if (!tx) continue; // transient server error — retry
          const st = tx.status;
          if (st === 'approved' || st === 'fulfilled') {
            setPayResult('success');
            setPayKcCredited(tx.kc_amount || 0);
            void refresh(); // actualiza el balance mostrado en el navbar/dashboard sin esperar a recargar la página
            try { payWindow.close(); } catch {}
            settled = true;
            break;
          }
          if (st === 'failed' || st === 'expired') {
            // Confirmado por el backend — acá sí es correcto decir "no hubo cargo".
            setPayResult('error');
            try { payWindow.close(); } catch {}
            settled = true;
            break;
          }
          if (st === 'review') {
            // El backend nunca pudo confirmar NI descartar el pago con la
            // pasarela — no es un rechazo confirmado, así que nunca se
            // muestra como "no hubo cargo". Sigue reconciliándose solo.
            setPayResult('unconfirmed');
            settled = true;
            break;
          }
          if (returnedAsFailure) {
            // Solo sabemos que la pasarela redirigió el popup como
            // cancelado/fallido — el backend todavía no lo confirmó. No es
            // lo mismo que un fallo verificado.
            setPayResult('unconfirmed');
            try { payWindow.close(); } catch {}
            cancelPayment(res.payment_id).catch(() => {});
            settled = true;
            break;
          }
          // User closed the payment window — do one final status check
          if (payWindow.closed) {
            await new Promise(r => setTimeout(r, 5000));
            try {
              const fTx = await fetchPaymentStatus(BASE, res.payment_id);
              const fSt = fTx?.status;
              if (fSt === 'approved' || fSt === 'fulfilled') {
                setPayResult('success'); setPayKcCredited(fTx?.kc_amount || 0);
                void refresh();
              } else if (fSt === 'failed' || fSt === 'expired') {
                setPayResult('error');
                cancelPayment(res.payment_id).catch(() => {});
              } else {
                // Cerrar la ventana no prueba que el pago haya fallado — el
                // backend sigue sin confirmar nada definitivo.
                setPayResult('unconfirmed');
                cancelPayment(res.payment_id).catch(() => {});
              }
            } catch { setPayResult('unconfirmed'); }
            settled = true;
            break;
          }
        } catch { /* transient network error — retry next iteration */ }
      }
      // Se agotó el tiempo de espera (6 min) sin un status definitivo — un
      // timeout tampoco prueba que el pago haya fallado, así que se muestra
      // como sin confirmar, no como un fallo.
      if (!settled) {
        setPayResult('unconfirmed');
        cancelPayment(res.payment_id).catch(() => {});
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : (es ? 'Error al crear el pago' : 'Error creating payment'));
      setPayLoading('');
    }
  }

  // Mensaje ya escrito para quien prefiere mandar el comprobante por WhatsApp.
  function whatsappProofLink(): string {
    const parts = [
      es ? 'Hola, ya realicé un pago manual.' : 'Hi, I made a manual payment.',
      selectedPkg ? `${es ? 'Paquete' : 'Package'}: ${selectedPkg.name} (${selectedPkg.kc.toLocaleString('es-PE')} KC)` : '',
      activeMethod ? `${es ? 'Método' : 'Method'}: ${activeMethod.label} — ${getMethodPrice(activeMethod)}` : '',
      `${es ? 'Usuario de Epic' : 'Epic username'}: ${customer?.epic_username ?? ''}`,
      es ? 'Adjunto mi comprobante.' : 'Attaching my receipt.',
    ].filter(Boolean);
    return `https://wa.me/51983454837?text=${encodeURIComponent(parts.join('\n'))}`;
  }

  // Bizum: euros a pagar y recargo que cubre la remesa a Perú.
  function bizumQuote(): { total: number; fee: number } | null {
    if (!selectedPkg) return null;
    return bizumTotal(getPrice(selectedPkg), rates?.eur ?? 0.246, fees.bizum);
  }

  function getMethodPrice(m: PayMethod): string {
    if (!selectedPkg || !manualCurrency) return '';
    if (m.surcharge) {
      const q = bizumQuote();
      return q ? `€${q.total.toFixed(2)}` : '';
    }
    const total = convertRaw(getPrice(selectedPkg), manualCurrency);
    return manualCurrency === 'PEN' ? `S/ ${total.toFixed(2)}` : `€${total.toFixed(2)}`;
  }

  const es = lang === 'es';
  const txt = {
    step1:      es ? 'Elige tu paquete'           : 'Choose your package',
    custom:     es ? 'Personalizado'              : 'Custom',
    customDesc: es ? 'Elige la cantidad exacta'   : 'Choose the exact amount',
    otroMonto:  es ? '¿Otro monto?'               : 'Other amount?',
    minKC:      es ? 'Mínimo 100 KC'              : 'Minimum 100 KC',
    pkgSel:     es ? 'Paquete seleccionado'       : 'Selected package',
    loading:    es ? 'cargando tasas...'          : 'loading rates...',
    selMethod:  es ? 'Selecciona un método de pago:' : 'Select a payment method:',
    payWith:    es ? 'Pago con'                   : 'Pay with',
    total:      es ? 'Total a pagar'              : 'Total to pay',
    feeIncl:    (fee: string) => es ? `incluye ${fee} de recargo por el envío a Perú` : `includes a ${fee} fee for the transfer to Peru`,
    surcharge:  es ? '+ recargo'                  : '+ fee',
    scan:       es ? 'Escanea con'                : 'Scan with',
    numero:     es ? 'Número'                     : 'Number',
    nombre:     es ? 'Nombre'                     : 'Name',
    monto:      es ? 'Monto'                      : 'Amount',
    banco:      es ? 'Banco'                      : 'Bank',
    titular:    es ? 'Titular'                    : 'Account holder',
    cuenta:     es ? 'Cuenta'                     : 'Account',
    copiar:     es ? 'Copiar'                     : 'Copy',
    copiado:    es ? 'Copiado'                    : 'Copied',
    contactar:  es ? 'Contactar'                  : 'Contact',
    confirmP:   es
      ? `Envía el comprobante de pago por Discord o WhatsApp con tu usuario Epic:`
      : `Send your payment proof via Discord or WhatsApp with your Epic username:`,
    or:         es ? 'o'                          : 'or',
    tabOnline:  es ? 'Pago automático' : 'Automatic payment',
    tabManual:  es ? 'Pago manual' : 'Manual payment',
    gatewayNote: es ? 'KC acreditados automáticamente al confirmarse el pago' : 'KC credited automatically once payment is confirmed',
    manualWaitNote: es
      ? 'Estos métodos requieren que nuestro equipo verifique tu pago a mano, así que los KC no se acreditan al instante.'
      : 'These methods require our team to verify your payment by hand, so your KC are not credited instantly.',
    payWithMP:  es ? 'Pagar con Mercado Pago' : 'Pay with Mercado Pago',
    mpMethods:  es ? 'Tarjeta de crédito o débito (de Perú o del extranjero) y más' : 'Credit or debit card (from Peru or abroad) and more',
    pkgPrice:   es ? 'Precio del paquete' : 'Package price',
    mpFee:      es ? 'Comisión de Mercado Pago' : 'Mercado Pago fee',
    chargedPEN: (approx: string) => es
      ? `Se cobra en soles (≈ ${approx}); tu banco hace la conversión.`
      : `Charged in Peruvian soles (≈ ${approx}); your bank converts it.`,
    noFeeManual: es ? '¿Prefieres no pagar comisión? Paga con Yape, Plin o transferencia en' : 'Rather not pay a fee? Pay with Yape, Plin or bank transfer in',
    manualNotAvailable: es
      ? 'El pago manual no está disponible para tu divisa. Usa el pago automático arriba.'
      : 'Manual payment isn\'t available for your currency. Use the automatic payment tab above.',
  };

  return (
    <div className="rc-page">

      {/* ── Hero header ── */}
      <div className="rc-hero">
        <div className="rc-hero-bg"/>
        <div className="rc-hero-content">
          <div className="rc-hero-left">
            <span className="rc-eyebrow"><Zap size={12}/> {es ? 'Recarga de KidCoins' : 'KidCoins Recharge'}</span>
            <h1 className="rc-title">{t('rech.title')}</h1>
            <p className="rc-subtitle">{t('rech.sub')}</p>
          </div>
          {customer && (
            <div className="rc-balance-pill">
              <img src="/kidcoin.png" alt="KC" className="rc-balance-icon"/>
              <div>
                <span className="rc-balance-label">{t('rech.balance')}</span>
                <span className="rc-balance-val">{customer.kc_balance.toLocaleString('es-PE')} KC</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 1: Packages ── */}
      <div className="rc-section">
        <div className="rc-section-head">
          <div className="rc-step-badge">1</div>
          <h2>{txt.step1}</h2>
        </div>
        <div className="rc-packages">
          {KC_PACKAGES.map((pkg: KCPackage) => {
            const isSel = selected === pkg.id;
            const tag = PKG_TAGS[pkg.id];
            return (
              <button
                key={pkg.id}
                className={`rc-pkg ${isSel?'sel':''}`}
                onClick={() => { setSelected(pkg.id); setCustomMode(false); setMethod(null); }}
                style={{'--pc':pkg.color,'--pg':pkg.color+'22'} as React.CSSProperties}
              >
                {tag && <span className="rc-pkg-tag" style={{background:tag.color}}>{es ? tag.label_es : tag.label_en}</span>}
                <div className="rc-pkg-glow"/>
                <div className="rc-pkg-img-wrap">
                  <img src={pkgImg(pkg.kc)} alt={`${pkg.kc} KC`}
                    onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                </div>
                <div className="rc-pkg-name">{pkg.name}</div>
                <div className="rc-pkg-kc">{pkg.kc.toLocaleString('es-PE')} KC</div>
                <div className="rc-pkg-divider"/>
                <div className="rc-pkg-pen">
                  {ratesLoading ? '...' : formatReferencePrice(getPrice(pkg), refCurrency, refRates)}
                </div>
                {isSel && <div className="rc-pkg-check-ring"><CheckCircle size={18}/></div>}
              </button>
            );
          })}

          {/* Custom amount card */}
          <button
            className={`rc-pkg rc-pkg-custom ${customMode?'sel':''}`}
            onClick={() => { setCustomMode(true); setSelected(null); }}
            style={{'--pc':'#7c3aed','--pg':'rgba(124,58,237,0.16)'} as React.CSSProperties}
          >
            <div className="rc-pkg-glow"/>
            <div className="rc-pkg-custom-icon">✨</div>
            <div className="rc-pkg-name">{txt.custom}</div>
            <div className="rc-pkg-custom-desc">{txt.customDesc}</div>
            {customMode && (
              <div className="rc-pkg-custom-input-wrap" onClick={e=>e.stopPropagation()}>
                <div className="rc-custom-input-row">
                  <input
                    type="number"
                    className="rc-custom-input"
                    placeholder={es ? 'Ej: 1500' : 'e.g. 1500'}
                    min="100"
                    step="100"
                    value={customKC}
                    onChange={e => setCustomKC(e.target.value)}
                    autoFocus
                  />
                  <span className="rc-custom-kc-label">KC</span>
                </div>
                {customKCNum >= 100 && (
                  <div className="rc-custom-price">
                    {formatReferencePrice(payTab === 'online' ? customPricePenOnline : customPricePen, refCurrency, refRates)}
                  </div>
                )}
                {customKCNum > 0 && customKCNum < 100 && (
                  <p className="rc-custom-min">{txt.minKC}</p>
                )}
              </div>
            )}
            {!customMode && <div className="rc-pkg-kc" style={{color:'#7c3aed'}}>{txt.otroMonto}</div>}
            {customMode && customKCNum >= 100 && <div className="rc-pkg-check-ring"><CheckCircle size={18}/></div>}
          </button>
        </div>
      </div>

      {/* ── Step 2: Payment ── */}
      {((selected && selectedPkg) || (customMode && customPkg)) && selectedPkg && (
        <div className="rc-section rc-payment-section fade-in">

          {/* Summary bar */}
          <div className="rc-summary-bar">
            <img src={pkgImg(selectedPkg.kc)} alt="" className="rc-summary-coin"
              onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
            <div className="rc-summary-info">
              <strong>{selectedPkg.name} — {selectedPkg.kc.toLocaleString('es-PE')} KC</strong>
              <span>{txt.pkgSel}</span>
            </div>
            <div className="rc-summary-prices">
              {ratesLoading
                ? <span className="rc-summary-alt"><RefreshCw size={10} className="spin"/> {txt.loading}</span>
                : <span className="rc-summary-pen">{formatReferencePrice(getPrice(selectedPkg), refCurrency, refRates)}</span>}
            </div>
          </div>

          <div className="rc-section-head">
            <div className="rc-step-badge">2</div>
            <h2>{t('rech.instructions')}</h2>
          </div>

          {/* Payment tab selector */}
          <div className="rc-pay-tabs">
            <SegTabs
              activeKey={payTab}
              onSelect={(k) => setPayTab(k as 'online' | 'manual')}
              ariaLabel={es ? 'Tipo de pago' : 'Payment type'}
              items={[
                { key: 'online', label: txt.tabOnline },
                { key: 'manual', label: txt.tabManual },
              ]}
            />
          </div>

          {/* ── Pestaña automática: Mercado Pago para todos (tarjetas de Perú y del
               extranjero). La comisión la paga el cliente: se muestra el desglose. ── */}
          {payTab === 'online' && (() => {
            const price = getPrice(selectedPkg);
            const { total, fee } = gatewayTotal(price, fees.mercadopago);
            const pen = (n: number) => `S/ ${n.toFixed(2)}`;
            return (
              <>
                <div className="rc-gateways">
                  <button
                    className="rc-gateway-btn rc-gateway-btn-main"
                    style={{borderColor: payLoading==='mercadopago' ? '#6c5ce7' : undefined}}
                    disabled={!!payLoading}
                    onClick={() => handleGateway('mercadopago')}
                  >
                    {payLoading==='mercadopago'
                      ? <RefreshCw size={20} className="spin" style={{color:'#6c5ce7'}}/>
                      : <img src="/mercadopago.png" alt="Mercado Pago"
                             onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>}
                    <span><strong>{txt.payWithMP}</strong><small>{txt.mpMethods}</small></span>
                    <span className="rc-gateway-total">{pen(total)}</span>
                  </button>
                </div>
                <dl className="rc-fee-breakdown">
                  <div><dt>{txt.pkgPrice}</dt><dd>{pen(price)}</dd></div>
                  <div><dt>{txt.mpFee}</dt><dd>+ {pen(fee)}</dd></div>
                  <div className="is-total"><dt>{txt.total}</dt><dd>{pen(total)}</dd></div>
                </dl>
                {refCurrency !== 'PEN' && (
                  <p className="rc-gateway-note">{txt.chargedPEN(formatReferencePrice(total, refCurrency, refRates))}</p>
                )}
                <p className="rc-gateway-note">{txt.gatewayNote}</p>
                {refCurrency === 'PEN' && (
                  <p className="rc-gateway-note">
                    {txt.noFeeManual}{' '}
                    <button type="button" className="rc-link-btn" onClick={() => setPayTab('manual')}>{txt.tabManual}</button>.
                  </p>
                )}
              </>
            );
          })()}

          {/* ── Manual tab ── */}
          {payTab === 'manual' && (
            <>
          {!manualCurrency && (
            <p className="rc-gateway-note" style={{margin:'12px 0'}}>{txt.manualNotAvailable}</p>
          )}
          {manualCurrency && <>
          <p className="rc-gateway-note" style={{marginBottom:12}}>{txt.manualWaitNote}</p>

          {/* Method selector */}
          <div className="rc-methods-label">{txt.selMethod}</div>
          <div className="rc-methods-row">
            {availableMethods.map(m => (
              <button
                key={m.id}
                className={`rc-method-pill ${method===m.id?'on':''}`}
                style={{'--mc':m.color,'--mgs':m.color+'18'} as React.CSSProperties}
                onClick={() => { if (method !== m.id) track('recarga_pago', { metodo: m.id }); setMethod(method===m.id ? null : m.id); }}
              >
                <img src={m.icon} alt={m.label} className="rc-method-pill-icon"
                  onError={e=>{(e.target as HTMLImageElement).style.opacity='0';}}/>
                <span>{m.label}{m.spainOnly && ` (${es ? 'España' : 'Spain'})`}</span>
                {m.surcharge && <span className="rc-pill-comm">{txt.surcharge}</span>}
                {method===m.id && <CheckCircle size={13} className="rc-pill-check"/>}
              </button>
            ))}
          </div>

          {/* Payment detail */}
          {method && activeMethod && (
            <div className="rc-detail fade-in" style={{'--mc':activeMethod.color,'--mgs':activeMethod.color+'14'} as React.CSSProperties}>
              <div className="rc-detail-head">
                <img src={activeMethod.icon} alt={activeMethod.label} className="rc-detail-icon"
                  onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                <div>
                  <h3>{activeMethod.label}{activeMethod.spainOnly && ` (${es ? 'España' : 'Spain'})`}</h3>
                  <span>{txt.payWith} {activeMethod.label}{activeMethod.spainOnly ? (es ? ' — solo disponible en España' : ' — Spain only') : ''}</span>
                </div>
                <div className="rc-detail-total">
                  <span>{txt.total}</span>
                  <strong>{getMethodPrice(activeMethod)}</strong>
                  {activeMethod.surcharge && bizumQuote() && <em>{txt.feeIncl(`€${bizumQuote()!.fee.toFixed(2)}`)}</em>}
                </div>
              </div>

              <div className="rc-detail-body">

                {activeMethod.qr && (
                  <div className="rc-detail-qr-wrap">
                    <img src={activeMethod.qr} alt={`QR ${activeMethod.label}`} className="rc-detail-qr"/>
                    <span>{txt.scan} {activeMethod.label}</span>
                  </div>
                )}

                <div className="rc-detail-fields">

                  {/* Yape / Plin */}
                  {(method==='yape'||method==='plin') && payInfo?.[method] && <>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.numero}</span>
                      <div className="rc-copy-group">
                        <code>{payInfo[method].number}</code>
                        <button className="rc-copy-btn" onClick={()=>copyText(payInfo[method].raw, method)}>
                          {copied===method ? <CheckCircle size={13}/> : <Copy size={13}/>}
                          {copied===method ? txt.copiado : txt.copiar}
                        </button>
                      </div>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.nombre}</span>
                      <span className="rc-field-val">{payInfo[method].owner}</span>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.monto}</span>
                      <strong className="rc-field-amount">{getMethodPrice(activeMethod)}</strong>
                    </div>
                  </>}

                  {/* Bancos: BCP, Interbank, BBVA */}
                  {(method==='bcp'||method==='interbank'||method==='bbva') && payInfo?.[method] && <>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.banco}</span>
                      <span className="rc-field-val">{activeMethod.label}</span>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.titular}</span>
                      <span className="rc-field-val">{payInfo[method].owner}</span>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.cuenta}</span>
                      <div className="rc-copy-group">
                        <code>{payInfo[method].account}</code>
                        <button className="rc-copy-btn" onClick={()=>copyText(payInfo[method].raw, method)}>
                          {copied===method ? <CheckCircle size={13}/> : <Copy size={13}/>}
                          {copied===method ? txt.copiado : txt.copiar}
                        </button>
                      </div>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.monto}</span>
                      <strong className="rc-field-amount">{getMethodPrice(activeMethod)}</strong>
                    </div>
                  </>}

                  {/* Bizum */}
                  {method==='bizum' && payInfo?.bizum && <>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.numero}</span>
                      <div className="rc-copy-group">
                        <code>{payInfo.bizum.number}</code>
                        <button className="rc-copy-btn" onClick={()=>copyText(payInfo.bizum.number,'bizum')}>
                          {copied==='bizum' ? <CheckCircle size={13}/> : <Copy size={13}/>}
                          {copied==='bizum' ? txt.copiado : txt.copiar}
                        </button>
                      </div>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.nombre}</span>
                      <span className="rc-field-val">{payInfo.bizum.owner}</span>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.monto}</span>
                      <strong className="rc-field-amount">{getMethodPrice(activeMethod)}</strong>
                    </div>
                  </>}

                </div>
              </div>
            </div>
          )}

          {/* ¿Ya pagaste? Subir el comprobante (o, como segunda opción, WhatsApp/Discord) */}
          <div className="rc-confirm">
            <div className="rc-confirm-icon">{uploadsEnabled ? <Upload size={22}/> : <MessageCircle size={22}/>}</div>
            <div className="rc-confirm-body">
              <h3>{uploadsEnabled ? (es ? '¿Ya pagaste?' : 'Already paid?') : t('rech.confirm.title')}</h3>
              <p>
                {uploadsEnabled
                  ? (es
                    ? 'Primero realiza el pago con los datos de arriba. Después sube aquí la captura o foto de tu comprobante y lo revisamos.'
                    : 'First pay using the details above. Then upload a screenshot or photo of your receipt here and we\'ll review it.')
                  : <>{txt.confirmP} <strong>{customer?.epic_username}</strong></>}
              </p>
              <p className="rc-confirm-note">{t('rech.confirm.note')}</p>
              {uploadsEnabled && (
                <p className="rc-confirm-alt">
                  {es ? '¿Prefieres enviarlo por ' : 'Prefer sending it via '}
                  <a href={whatsappProofLink()} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  {es ? ' o ' : ' or '}
                  <a href="https://discord.gg/kidstore" target="_blank" rel="noopener noreferrer">Discord</a>?
                </p>
              )}
            </div>
            {uploadsEnabled ? (
              <button
                type="button"
                className="rc-confirm-btn"
                onClick={() => setShowProofModal(true)}
                disabled={!method || !selectedPkg}
                title={!method ? (es ? 'Elige primero el método de pago' : 'Choose a payment method first') : undefined}
              >
                <Upload size={13}/> {es ? 'Ya pagué, subir comprobante' : 'I paid, upload receipt'}
              </button>
            ) : (
              <Link to="/contact" className="rc-confirm-btn">
                {txt.contactar} <ArrowRight size={13}/>
              </Link>
            )}
          </div>
          {uploadsEnabled && !method && (
            <p className="rc-gateway-note">{es ? 'Elige un método de pago arriba para ver sus datos y luego subir tu comprobante.' : 'Choose a payment method above to see its details and then upload your receipt.'}</p>
          )}

          {manualReqs.length > 0 && (
            <div className="rc-proofs">
              <div className="rc-methods-label">{es ? 'Tus comprobantes enviados' : 'Your submitted receipts'}</div>
              <ManualPaymentsList requests={manualReqs.slice(0, 5)} es={es} onRetry={() => method && selectedPkg ? setShowProofModal(true) : window.scrollTo({ top: 0, behavior: 'smooth' })} />
            </div>
          )}

          {showProofModal && selectedPkg && activeMethod && (
            <ProofUploadModal
              es={es}
              summary={{
                packageId: selectedPkg.id,
                customKC: selectedPkg.id === 'custom' ? selectedPkg.kc : undefined,
                packageName: selectedPkg.name,
                kc: selectedPkg.kc,
                amountLabel: getMethodPrice(activeMethod),
                methodId: activeMethod.id,
                methodLabel: activeMethod.label,
              }}
              onClose={() => setShowProofModal(false)}
              onDone={() => { loadManualReqs(); requestAccountCheck(); }}
            />
          )}
          </>}
            </>
          )}

        </div>
      )}

      {approvedKC > 0 && <ManualApprovedModal kc={approvedKC} es={es} onClose={() => setApprovedKC(0)} />}

      {/* Payment overlay modal */}
      {payPending && (
        <div className="pc-modal-ov">
          <div className="pc-modal" style={{ maxWidth: 420, textAlign: 'center', padding: '40px 32px' }}>
            {!payResult && (
              <>
                <Loader2 size={40} className="spin" style={{ color: 'var(--accent)', marginBottom: 16 }}/>
                <h3 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.1rem' }}>
                  {es ? 'Completa el pago en la ventana abierta' : 'Complete payment in the opened window'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', margin: 0, lineHeight: 1.6 }}>
                  {es ? 'No cierres esta ventana. Esperando confirmación del pago...' : 'Don\'t close this window. Waiting for payment confirmation...'}
                </p>
              </>
            )}
            {payResult === 'success' && (
              <>
                <CheckCircle size={48} style={{ color: '#22c55e', marginBottom: 16 }}/>
                <h3 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.1rem' }}>
                  {es ? 'Pago confirmado!' : 'Payment confirmed!'}
                </h3>
                {payKcCredited > 0 && (
                  <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)', margin: '8px 0' }}>
                    +{payKcCredited.toLocaleString('es-PE')} KC
                  </p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', margin: '0 0 16px' }}>
                  {es ? 'Tus KidCoins fueron acreditados a tu cuenta.' : 'Your KidCoins have been credited to your account.'}
                </p>
                <TrustpilotCTA />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                  <Link to="/dashboard/recharges" className="btn btn-primary" style={{ gap: 6 }}>{es ? 'Ver mis recargas' : 'See my recharges'} <ArrowRight size={14}/></Link>
                  <button onClick={() => { setPayPending(false); setPayResult(null); window.location.reload(); }} className="btn btn-ghost">{es ? 'Seguir recargando' : 'Recharge more'}</button>
                </div>
              </>
            )}
            {payResult === 'error' && (
              <>
                <X size={48} style={{ color: '#dc2626', marginBottom: 16 }}/>
                <h3 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.1rem' }}>
                  {es ? 'Pago no completado' : 'Payment not completed'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', margin: '0 0 16px' }}>
                  {es ? 'No se realizó ningún cargo. Puedes intentar de nuevo.' : 'No charges were made. You can try again.'}
                </p>
                <button onClick={() => { setPayPending(false); setPayResult(null); }} className="btn btn-ghost">{es ? 'Intentar de nuevo' : 'Try again'}</button>
              </>
            )}
            {payResult === 'unconfirmed' && (
              <>
                <Loader2 size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }}/>
                <h3 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.1rem' }}>
                  {es ? 'No pudimos confirmar tu pago' : "We couldn't confirm your payment"}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', margin: '0 0 16px', lineHeight: 1.6 }}>
                  {es
                    ? 'Si se realizó algún cargo, tu KC se acreditará automáticamente en cuanto se confirme — no necesitas volver a pagar. Revisa tu historial de recargas en unos minutos antes de intentar de nuevo.'
                    : "If a charge went through, your KC will be credited automatically once it's confirmed — no need to pay again. Check your recharge history in a few minutes before trying again."}
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <Link to="/dashboard" className="btn btn-primary" style={{ gap: 6 }}>{es ? 'Ver mi historial' : 'View my history'} <ArrowRight size={14}/></Link>
                  <button onClick={() => { setPayPending(false); setPayResult(null); }} className="btn btn-ghost">{es ? 'Cerrar' : 'Close'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
