import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { KC_PACKAGES, PAYMENT_INFO, COMMISSIONS, withCommission } from '../services/constants';
import type { KCPackage } from '../types';
import { KCBadge } from '../components/UI';
import { Coins, MessageCircle, Copy, CheckCircle, Zap, ArrowRight, RefreshCw, Instagram } from 'lucide-react';

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

  useEffect(() => {
    setRatesLoading(true);
    fetch('https://open.er-api.com/v6/latest/PEN')
      .then(r => r.json())
      .then(d => { if (d.rates) setRates({ usd: d.rates.USD, eur: d.rates.EUR }); })
      .catch(() => setRates({ usd: 0.267, eur: 0.246 }))
      .finally(() => setRatesLoading(false));
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
    const m: Record<number,string> = {800:'800-kc',2400:'2400-kc',4800:'4800-kc',12500:'12500-kc'};
    return m[kc] ? `/${m[kc]}.png` : '';
  }

  const KC_RATE = 0.016;
  const customKCNum = parseInt(customKC) || 0;
  const customPricePen = parseFloat((customKCNum * KC_RATE).toFixed(2));

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

  function getMethodPrice(m: PayMethod): string {
    if (!selectedPkg) return '';
    const base = convertRaw(selectedPkg.price_pen, currency);
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
                <div className="rc-pkg-pen">S/ {pkg.price_pen.toFixed(2)}</div>
                <div className="rc-pkg-alt">
                  {ratesLoading ? '...' : `${convertPrice(pkg.price_pen,'USD')} · ${convertPrice(pkg.price_pen,'EUR')}`}
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
                    S/ {customPricePen.toFixed(2)}
                    {rates && <span> · ${(customPricePen*rates.usd).toFixed(2)}</span>}
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
              <span className="rc-summary-pen">S/ {selectedPkg.price_pen.toFixed(2)}</span>
              {!ratesLoading && rates && (
                <span className="rc-summary-alt">${(selectedPkg.price_pen*rates.usd).toFixed(2)} · €{(selectedPkg.price_pen*rates.eur).toFixed(2)}</span>
              )}
              {ratesLoading && <span className="rc-summary-alt"><RefreshCw size={10} className="spin"/> {txt.loading}</span>}
            </div>
          </div>

          <div className="rc-section-head">
            <div className="rc-step-badge">2</div>
            <h2>{t('rech.instructions')}</h2>
          </div>

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
                  {(method==='yape'||method==='plin') && <>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.numero}</span>
                      <div className="rc-copy-group">
                        <code>{PAYMENT_INFO[method].number}</code>
                        <button className="rc-copy-btn" onClick={()=>copyText(PAYMENT_INFO[method].raw, method)}>
                          {copied===method ? <CheckCircle size={13}/> : <Copy size={13}/>}
                          {copied===method ? txt.copiado : txt.copiar}
                        </button>
                      </div>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.nombre}</span>
                      <span className="rc-field-val">{PAYMENT_INFO[method].owner}</span>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.monto}</span>
                      <strong className="rc-field-amount">{getMethodPrice(activeMethod)}</strong>
                    </div>
                  </>}

                  {/* Bancos: BCP, Interbank, BBVA */}
                  {(method==='bcp'||method==='interbank'||method==='bbva') && <>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.banco}</span>
                      <span className="rc-field-val">{activeMethod.label}</span>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.titular}</span>
                      <span className="rc-field-val">
                        {method==='bcp'
                          ? PAYMENT_INFO.bcp.owner
                          : method==='interbank'
                          ? PAYMENT_INFO.interbank.owner
                          : PAYMENT_INFO.bbva.owner}
                      </span>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.cuenta}</span>
                      <div className="rc-copy-group">
                        <code>
                          {method==='bcp'
                            ? PAYMENT_INFO.bcp.account
                            : method==='interbank'
                            ? PAYMENT_INFO.interbank.account
                            : PAYMENT_INFO.bbva.account}
                        </code>
                        <button className="rc-copy-btn" onClick={()=>copyText(
                          method==='bcp'
                            ? PAYMENT_INFO.bcp.raw
                            : method==='interbank'
                            ? PAYMENT_INFO.interbank.raw
                            : PAYMENT_INFO.bbva.raw,
                          method
                        )}>
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
                  {method==='binance' && <>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">Pay ID</span>
                      <div className="rc-copy-group">
                        <code>{PAYMENT_INFO.binance.payId}</code>
                        <button className="rc-copy-btn" onClick={()=>copyText(PAYMENT_INFO.binance.payId,'binance')}>
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
                  {method==='bizum' && <>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.numero}</span>
                      <div className="rc-copy-group">
                        <code>{PAYMENT_INFO.bizum.number}</code>
                        <button className="rc-copy-btn" onClick={()=>copyText(PAYMENT_INFO.bizum.number,'bizum')}>
                          {copied==='bizum' ? <CheckCircle size={13}/> : <Copy size={13}/>}
                          {copied==='bizum' ? txt.copiado : txt.copiar}
                        </button>
                      </div>
                    </div>
                    <div className="rc-field-row">
                      <span className="rc-field-lbl">{txt.nombre}</span>
                      <span className="rc-field-val">{PAYMENT_INFO.bizum.owner}</span>
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

        </div>
      )}
    </div>
  );
}
