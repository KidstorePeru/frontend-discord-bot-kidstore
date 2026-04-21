import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { KC_PACKAGES, COMMISSIONS, withCommission } from '../services/constants';
import type { PaymentInfo } from '../services/constants';
import { getPaymentInfo, getExchangeRates, createPayment } from '../services/api';
import type { KCPackage } from '../types';
import { Zap, MessageCircle, Copy, CheckCircle, ArrowRight, RefreshCw, Loader2, X } from 'lucide-react';

type Currency = 'PEN' | 'USD' | 'EUR';
type MethodId = 'yape' | 'plin' | 'bcp' | 'interbank' | 'bbva' | 'paypal' | 'binance' | 'bizum';

interface PayMethod {
  id: MethodId;
  label: string;
  icon: string;
  qr: string | null;
  currency: Currency[];
  color: string;
  commission?: keyof typeof COMMISSIONS;
}

const METHODS: PayMethod[] = [
  { id:'yape',      label:'Yape',      icon:'/yape.png',       qr:'/yape-qr.png',             currency:['PEN'],  color:'#72147E' },
  { id:'plin',      label:'Plin',      icon:'/plin.png',       qr:'/plin-qr.png',             currency:['PEN'],  color:'#00B4A2' },
  { id:'bcp',       label:'BCP',       icon:'/bcp.png',        qr:'/transferencia-bancos.png', currency:['PEN'],  color:'#003DA5' },
  { id:'interbank', label:'Interbank', icon:'/interbank.png',  qr:'/transferencia-bancos.png', currency:['PEN'],  color:'#00A14B' },
  { id:'bbva',      label:'BBVA',      icon:'/bbva.png',       qr:'/transferencia-bancos.png', currency:['PEN'],  color:'#004999' },
  { id:'paypal',    label:'PayPal',    icon:'/paypal.png',     qr: null,                       currency:['USD'],  color:'#003087' },
  { id:'binance',   label:'Binance',   icon:'/binance.png',    qr:'/binance-qr.png',           currency:['USD'],  color:'#F0B90B', commission:'binance' },
  { id:'bizum',     label:'Bizum',     icon:'/bizum.png',      qr:'/bizum-qr.png',             currency:['EUR'],  color:'#00AFAA', commission:'bizum' },
];

// Banderas SVG inline
const FlagPE = () => (
  <svg width="20" height="14" viewBox="0 0 30 20" style={{borderRadius:3,boxShadow:'0 1px 3px rgba(0,0,0,0.2)',flexShrink:0}}>
    <rect width="30" height="20" fill="#D91023"/>
    <rect x="10" width="10" height="20" fill="#fff"/>
  </svg>
);
const FlagUS = () => (
  <svg width="20" height="14" viewBox="0 0 30 20" style={{borderRadius:3,boxShadow:'0 1px 3px rgba(0,0,0,0.2)',flexShrink:0}}>
    <rect width="30" height="20" fill="#B22234"/>
    {[1.54,4.62,7.69,10.77,13.85,16.92].map((y,i) => <rect key={i} y={y} width="30" height="1.54" fill="#fff"/>)}
    <rect width="12" height="10.77" fill="#3C3B6E"/>
    {[1.5,3.5,5.5,7.5,9.5].map(cx => [1.5,3.5,5.5,7.5,9.5].map((cy,j) => <circle key={`${cx}-${j}`} cx={cx} cy={cy} r="0.7" fill="#fff"/>))}
  </svg>
);
const FlagES = () => (
  <svg width="20" height="14" viewBox="0 0 30 20" style={{borderRadius:3,boxShadow:'0 1px 3px rgba(0,0,0,0.2)',flexShrink:0}}>
    <rect width="30" height="20" fill="#c60b1e"/>
    <rect y="5" width="30" height="10" fill="#ffc400"/>
  </svg>
);

const PKG_TAGS: Record<string, { label_es: string; label_en: string; color: string }> = {
  gamer:  { label_es:'⭐ Popular', label_en:'⭐ Popular',    color:'#8b5cf6' },
  pro:    { label_es:'🔥 Vendido', label_en:'🔥 Best Seller', color:'#f59e0b' },
  legend: { label_es:'👑 Premium', label_en:'👑 Premium',    color:'#ec4899' },
};

export default function Recharge() {
  const { customer }  = useAuth();
  const { t, lang }   = useLang();
  const [copied, setCopied]         = useState('');
  const [selected, setSelected]     = useState<string | null>(null);
  const [currency, setCurrency]     = useState<Currency>('PEN');
  const [method, setMethod]         = useState<MethodId | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customKC, setCustomKC]     = useState('');
  const [rates, setRates]           = useState<{usd:number;eur:number} | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [payInfo, setPayInfo] = useState<PaymentInfo | null>(null);
  const [payTab, setPayTab] = useState<'online' | 'manual'>('manual');
  const [payLoading, setPayLoading] = useState('');
  const [payPending, setPayPending] = useState(false);
  const [payResult, setPayResult] = useState<'success'|'error'|null>(null);
  const [payKcCredited, setPayKcCredited] = useState(0);

  useEffect(() => {
    setRatesLoading(true);
    getExchangeRates()
      .then(d => { if (d.USD) setRates({ usd: d.USD, eur: d.EUR }); })
      .catch(() => setRates({ usd: 0.267, eur: 0.246 }))
      .finally(() => setRatesLoading(false));
    getPaymentInfo()
      .then(setPayInfo)
      .catch(() => {});
  }, []);

  function convertPrice(pen: number, cur: Currency): string {
    if (cur === 'PEN') return `S/ ${pen.toFixed(2)}`;
    if (!rates) return cur === 'USD' ? `$${(pen * 0.267).toFixed(2)}` : `€${(pen * 0.246).toFixed(2)}`;
    return cur === 'USD' ? `$${(pen * rates.usd).toFixed(2)}` : `€${(pen * rates.eur).toFixed(2)}`;
  }

  function convertRaw(pen: number, cur: Currency): number {
    if (cur === 'PEN') return pen;
    if (!rates) return cur === 'USD' ? pen * 0.267 : pen * 0.246;
    return cur === 'USD' ? pen * rates.usd : pen * rates.eur;
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(''), 2000);
  }

  function pkgImg(kc: number) {
    const m: Record<number,string> = {800:'800-kc',2400:'2400-kc',4500:'4500-kc',12500:'12500-kc'};
    return m[kc] ? `/${m[kc]}.png` : '';
  }

  const KC_RATE = 0.016;
  const customKCNum = parseInt(customKC) || 0;
  const customPricePen = parseFloat((customKCNum * KC_RATE).toFixed(2));
  const customPricePenOnline = parseFloat(((customKCNum * KC_RATE + 1.18) / 0.9529).toFixed(2));

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

  const availableMethods = METHODS.filter(m => m.currency.includes(currency));
  const activeMethod = METHODS.find(m => m.id === method);

  function handleCurrency(c: Currency) {
    setCurrency(c);
    if (method && !METHODS.find(m => m.id === method)?.currency.includes(c)) setMethod(null);
  }

  async function handleGateway(gateway: string) {
    if (!selectedPkg || payLoading) return;
    setPayLoading(gateway);
    try {
      const isCustom = selectedPkg.id === 'custom';
      const onlinePrice = getPrice(selectedPkg);
      const res = await createPayment(gateway, 'kc_recharge', selectedPkg.id,
        isCustom ? { name: `${selectedPkg.kc} KC (personalizado)`, price: onlinePrice, kc: selectedPkg.kc } : undefined
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
        try {
          const statusRes = await fetch(`${BASE}/store/payment-status/${res.payment_id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('kc_token') || ''}` },
          });
          if (!statusRes.ok) continue; // transient server error — retry
          const data = await statusRes.json();
          const st = data?.transaction?.status;
          if (st === 'approved' || st === 'fulfilled') {
            setPayResult('success');
            setPayKcCredited(data.transaction.kc_amount || 0);
            try { payWindow.close(); } catch {}
            settled = true;
            break;
          }
          if (st === 'failed' || st === 'expired') { setPayResult('error'); settled = true; break; }
          // User closed the payment window — do one final status check
          if (payWindow.closed) {
            await new Promise(r => setTimeout(r, 5000));
            try {
              const fRes = await fetch(`${BASE}/store/payment-status/${res.payment_id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('kc_token') || ''}` },
              });
              const fData = await fRes.json();
              const fSt = fData?.transaction?.status;
              if (fSt === 'approved' || fSt === 'fulfilled') {
                setPayResult('success'); setPayKcCredited(fData.transaction.kc_amount || 0);
              } else { setPayResult('error'); }
            } catch { setPayResult('error'); }
            settled = true;
            break;
          }
        } catch { /* transient network error — retry next iteration */ }
      }
      // Polling timed out without a definitive status — show error so user is not left hanging
      if (!settled) setPayResult('error');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : (es ? 'Error al crear el pago' : 'Error creating payment'));
      setPayLoading('');
    }
  }

  function getMethodPrice(m: PayMethod): string {
    if (!selectedPkg) return '';
    const base = convertRaw(getPrice(selectedPkg), currency);
    const rate = m.commission ? COMMISSIONS[m.commission] : 0;
    const total = rate > 0 ? withCommission(base, rate) : base;
    if (currency === 'PEN') return `S/ ${total.toFixed(2)}`;
    if (currency === 'USD') return `$${total.toFixed(2)}`;
    return `€${total.toFixed(2)}`;
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
    divisa:     es ? 'Divisa:'                    : 'Currency:',
    soles:      es ? 'Soles'                      : 'Soles',
    dolares:    es ? 'Dólares'                    : 'Dollars',
    selMethod:  es ? 'Selecciona un método de pago:' : 'Select a payment method:',
    payWith:    es ? 'Pago con'                   : 'Pay with',
    total:      es ? 'Total a pagar'              : 'Total to pay',
    feeIncl:    es ? 'comisión incluida'          : 'fee included',
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
    // PayPal manual
    paypalTitle: es ? 'Pago vía PayPal — coordinación directa'     : 'PayPal payment — direct coordination',
    paypalDesc:  es
      ? 'El pago por PayPal se coordina manualmente. Contáctanos por nuestras redes sociales y te enviamos el enlace de pago con el monto exacto.'
      : 'PayPal payments are coordinated manually. Contact us on our social media and we\'ll send you the payment link with the exact amount.',
    paypalContact: es ? 'Contáctanos por nuestras redes' : 'Contact us on our socials',
    tabOnline:  es ? 'Pago en linea' : 'Pay online',
    tabManual:  es ? 'Manual' : 'Manual',
    gatewayNote: es ? 'KC acreditados automaticamente al completar el pago' : 'KC credited automatically upon payment completion',
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
                <span className="rc-balance-val">{customer.kc_balance.toLocaleString()} KC</span>
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
                <div className="rc-pkg-kc">{pkg.kc.toLocaleString()} KC</div>
                <div className="rc-pkg-divider"/>
                <div className="rc-pkg-pen">S/ {getPrice(pkg).toFixed(2)}</div>
                <div className="rc-pkg-alt">
                  {ratesLoading ? '...' : `${convertPrice(getPrice(pkg),'USD')} · ${convertPrice(getPrice(pkg),'EUR')}`}
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
                    S/ {(payTab === 'online' ? customPricePenOnline : customPricePen).toFixed(2)}
                    {rates && <span> · ${((payTab === 'online' ? customPricePenOnline : customPricePen)*rates.usd).toFixed(2)}</span>}
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
              <strong>{selectedPkg.name} — {selectedPkg.kc.toLocaleString()} KC</strong>
              <span>{txt.pkgSel}</span>
            </div>
            <div className="rc-summary-prices">
              <span className="rc-summary-pen">S/ {getPrice(selectedPkg).toFixed(2)}</span>
              {!ratesLoading && rates && (
                <span className="rc-summary-alt">${(getPrice(selectedPkg)*rates.usd).toFixed(2)} · €{(getPrice(selectedPkg)*rates.eur).toFixed(2)}</span>
              )}
              {ratesLoading && <span className="rc-summary-alt"><RefreshCw size={10} className="spin"/> {txt.loading}</span>}
            </div>
          </div>

          <div className="rc-section-head">
            <div className="rc-step-badge">2</div>
            <h2>{t('rech.instructions')}</h2>
          </div>

          {/* Payment tab selector */}
          <div className="rc-pay-tabs">
            <button className={`rc-pay-tab ${payTab==='manual'?'on':''}`} onClick={()=>setPayTab('manual')}>{txt.tabManual}</button>
            <button className={`rc-pay-tab ${payTab==='online'?'on':''}`} onClick={()=>setPayTab('online')}>{txt.tabOnline}</button>
          </div>

          {/* ── Online tab ── */}
          {payTab === 'online' && (
            <>
              <div className="rc-gateways">
                <button
                  className="rc-gateway-btn"
                  style={{borderColor: payLoading==='mercadopago' ? '#009ee3' : undefined}}
                  disabled={!!payLoading}
                  onClick={() => handleGateway('mercadopago')}
                >
                  {payLoading==='mercadopago'
                    ? <RefreshCw size={20} className="spin" style={{color:'#009ee3'}}/>
                    : <img src="/mercadopago.png" alt="MercadoPago"/>}
                  <span>MercadoPago</span>
                  <span style={{fontSize:'.7rem',color:'var(--text-muted)',marginLeft:'auto'}}>PEN</span>
                </button>
                <button
                  className="rc-gateway-btn"
                  style={{borderColor: payLoading==='paypal' ? '#003087' : undefined}}
                  disabled={!!payLoading}
                  onClick={() => handleGateway('paypal')}
                >
                  {payLoading==='paypal'
                    ? <RefreshCw size={20} className="spin" style={{color:'#003087'}}/>
                    : <img src="/paypal.png" alt="PayPal"/>}
                  <span>PayPal</span>
                  <span style={{fontSize:'.7rem',color:'var(--text-muted)',marginLeft:'auto'}}>USD</span>
                </button>
                <button
                  className="rc-gateway-btn"
                  style={{borderColor: payLoading==='nowpayments' ? '#00c853' : undefined}}
                  disabled={!!payLoading}
                  onClick={() => handleGateway('nowpayments')}
                >
                  {payLoading==='nowpayments'
                    ? <RefreshCw size={20} className="spin" style={{color:'#00c853'}}/>
                    : <img src="/crypto.png" alt="Crypto" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>}
                  <span>Crypto</span>
                  <span style={{fontSize:'.7rem',color:'var(--text-muted)',marginLeft:'auto'}}>BTC, ETH, USDT +150</span>
                </button>
              </div>
              <p className="rc-gateway-note">{txt.gatewayNote}</p>
            </>
          )}

          {/* ── Manual tab ── */}
          {payTab === 'manual' && (
            <>
          {/* Currency tabs */}
          <div className="rc-currency-row">
            <span className="rc-currency-lbl">{txt.divisa}</span>
            <div className="rc-currency-tabs">
              <button className={`rc-ctab ${currency==='PEN'?'on':''}`} onClick={()=>handleCurrency('PEN')}>
                <FlagPE/> {txt.soles} (PEN)
              </button>
              <button className={`rc-ctab ${currency==='USD'?'on':''}`} onClick={()=>handleCurrency('USD')}>
                <FlagUS/> {txt.dolares} (USD)
              </button>
              <button className={`rc-ctab ${currency==='EUR'?'on':''}`} onClick={()=>handleCurrency('EUR')}>
                <FlagES/> Euros (EUR)
              </button>
            </div>
          </div>

          {/* Method selector */}
          <div className="rc-methods-label">{txt.selMethod}</div>
          <div className="rc-methods-row">
            {availableMethods.map(m => (
              <button
                key={m.id}
                className={`rc-method-pill ${method===m.id?'on':''}`}
                style={{'--mc':m.color,'--mgs':m.color+'18'} as React.CSSProperties}
                onClick={() => setMethod(method===m.id ? null : m.id)}
              >
                <img src={m.icon} alt={m.label} className="rc-method-pill-icon"
                  onError={e=>{(e.target as HTMLImageElement).style.opacity='0';}}/>
                <span>{m.label}</span>
                {m.commission && <span className="rc-pill-comm">+{(COMMISSIONS[m.commission]*100).toFixed(1)}%</span>}
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
                  <h3>{activeMethod.label}</h3>
                  <span>{txt.payWith} {activeMethod.label}</span>
                </div>
                {/* PayPal: no mostrar monto */}
                {method !== 'paypal' && (
                  <div className="rc-detail-total">
                    <span>{txt.total}</span>
                    <strong>{getMethodPrice(activeMethod)}</strong>
                    {activeMethod.commission && <em>{txt.feeIncl}</em>}
                  </div>
                )}
              </div>

              <div className="rc-detail-body">

                {/* QR — solo si no es PayPal */}
                {activeMethod.qr && method !== 'paypal' && (
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

                  {/* ── PayPal — coordinación manual por redes ── */}
                  {method==='paypal' && (
                    <div style={{display:'flex',flexDirection:'column',gap:14}}>
                      <p style={{fontSize:'.88rem',color:'var(--text-secondary)',lineHeight:1.6,margin:0}}>
                        {txt.paypalDesc}
                      </p>
                      <a
                        href="/contact"
                        className="rc-confirm-btn"
                        style={{alignSelf:'flex-start'}}
                      >
                        <MessageCircle size={15}/>
                        {txt.paypalContact}
                        <ArrowRight size={13}/>
                      </a>
                    </div>
                  )}

                  {/* Binance */}
                  {method==='binance' && payInfo?.binance && <>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">Pay ID</span>
                      <div className="rc-copy-group">
                        <code>{payInfo.binance.payId}</code>
                        <button className="rc-copy-btn" onClick={()=>copyText(payInfo.binance.payId,'binance')}>
                          {copied==='binance' ? <CheckCircle size={13}/> : <Copy size={13}/>}
                          {copied==='binance' ? txt.copiado : txt.copiar}
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

          {/* Confirm block */}
          <div className="rc-confirm">
            <div className="rc-confirm-icon"><MessageCircle size={22}/></div>
            <div className="rc-confirm-body">
              <h3>{t('rech.confirm.title')}</h3>
              <p>
                {txt.confirmP} <strong>{customer?.epic_username}</strong>
              </p>
              <p className="rc-confirm-note">{t('rech.confirm.note')}</p>
            </div>
            <a href="/contact" className="rc-confirm-btn">
              {txt.contactar} <ArrowRight size={13}/>
            </a>
          </div>
            </>
          )}

        </div>
      )}

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
                  {es ? 'No cierres esta ventana. Esperando confirmacion del pago...' : 'Don\'t close this window. Waiting for payment confirmation...'}
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
                    +{payKcCredited.toLocaleString()} KC
                  </p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', margin: '0 0 16px' }}>
                  {es ? 'Tus KidCoins fueron acreditados a tu cuenta.' : 'Your KidCoins have been credited to your account.'}
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <a href="/dashboard" className="btn btn-primary" style={{ gap: 6 }}>{es ? 'Ir al dashboard' : 'Go to dashboard'} <ArrowRight size={14}/></a>
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
                  {es ? 'No se realizo ningun cargo. Puedes intentar de nuevo.' : 'No charges were made. You can try again.'}
                </p>
                <button onClick={() => { setPayPending(false); setPayResult(null); }} className="btn btn-ghost">{es ? 'Intentar de nuevo' : 'Try again'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
