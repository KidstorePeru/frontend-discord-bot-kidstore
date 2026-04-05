import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { getShop, getExchangeRates, createPayment, checkProductAvailable } from '../services/api';
import { vbucksToKC, roundCents,
  VBUCKS_PRODUCTS, VBUCKS_BULK, PACKS_PRODUCTS, CLUB_PRODUCTS,
  ROCKET_PRODUCTS, ROCKET_BULK, CATEGORY_INFO,
} from '../services/constants';
import type { StoreProduct, BulkProduct, CategoryInfo } from '../services/constants';
import { PageLoader, Toast } from '../components/UI';
import { Search, RefreshCw, ShoppingCart, X, Clock, CheckCircle, Gamepad2, Package, Crown, Rocket, Joystick, ShoppingBag, Minus, Plus, Loader2, Sparkles, Zap, Monitor, Star, Music, Shirt, Coins, Info, XCircle, Copy, MessageCircle } from 'lucide-react';
import { useLang } from '../context/LangContext';

type StoreTab = 'shop' | 'vbucks' | 'packs' | 'club' | 'rocket' | 'epicgames';

interface ShopItem {
  offerId: string; name: string;
  featuredImg: string; albumArt: string; renderImg: string;
  rarityText: string; finalPrice: number; regularPrice: number; price_kc: number;
  span: number; sectionName: string; sectionRank: number;
  colors: { color1: string; color2: string; color3: string; textBg: string };
  banner?: { value: string; backendValue: string };
  hasDiscount: boolean; isBundle: boolean; isBigBundle: boolean; outDate?: string;
}
interface Section { name: string; rank: number; items: ShopItem[]; }

function hex2(h: string, a = 1) {
  if (!h || h.length < 6) return `rgba(180,180,200,${a})`;
  const c = h.replace('#', '').substring(0, 6);
  return `rgba(${parseInt(c.substring(0,2),16)},${parseInt(c.substring(2,4),16)},${parseInt(c.substring(4,6),16)},${a})`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parse(data: any): { items: ShopItem[]; total: number } {
  const entries: any[] = data?.data?.entries || [];
  const items: ShopItem[] = [];
  for (const e of entries) {
    const brItems = e.brItems || []; const tracks = e.tracks || [];
    const allCos = [...brItems, ...(e.instruments||[]), ...(e.cars||[]), ...(e.legoKits||[]), ...(e.beans||[])];
    const it = allCos[0] || tracks[0];
    const isTrack = tracks.length > 0 && allCos.length === 0;
    const isBundle = !!e.bundle;
    const span = e.tileSize==='Size_2_x_1'?2:e.tileSize==='Size_3_x_1'?3:e.tileSize==='Size_4_x_1'?4:1;
    const renderImg = (e.newDisplayAsset?.renderImages||[])[0]?.image||'';
    items.push({
      offerId: e.offerId||'', name: isBundle ? e.bundle.name : (it?.name||it?.title||'Item'),
      featuredImg: it?.images?.featured||it?.images?.icon||it?.images?.smallIcon||'',
      albumArt: isTrack ? (tracks[0]?.albumArt||'') : '', renderImg,
      rarityText: it?.rarity?.displayValue||(isTrack?'Pista':''),
      finalPrice: e.finalPrice||0, regularPrice: e.regularPrice||e.finalPrice||0,
      price_kc: vbucksToKC(e.finalPrice||0), span,
      sectionName: e.layout?.name||'Otros', sectionRank: e.layout?.rank??0,
      colors: {
        color1: e.colors?.color1||'b0b0c0ff', color2: e.colors?.color2||'9090a0ff',
        color3: e.colors?.color3||e.colors?.color1||'c0c0d0ff',
        textBg: e.colors?.textBackgroundColor||e.colors?.color2||'8080a0ff',
      },
      banner: e.banner||undefined, hasDiscount: (e.regularPrice||0)>(e.finalPrice||0),
      isBundle, isBigBundle: isBundle && span >= 2, outDate: e.outDate,
    });
  }
  return { items, total: items.length };
}

function groupSections(items: ShopItem[]): Section[] {
  const m = new Map<string,Section>();
  for (const i of items) {
    if (!m.has(i.sectionName)) m.set(i.sectionName, { name: i.sectionName, rank: i.sectionRank, items: [] });
    m.get(i.sectionName)!.items.push(i);
  }
  return [...m.values()].sort((a,b) => b.rank - a.rank);
}

function useCountdown(target?: string) {
  const [t, setT] = useState('');
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) { setT('0h 0m'); return; }
      const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000), m = Math.floor((ms%3600000)/60000);
      setT(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

function VIcon({ s=16 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" style={{flexShrink:0}}><circle cx="12" cy="12" r="11" fill="#59c2ea" stroke="#2ba0cb" strokeWidth="1.5"/><text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="sans-serif" fill="#fff">V</text></svg>;
}

// ==================== PAYMENT MODAL (Gateway) ====================

interface PayModalProps {
  product: { name: string; price_pen: number; productId: string } | null;
  onClose: () => void;
  lang: string;
}

function PayModal({ product, onClose, lang }: PayModalProps) {
  const es = lang === 'es';
  const [rates, setRates] = useState<{ USD: number; EUR: number }>({ USD: 0.27, EUR: 0.25 });
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(true);
  const [checkingAvail, setCheckingAvail] = useState(true);

  useEffect(() => {
    getExchangeRates().then(r => setRates({ USD: r.USD, EUR: r.EUR })).catch(() => {});
    if (product) {
      setCheckingAvail(true);
      checkProductAvailable(product.productId).then(a => { setAvailable(a); setCheckingAvail(false); }).catch(() => setCheckingAvail(false));
    }
  }, [product]);

  if (!product) return null;

  const fmtPEN = `S/ ${product.price_pen.toFixed(2)}`;
  const fmtUSD = `$${roundCents(product.price_pen * rates.USD).toFixed(2)}`;

  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentResult, setPaymentResult] = useState<'success'|'error'|null>(null);
  const [paymentActivationCode, setPaymentActivationCode] = useState('');

  async function handleGateway(gateway: string) {
    if (!localStorage.getItem('kc_token')) {
      onClose();
      window.dispatchEvent(new CustomEvent('show-login-modal'));
      return;
    }
    setLoading(gateway);
    setError('');
    try {
      const p = product!;
      const res = await createPayment(gateway, 'product_purchase', p.productId,
        { name: p.name, price: p.price_pen }
      );
      // Open payment in new window
      const payWindow = window.open(res.checkout_url, '_blank');
      setLoading('');
      setPaymentPending(true);

      // Poll for payment completion
      const BASE = import.meta.env.VITE_API_URL || '/api';
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const statusRes = await fetch(`${BASE}/store/payment-status/${res.payment_id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('kc_token') || ''}` },
          });
          const data = await statusRes.json();
          const st = data?.transaction?.status;
          if (st === 'approved' || st === 'fulfilled') {
            setPaymentResult('success');
            if (data.transaction.activation_code) setPaymentActivationCode(data.transaction.activation_code);
            try { payWindow?.close(); } catch {}
            break;
          }
          if (st === 'failed' || st === 'expired') {
            setPaymentResult('error');
            break;
          }
          // Check if window was closed
          if (payWindow?.closed) {
            // Wait a bit more for webhook
            await new Promise(r => setTimeout(r, 5000));
            const finalRes = await fetch(`${BASE}/store/payment-status/${res.payment_id}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('kc_token') || ''}` },
            });
            const finalData = await finalRes.json();
            const finalSt = finalData?.transaction?.status;
            if (finalSt === 'approved' || finalSt === 'fulfilled') {
              setPaymentResult('success');
              if (finalData.transaction.activation_code) setPaymentActivationCode(finalData.transaction.activation_code);
            } else {
              setPaymentResult('error');
            }
            break;
          }
        } catch {}
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (es ? 'Error creando pago' : 'Payment error'));
      setLoading('');
    }
  }

  return (
    <div className="pc-modal-ov" onClick={onClose}>
      <div className="pc-modal" onClick={e => e.stopPropagation()}>
        <div className="pc-modal-head">
          <h3>{es ? 'Comprar producto' : 'Buy product'}</h3>
          <button onClick={onClose}><X size={18}/></button>
        </div>

        <div className="pc-modal-product">
          <strong>{product.name}</strong>
          <span>{fmtPEN} &middot; {fmtUSD}</span>
        </div>

        <div className="pc-gateway-section">
          {/* Payment pending / result overlay */}
          {paymentPending && !paymentResult && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <Loader2 size={36} className="spin" style={{ color: 'var(--accent)', marginBottom: 12 }}/>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', fontSize: '1rem' }}>
                {es ? 'Completa el pago en la ventana abierta' : 'Complete payment in the opened window'}
              </p>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', margin: 0 }}>
                {es ? 'No cierres esta ventana. Esperando confirmacion del pago...' : 'Don\'t close this window. Waiting for payment confirmation...'}
              </p>
            </div>
          )}
          {paymentResult === 'success' && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '2px solid rgba(34,197,94,0.3)' }}>
                <CheckCircle size={28} style={{ color: '#16a34a' }}/>
              </div>
              <h3 style={{ fontWeight: 800, margin: '0 0 4px', fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                {es ? 'Compra realizada con exito!' : 'Purchase successful!'}
              </h3>
              <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>{product?.name}</p>

              {paymentActivationCode && (
                <div style={{ padding: '20px 16px', background: 'var(--bg-base)', borderRadius: 12, border: '2px solid var(--accent)', marginBottom: 16 }}>
                  <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>{es ? 'Tu codigo de activacion:' : 'Your activation code:'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: 4, color: 'var(--accent)', fontFamily: 'monospace' }}>{paymentActivationCode}</span>
                    <button onClick={() => navigator.clipboard.writeText(paymentActivationCode)} style={{
                      background: 'var(--accent-soft)', border: 'none', borderRadius: 6, padding: '6px 10px',
                      cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: '.72rem', display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <Copy size={12}/> {es ? 'Copiar' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ background: 'var(--accent-soft)', borderRadius: 8, padding: '10px 14px', textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {es ? 'Para activar tu producto escribe en el chatbot:' : 'To activate type in the chatbot:'}
                      <br/>
                      <code style={{ background: 'var(--bg-surface)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '.78rem' }}>
                        !activar {paymentActivationCode}
                      </code>
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {paymentActivationCode && (
                  <button onClick={() => { window.dispatchEvent(new CustomEvent('open-chatbot', { detail: { code: paymentActivationCode, product: product?.name } })); onClose(); }} className="btn btn-primary" style={{ fontSize: '.82rem', gap: 5 }}>
                    <MessageCircle size={14}/> {es ? 'Abrir chatbot y activar' : 'Open chatbot & activate'}
                  </button>
                )}
                <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: '.82rem' }}>
                  {es ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          )}
          {paymentResult === 'error' && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <XCircle size={44} style={{ color: '#dc2626', marginBottom: 12 }}/>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {es ? 'Pago no completado' : 'Payment not completed'}
              </p>
              <button onClick={() => { setPaymentPending(false); setPaymentResult(null); }} className="btn btn-ghost" style={{ fontSize: '.82rem', marginTop: 8 }}>
                {es ? 'Intentar de nuevo' : 'Try again'}
              </button>
            </div>
          )}

          {/* Normal gateway selection */}
          {!paymentPending && !paymentResult && checkingAvail ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Loader2 size={20} className="spin" style={{ color: 'var(--accent)' }}/></div>
          ) : !paymentPending && !paymentResult && !available ? (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🕐</div>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                {es ? 'Producto no disponible en este momento' : 'Product not available right now'}
              </p>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', margin: 0 }}>
                {es ? 'Este producto tiene un horario de disponibilidad. Intenta mas tarde.' : 'This product has availability hours. Try again later.'}
              </p>
            </div>
          ) : !paymentPending && !paymentResult ? <>
          <p className="pc-gateway-label">{es ? 'Elige tu metodo de pago:' : 'Choose your payment method:'}</p>

          <div className="pc-gateways">
            <button className="pc-gateway-btn" onClick={() => handleGateway('mercadopago')} disabled={!!loading}>
              <img src="/mercadopago.png" alt="MercadoPago" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
              <div>
                <strong>MercadoPago</strong>
                <span>{fmtPEN}</span>
              </div>
              {loading === 'mercadopago' && <Loader2 size={16} className="spin"/>}
            </button>

            <button className="pc-gateway-btn" onClick={() => handleGateway('paypal')} disabled={!!loading}>
              <img src="/paypal.png" alt="PayPal" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
              <div>
                <strong>PayPal</strong>
                <span>{fmtUSD}</span>
              </div>
              {loading === 'paypal' && <Loader2 size={16} className="spin"/>}
            </button>

            <button className="pc-gateway-btn" onClick={() => handleGateway('nowpayments')} disabled={!!loading}>
              <img src="/nowpayments.png" alt="Crypto" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
              <div>
                <strong>Crypto</strong>
                <span>BTC, ETH, USDT +150</span>
              </div>
              {loading === 'nowpayments' && <Loader2 size={16} className="spin"/>}
            </button>
          </div>

          {error && <p className="pc-gateway-error">{error}</p>}

          <p className="pc-gateway-note">
            {es
              ? 'Seras redirigido a la pasarela de pago. El producto se activara automaticamente al completar el pago.'
              : 'You will be redirected to the payment gateway. The product will be activated automatically upon payment completion.'}
          </p>
          </> : null}
        </div>
      </div>
    </div>
  );
}

// ==================== INFO SECTION ====================

const ICON_MAP: Record<string, React.ReactNode> = {
  gamepad: <Gamepad2 size={20}/>, sparkles: <Sparkles size={20}/>, zap: <Zap size={20}/>,
  monitor: <Monitor size={16}/>, star: <Star size={16}/>, music: <Music size={16}/>,
  shirt: <Shirt size={20}/>, coins: <Coins size={20}/>, crown: <Crown size={20}/>,
  rocket: <Rocket size={16}/>, info: <Info size={20}/>,
};

function InfoSection({ catInfo, lang }: { catInfo: CategoryInfo; lang: string }) {
  const es = lang === 'es';
  if (!catInfo.infoCards) return null;

  return (
    <div className="pc-info-section">
      {/* Header */}
      <div className="pc-info-header">
        <div className="pc-info-icon"><Info size={22}/></div>
        <div>
          <h3>{es ? catInfo.infoTitle_es : catInfo.infoTitle_en}</h3>
          {catInfo.infoSubtitle_es && <p>{es ? catInfo.infoSubtitle_es : catInfo.infoSubtitle_en}</p>}
        </div>
      </div>

      {/* Description */}
      {catInfo.infoDesc_es && (
        <p className="pc-info-desc">
          {es ? catInfo.infoDesc_es : catInfo.infoDesc_en}
        </p>
      )}

      {/* Cards grid */}
      <div className="pc-info-cards">
        {catInfo.infoCards.map((card, i) => (
          <div className="pc-info-card" key={i} style={{ '--ic-color': card.color } as React.CSSProperties}>
            <div className="pc-info-card-icon" style={{ color: 'var(--accent)' }}>
              {ICON_MAP[card.icon] || <Info size={20}/>}
            </div>
            <h4>{es ? card.title_es : card.title_en}</h4>
            <ul>
              {(es ? card.items_es : card.items_en).map((item, j) => (
                <li key={j}><CheckCircle size={12}/> {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Tags */}
      {catInfo.tags && (
        <div className="pc-info-tags">
          {catInfo.tags.map((tag, i) => (
            <span className="pc-info-tag" key={i} style={{ '--tag-color': tag.color } as React.CSSProperties}>
              {ICON_MAP[tag.icon] || null} {es ? tag.text_es : tag.text_en}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== PRODUCT CATALOG ====================

function ProductCatalog({ products, bulkProduct, lang, categoryKey }: {
  products: StoreProduct[];
  bulkProduct?: BulkProduct;
  lang: string;
  categoryKey?: string;
}) {
  const es = lang === 'es';
  const [rates, setRates] = useState<{ USD: number; EUR: number }>({ USD: 0.27, EUR: 0.25 });
  const [buyProduct, setBuyProduct] = useState<{ name: string; price_pen: number; productId: string } | null>(null);
  const [bulkAmount, setBulkAmount] = useState(0);
  const catInfo = categoryKey ? CATEGORY_INFO[categoryKey] : null;

  useEffect(() => {
    getExchangeRates().then(r => setRates({ USD: r.USD, EUR: r.EUR })).catch(() => {});
  }, []);

  const getBulkPrice = (bp: BulkProduct, amount: number): number => {
    if (bp.prices && bp.prices[amount] !== undefined) return bp.prices[amount];
    return amount * bp.pricePerUnit_pen;
  };
  const formatPrice = (pen: number) => {
    if (pen <= 0) return es ? 'Precio por definir' : 'Price TBD';
    return es ? `S/ ${pen.toFixed(2)}` : `$${roundCents(pen * rates.USD).toFixed(2)}`;
  };
  const formatAlt = (pen: number) => {
    if (pen <= 0) return '';
    return es ? `$${roundCents(pen * rates.USD).toFixed(2)}` : `S/ ${pen.toFixed(2)}`;
  };

  return (
    <div className="pc-catalog">
      {/* Category header */}
      {catInfo && (
        <div className="pc-header">
          <h2>{es ? catInfo.title_es : catInfo.title_en}</h2>
          <p>{es ? catInfo.desc_es : catInfo.desc_en}</p>
        </div>
      )}

      {/* Products grid (fixed + bulk as one card + individual) */}
      <div className="pc-grid">
        {products.map(p => (
          <div className="pc-card" key={p.id} style={{ '--pc-color': p.color } as React.CSSProperties}>
            <div className="pc-card-img">
              <img src={p.image} alt={p.name} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} loading="lazy"/>
            </div>
            <div className="pc-card-info">
              <h3>{(!es && p.name_en) ? p.name_en : p.name}</h3>
              {p.subtitle && <span className="pc-card-subtitle" style={{ color: p.color }}>{(!es && p.subtitle_en) ? p.subtitle_en : p.subtitle}</span>}
              {p.description && <p className="pc-card-desc">{(!es && p.description_en) ? p.description_en : p.description}</p>}
              <div className="pc-card-prices">
                {p.originalPrice_pen && p.originalPrice_pen > p.price_pen && (
                  <span className="pc-price-old">{es ? `S/ ${p.originalPrice_pen.toFixed(2)}` : `$${roundCents(p.originalPrice_pen * rates.USD).toFixed(2)}`}</span>
                )}
                <span className="pc-price-pen">{formatPrice(p.price_pen)}</span>
                {p.price_pen > 0 && <span className="pc-price-usd">{formatAlt(p.price_pen)}</span>}
              </div>
              <button className="pc-buy-btn" onClick={() => setBuyProduct({ name: (!es && p.name_en) ? p.name_en : p.name, price_pen: p.price_pen, productId: p.id })} disabled={p.price_pen <= 0}>
                <ShoppingBag size={14}/> {es ? 'Comprar ahora' : 'Buy now'}
              </button>
            </div>
          </div>
        ))}

        {/* Bulk card inline in grid */}
        {bulkProduct && (
          <div className="pc-card pc-card-bulk" style={{ '--pc-color': bulkProduct.color } as React.CSSProperties}>
            <div className="pc-card-img">
              <img src={bulkProduct.image} alt={bulkProduct.name} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} loading="lazy"/>
            </div>
            <div className="pc-card-info">
              <h3>{es ? 'Personalizado' : 'Custom'}</h3>
              <p className="pc-card-desc">{es ? 'Elige la cantidad exacta que necesitas' : 'Choose the exact amount you need'}</p>
              <div className="pc-bulk-inline">
                <div className="pc-bulk-controls">
                  <button onClick={() => {
                    if (bulkProduct.values && bulkProduct.values.length > 0) {
                      const idx = bulkProduct.values.indexOf(bulkAmount);
                      if (idx > 0) setBulkAmount(bulkProduct.values[idx - 1]);
                      else setBulkAmount(0);
                    } else {
                      const tiers = bulkProduct.tiers;
                      for (let i = tiers.length - 1; i >= 0; i--) {
                        const t = tiers[i];
                        if (bulkAmount - t.step >= t.min) { setBulkAmount(bulkAmount - t.step); return; }
                        if (bulkAmount > t.min && i > 0) { setBulkAmount(tiers[i-1].max); return; }
                      }
                      setBulkAmount(0);
                    }
                  }}><Minus size={14}/></button>
                  <span className="pc-bulk-amount">{bulkAmount || '—'}</span>
                  <button onClick={() => {
                    if (bulkProduct.values && bulkProduct.values.length > 0) {
                      const idx = bulkProduct.values.indexOf(bulkAmount);
                      if (bulkAmount === 0) setBulkAmount(bulkProduct.values[0]);
                      else if (idx >= 0 && idx < bulkProduct.values.length - 1) setBulkAmount(bulkProduct.values[idx + 1]);
                    } else {
                      const tiers = bulkProduct.tiers;
                      if (bulkAmount === 0) { setBulkAmount(tiers[0].min); return; }
                      for (const ti of tiers) {
                        if (bulkAmount >= ti.min && bulkAmount < ti.max) { setBulkAmount(bulkAmount + ti.step); return; }
                        if (bulkAmount < ti.min) { setBulkAmount(ti.min); return; }
                      }
                    }
                  }}><Plus size={14}/></button>
                </div>
                {bulkAmount > 0 && getBulkPrice(bulkProduct, bulkAmount) > 0 && (
                  <div className="pc-card-prices" style={{ marginTop: 6 }}>
                    <span className="pc-price-pen">{formatPrice(getBulkPrice(bulkProduct, bulkAmount))}</span>
                    <span className="pc-price-usd">{formatAlt(getBulkPrice(bulkProduct, bulkAmount))}</span>
                  </div>
                )}
              </div>
              {bulkAmount > 0 && (
                <button className="pc-buy-btn" onClick={() => setBuyProduct({
                  name: `${bulkAmount} ${bulkProduct.name}`,
                  price_pen: getBulkPrice(bulkProduct, bulkAmount),
                  productId: bulkProduct.id,
                })} disabled={getBulkPrice(bulkProduct, bulkAmount) <= 0}>
                  <ShoppingBag size={14}/> {es ? `Comprar ${bulkAmount}` : `Buy ${bulkAmount}`}
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Info section */}
      {catInfo && <InfoSection catInfo={catInfo} lang={lang}/>}

      {buyProduct && <PayModal product={buyProduct} onClose={() => setBuyProduct(null)} lang={lang}/>}
    </div>
  );
}

// ==================== COMING SOON ====================

function ComingSoon({ t }: { t: (key: never) => string }) {
  return (
    <div className="pc-coming">
      <Joystick size={48}/>
      <h2>{t('store.coming' as never)}</h2>
    </div>
  );
}

// ==================== STORE PAGE ====================

export default function StorePage() {
  const { cart, addToCart, removeFromCart, validateAgainstShop, cartCount, setCartOpen } = useCart();

  const [activeTab, setActiveTab] = useState<StoreTab>('shop');
  const [allItems, setAllItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const { storeLang: lang, setStoreLang: setLang, t } = useLang();
  const [navOpen, setNavOpen] = useState(false);
  const countdown = useCountdown(allItems[0]?.outDate);
  const [activeSec, setActiveSec] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  const es = lang === 'es';

  useEffect(() => {
    if (allItems.length === 0) return;
    const offerIds = new Set(allItems.map(i => i.offerId));
    const removed = validateAgainstShop(offerIds);
    if (removed > 0) {
      setToast({
        msg: es
          ? `${removed} item${removed>1?'s':''} ${removed>1?'fueron eliminados':'fue eliminado'} del carrito porque ya no está${removed>1?'n':''} en la tienda.`
          : `${removed} item${removed>1?'s':''} ${removed>1?'were removed':'was removed'} from your cart because ${removed>1?'they are':'it is'} no longer in the shop.`,
        type: 'error',
      });
    }
  }, [allItems]);

  function handleAddToCart(item: ShopItem) {
    const result = addToCart(item);
    if (result === 'not_logged_in') { setShowLoginModal(true); return; }
    if (result === 'already_in_cart') { setToast({ msg: es ? 'Ya está en el carrito' : 'Already in cart', type: 'error' }); return; }
    if (cartCount === 0) setCartOpen(true);
  }

  useEffect(() => {
    const handler = () => setShowLoginModal(true);
    window.addEventListener('show-login-modal', handler);
    return () => window.removeEventListener('show-login-modal', handler);
  }, []);

  useEffect(() => { load(); }, [lang]);

  async function load() {
    setLoading(true);
    try {
      const r = await getShop(lang === 'es' ? 'es-419' : 'en');
      const p = parse(r);
      setAllItems(p.items);
      setTotal(p.total);
    } catch {
      setToast({ msg: t('store.error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const sections = useMemo(() => {
    let its = allItems;
    if (search) {
      const q = search.toLowerCase();
      its = its.filter(i => i.name.toLowerCase().includes(q) || i.sectionName.toLowerCase().includes(q));
    }
    return groupSections(its);
  }, [allItems, search]);

  const secNames = useMemo(() => {
    const m = new Map<string, number>();
    allItems.forEach(i => { if (!m.has(i.sectionName)) m.set(i.sectionName, i.sectionRank); });
    return [...m.entries()].sort((a,b) => b[1]-a[1]).map(([n]) => n);
  }, [allItems]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ents => { for (const e of ents) if (e.isIntersecting) { setActiveSec(e.target.id.replace('s-','')); break; } },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    secNames.forEach(n => { const el = document.getElementById(`s-${n}`); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [secNames]);

  function getCardStyle(item: ShopItem): { bg: React.CSSProperties; showRender: boolean } {
    if (item.albumArt) return {
      bg: { backgroundImage: `url(${item.albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center' },
      showRender: false,
    };
    const c1 = hex2(item.colors.color1);
    const c2 = hex2(item.colors.color2);
    return {
      bg: { background: `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)` },
      showRender: item.isBigBundle && !!item.renderImg,
    };
  }

  function renderCard(item: ShopItem, idx: number) {
    const { bg, showRender } = getCardStyle(item);
    const inCart = cart.some(i => i.offerId === item.offerId);
    return (
      <div
        className={`sc sp${item.span} ${item.isBigBundle ? 'sc-bun' : ''} ${inCart ? 'sc-in-cart' : ''}`}
        key={item.offerId + idx}
        style={bg}
      >
        {countdown && <span className="sc-time"><Clock size={10} /> {countdown}</span>}
        {item.banner && <span className="sc-ban">{item.banner.backendValue === 'New' ? '¡NUEVO!' : item.banner.value}</span>}
        {inCart && <span className="sc-added-badge"><CheckCircle size={10} /> {es ? 'En carrito' : 'In cart'}</span>}
        {showRender && <div className="sc-render"><img src={item.renderImg} alt={item.name} loading="lazy" /></div>}
        {!showRender && !item.albumArt && item.featuredImg && <div className="sc-render"><img src={item.featuredImg} alt={item.name} loading="lazy" /></div>}
        {!showRender && !item.albumArt && !item.featuredImg && item.renderImg && <div className="sc-render"><img src={item.renderImg} alt={item.name} loading="lazy" /></div>}
        <div className="sc-info">
          {item.rarityText && <span className="sc-rar">{item.rarityText.toUpperCase()}</span>}
          <span className="sc-name">{item.name}</span>
          {item.isBundle && <span className="sc-lote">LOTE</span>}
          <div className="sc-bot">
            <div className="sc-pr">
              <span className="sc-vb"><VIcon s={16} /> <b>{item.finalPrice.toLocaleString()}</b></span>
              {item.hasDiscount && <span className="sc-old">{item.regularPrice.toLocaleString()}</span>}
              <span className="sc-sep">|</span>
              <span className="sc-kc">KC {item.price_kc.toLocaleString()}</span>
            </div>
            <button
              className={`sc-cart ${inCart ? 'sc-cart-added' : ''}`}
              onClick={ev => { ev.stopPropagation(); inCart ? removeFromCart(item.offerId) : handleAddToCart(item); }}
            >
              {inCart ? <CheckCircle size={15} /> : <ShoppingCart size={15} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString(
    lang === 'es' ? 'es-PE' : 'en-US',
    { weekday:'long', day:'numeric', month:'long', year:'numeric' }
  );
  if (loading) return <PageLoader />;

  return (
    <div className="shop">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Tabs ── */}
      <div className="sh-tabs">
        {([
          { id: 'shop',      icon: <Gamepad2 size={15}/> },
          { id: 'vbucks',    icon: <VIcon s={15}/> },
          { id: 'packs',     icon: <Package size={15}/> },
          { id: 'club',      icon: <Crown size={15}/> },
          { id: 'rocket',    icon: <Rocket size={15}/> },
          { id: 'epicgames', icon: <Joystick size={15}/> },
        ] as { id: StoreTab; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.id}
            className={`sh-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{t(`store.tab.${tab.id}` as never)}</span>
          </button>
        ))}
      </div>

      {/* ── Hero ── */}
      {activeTab === 'shop' && <div className="sh-hero">
        <div className="sh-hero-top">
          <span className="sh-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2v6l2 2-2 2v6h12v-6l-2-2 2-2V2H6zm10 9.5l-4 2-4-2V4h8v7.5z"/></svg>
            {t('store.official')} · {total} {t('store.items')}
          </span>
          <h1 className="sh-title">{t('store.title')}</h1>
          <p className="sh-date">{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          {countdown && (
            <div className="sh-cd">
              <Clock size={14} />
              {t('store.new')}
              <strong>{countdown}</strong>
            </div>
          )}
        </div>
        <div className="sh-bottom">
          <div className="sh-search">
            <Search size={18} />
            <input placeholder={t('store.search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="sh-row">
            <div className="sh-lang">
              <button className={`sh-lb ${lang==='es'?'on':''}`} onClick={() => setLang('es')}>
                <svg className="sh-flag-svg" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#D91023"/><rect x="10" width="10" height="20" fill="#fff"/></svg>
                <span>ES</span>
              </button>
              <button className={`sh-lb ${lang==='en'?'on':''}`} onClick={() => setLang('en')}>
                <svg className="sh-flag-svg" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
                  <rect width="30" height="20" fill="#B22234"/>
                  <rect y="1.54" width="30" height="1.54" fill="#fff"/><rect y="4.62" width="30" height="1.54" fill="#fff"/>
                  <rect y="7.69" width="30" height="1.54" fill="#fff"/><rect y="10.77" width="30" height="1.54" fill="#fff"/>
                  <rect y="13.85" width="30" height="1.54" fill="#fff"/><rect y="16.92" width="30" height="1.54" fill="#fff"/>
                  <rect width="12" height="10.77" fill="#3C3B6E"/>
                  <circle cx="2" cy="2" r="0.8" fill="#fff"/><circle cx="4" cy="2" r="0.8" fill="#fff"/><circle cx="6" cy="2" r="0.8" fill="#fff"/><circle cx="8" cy="2" r="0.8" fill="#fff"/><circle cx="10" cy="2" r="0.8" fill="#fff"/>
                  <circle cx="3" cy="4" r="0.8" fill="#fff"/><circle cx="5" cy="4" r="0.8" fill="#fff"/><circle cx="7" cy="4" r="0.8" fill="#fff"/><circle cx="9" cy="4" r="0.8" fill="#fff"/>
                  <circle cx="2" cy="6" r="0.8" fill="#fff"/><circle cx="4" cy="6" r="0.8" fill="#fff"/><circle cx="6" cy="6" r="0.8" fill="#fff"/><circle cx="8" cy="6" r="0.8" fill="#fff"/><circle cx="10" cy="6" r="0.8" fill="#fff"/>
                  <circle cx="3" cy="8" r="0.8" fill="#fff"/><circle cx="5" cy="8" r="0.8" fill="#fff"/><circle cx="7" cy="8" r="0.8" fill="#fff"/><circle cx="9" cy="8" r="0.8" fill="#fff"/>
                </svg>
                <span>EN</span>
              </button>
            </div>
            <button className="sh-ref" onClick={load}><RefreshCw size={15} /> {t('store.refresh')}</button>
          </div>
        </div>
      </div>}

      {/* ── Tab: Fortnite Shop ── */}
      {activeTab === 'shop' && <>
      <button className="fnav-btn" onClick={() => setNavOpen(!navOpen)}>
        {navOpen ? <X size={16} /> : t('store.nav')}
      </button>
      {navOpen && <div className="fnav-ov" onClick={() => setNavOpen(false)} />}
      <aside className={`fnav ${navOpen ? 'open' : ''}`}>
        <div className="fnav-h">
          <span>{t('store.nav.title')}</span>
          <button onClick={() => setNavOpen(false)}><X size={16} /></button>
        </div>
        <div className="fnav-list">
          {secNames.map(n => (
            <button
              key={n}
              className={`fnav-it ${activeSec === n ? 'on' : ''}`}
              onClick={() => {
                setNavOpen(false);
                document.getElementById(`s-${n}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
              }}
            >
              {n.toUpperCase()}
              {activeSec === n && <span className="fnav-dot" />}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Grid de items ── */}
      <div className="sh-body">
        {sections.map(sec => (
          <section className="sh-sec" key={sec.name} id={`s-${sec.name}`}>
            <h2 className="sh-sec-t">{sec.name.toUpperCase()}</h2>
            <div className="sg">
              {sec.items.map((item, idx) => renderCard(item, idx))}
            </div>
          </section>
        ))}
      </div>
      </>}

      {/* ── Tab: V-Bucks ── */}
      {activeTab === 'vbucks' && (
        <ProductCatalog products={VBUCKS_PRODUCTS} bulkProduct={VBUCKS_BULK} lang={lang} categoryKey="vbucks"/>
      )}

      {/* ── Tab: Packs ── */}
      {activeTab === 'packs' && (
        <ProductCatalog products={PACKS_PRODUCTS} lang={lang} categoryKey="packs"/>
      )}

      {/* ── Tab: Club Fortnite ── */}
      {activeTab === 'club' && (
        <ProductCatalog products={CLUB_PRODUCTS} lang={lang} categoryKey="club"/>
      )}

      {/* ── Tab: Rocket League ── */}
      {activeTab === 'rocket' && (
        <ProductCatalog products={ROCKET_PRODUCTS} bulkProduct={ROCKET_BULK} lang={lang} categoryKey="rocket"/>
      )}

      {/* ── Tab: Epic Games ── */}
      {activeTab === 'epicgames' && <ComingSoon t={t}/>}

      {/* ── Login Required Modal ── */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <button className="login-modal-close" onClick={() => setShowLoginModal(false)}>
              <X size={18}/>
            </button>
            <div className="login-modal-icon">
              <ShoppingBag size={32}/>
            </div>
            <h3>{es ? '¡Inicia sesión para comprar!' : 'Log in to purchase!'}</h3>
            <p>{es
              ? 'Necesitas una cuenta para comprar productos. Inicia sesión o crea una cuenta gratis.'
              : 'You need an account to purchase products. Log in or create a free account.'
            }</p>
            <div className="login-modal-buttons">
              <a href="/login" className="btn btn-primary btn-full">
                {es ? 'Iniciar sesión' : 'Log in'}
              </a>
              <a href="/login" className="btn btn-ghost btn-full">
                {es ? 'Crear cuenta gratis' : 'Create free account'}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
