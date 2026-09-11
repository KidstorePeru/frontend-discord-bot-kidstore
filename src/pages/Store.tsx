import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getShop } from '../services/api';
import { vbucksToKC } from '../services/constants';
import { PageLoader, Toast } from '../components/UI';
import { Search, RefreshCw, ShoppingCart, X, Clock, CheckCircle, ShoppingBag, Info } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useSEO } from '../hooks/useSEO';

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
function parse(data: any): { items: ShopItem[]; total: number; shopDate?: string } {
  const entries: any[] = data?.data?.entries || [];
  // `data.date` es cuándo EMPEZÓ la rotación actual (medianoche UTC de hoy),
  // no cuándo se actualiza — la próxima rotación es 24h después. El `outDate`
  // de cada ítem es cuándo SE VA ese ítem puntual (puede ser días después,
  // para lotes/objetos de larga duración) — no representa a toda la tienda.
  const rotationStart: string | undefined = data?.data?.date;
  const shopDate: string | undefined = rotationStart
    ? new Date(new Date(rotationStart).getTime() + 24 * 3600 * 1000).toISOString()
    : undefined;
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
  return { items, total: items.length, shopDate };
}

function groupSections(items: ShopItem[]): Section[] {
  const m = new Map<string,Section>();
  for (const i of items) {
    if (!m.has(i.sectionName)) m.set(i.sectionName, { name: i.sectionName, rank: i.sectionRank, items: [] });
    m.get(i.sectionName)!.items.push(i);
  }
  return [...m.values()].sort((a,b) => b.rank - a.rank);
}

interface CountdownParts { d: number; h: number; m: number; s: number; done: boolean; }

// Cuenta regresiva al segundo hasta `target`. Devuelve las partes ya
// calculadas para poder mostrarlas con formato hh:mm:ss.
function useCountdown(target?: string): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(null);
  useEffect(() => {
    if (!target) { setParts(null); return; }
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) { setParts({ d: 0, h: 0, m: 0, s: 0, done: true }); return; }
      setParts({
        d: Math.floor(ms / 86_400_000),
        h: Math.floor((ms % 86_400_000) / 3_600_000),
        m: Math.floor((ms % 3_600_000) / 60_000),
        s: Math.floor((ms % 60_000) / 1000),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return parts;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
function countdownLabel(c: CountdownParts, es: boolean): string {
  if (c.done) return es ? 'actualizando…' : 'refreshing…';
  const parts = [c.d && `${c.d}${es ? 'd' : 'd'}`, `${pad2(c.h)}h`, `${pad2(c.m)}m`, `${pad2(c.s)}s`].filter(Boolean);
  return parts.join(' ');
}

function VIcon({ s=16 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" style={{flexShrink:0}}><circle cx="12" cy="12" r="11" fill="#59c2ea" stroke="#2ba0cb" strokeWidth="1.5"/><text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="sans-serif" fill="#fff">V</text></svg>;
}

// ==================== STORE PAGE ====================

export default function StorePage() {
  const { cart, addToCart, removeFromCart, validateAgainstShop, cartCount, setCartOpen } = useCart();

  const [allItems, setAllItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [shopDate, setShopDate] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const { storeLang: lang, setStoreLang: setLang, t } = useLang();
  const [navOpen, setNavOpen] = useState(false);
  const cd = useCountdown(shopDate);

  useSEO({
    title: lang === 'es' ? 'Tienda de Fortnite' : 'Fortnite Store',
    description: lang === 'es'
      ? 'Compra skins, packs y cosméticos de Fortnite con KidCoins. Catálogo actualizado según la tienda oficial.'
      : 'Buy Fortnite skins, packs, and cosmetics with KidCoins. Catalog synced with the official store.',
  });
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

  // Cuando la cuenta regresiva llega a cero, la tienda oficial ya rotó —
  // recarga sola para traer el nuevo catálogo.
  useEffect(() => {
    if (!cd?.done) return;
    const id = setTimeout(() => load(), 5000);
    return () => clearTimeout(id);
  }, [cd?.done]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const r = await getShop(lang === 'es' ? 'es-419' : 'en');
      const p = parse(r);
      setAllItems(p.items);
      setTotal(p.total);
      setShopDate(p.shopDate);
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
        {item.banner && <span className="sc-ban">{item.banner.backendValue === 'New' ? '¡NUEVO!' : item.banner.value}</span>}
        {inCart && <span className="sc-added-badge"><CheckCircle size={10} /> {es ? 'En carrito' : 'In cart'}</span>}
        {showRender && <div className="sc-render"><img src={item.renderImg} alt={item.name} loading="lazy" /></div>}
        {!showRender && !item.albumArt && item.featuredImg && <div className="sc-render"><img src={item.featuredImg} alt={item.name} loading="lazy" /></div>}
        {!showRender && !item.albumArt && !item.featuredImg && item.renderImg && <div className="sc-render"><img src={item.renderImg} alt={item.name} loading="lazy" /></div>}
        <div className="sc-info">
          {item.rarityText && <span className="sc-rar">{item.rarityText.toUpperCase()}</span>}
          <span className="sc-name">{item.name}</span>
          {item.isBundle && (
            <span className="sc-lote" title={t('store.bundle.short')}>
              <Info size={10} /> {t('store.lote')}
            </span>
          )}
          <div className="sc-bot">
            <div className="sc-pr">
              <span className="sc-vb" title={es ? 'Precio oficial en V-Bucks' : 'Official V-Bucks price'}><VIcon s={16} /> <b>{item.finalPrice.toLocaleString()}</b></span>
              {item.hasDiscount && <span className="sc-old">{item.regularPrice.toLocaleString()}</span>}
              <span className="sc-sep">|</span>
              <span className="sc-kc" title={es ? 'Lo que pagas con tus KidCoins' : 'What you pay with your KidCoins'}>KC {item.price_kc.toLocaleString()}</span>
            </div>
            <button
              className={`sc-cart ${inCart ? 'sc-cart-added' : ''}`}
              onClick={ev => { ev.stopPropagation(); inCart ? removeFromCart(item.offerId) : handleAddToCart(item); }}
              aria-label={inCart
                ? (es ? `Quitar ${item.name} del carrito` : `Remove ${item.name} from cart`)
                : (es ? `Agregar ${item.name} al carrito` : `Add ${item.name} to cart`)}
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

      {/* ── Hero ── */}
      <div className="sh-hero">
        <div className="sh-hero-main">
          <div className="sh-hero-lead">
            <span className="sh-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2v6l2 2-2 2v6h12v-6l-2-2 2-2V2H6zm10 9.5l-4 2-4-2V4h8v7.5z"/></svg>
              {t('store.official')} · {total} {t('store.items')}
            </span>
            <h1 className="sh-title">{t('store.title')}</h1>
            <p className="sh-date">{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          </div>

          {cd && (
            <div
              className={`sh-countdown ${cd.done ? 'is-done' : ''}`}
              role="timer"
              aria-label={`${t('store.rotates')} ${countdownLabel(cd, es)}`}
            >
              <span className="sh-cd-label"><Clock size={12} /> {t('store.rotates')}</span>
              {cd.done ? (
                <div className="sh-cd-clock sh-cd-done">{es ? 'Actualizando…' : 'Refreshing…'}</div>
              ) : (
                <div className="sh-cd-clock" aria-hidden="true">
                  {cd.d > 0 && (
                    <>
                      <span className="sh-cd-seg"><b>{cd.d}</b><i>{es ? 'días' : 'days'}</i></span>
                      <span className="sh-cd-sep">:</span>
                    </>
                  )}
                  <span className="sh-cd-seg"><b>{pad2(cd.h)}</b><i>{es ? 'horas' : 'hrs'}</i></span>
                  <span className="sh-cd-sep">:</span>
                  <span className="sh-cd-seg"><b>{pad2(cd.m)}</b><i>min</i></span>
                  <span className="sh-cd-sep">:</span>
                  <span className="sh-cd-seg sh-cd-sec"><b>{pad2(cd.s)}</b><i>seg</i></span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sh-toolbar">
          <div className="sh-search">
            <Search size={17} />
            <input placeholder={t('store.search')} value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="sh-search-clear" onClick={() => setSearch('')} aria-label={es ? 'Limpiar búsqueda' : 'Clear search'}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="sh-lang" role="group" aria-label={es ? 'Idioma del catálogo' : 'Catalog language'}>
            <button className={`sh-lb ${lang === 'es' ? 'on' : ''}`} onClick={() => setLang('es')} aria-pressed={lang === 'es'}>
              <svg className="sh-flag-svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#D91023"/><rect x="10" width="10" height="20" fill="#fff"/></svg>
              ES
            </button>
            <button className={`sh-lb ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>
              <svg className="sh-flag-svg" viewBox="0 0 30 20">
                <rect width="30" height="20" fill="#B22234"/>
                <rect y="1.54" width="30" height="1.54" fill="#fff"/><rect y="4.62" width="30" height="1.54" fill="#fff"/>
                <rect y="7.69" width="30" height="1.54" fill="#fff"/><rect y="10.77" width="30" height="1.54" fill="#fff"/>
                <rect y="13.85" width="30" height="1.54" fill="#fff"/><rect y="16.92" width="30" height="1.54" fill="#fff"/>
                <rect width="12" height="10.77" fill="#3C3B6E"/>
              </svg>
              EN
            </button>
          </div>
          <button className="sh-ref" onClick={load} aria-label={t('store.refresh')} title={t('store.refresh')}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

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

      <p className="sh-price-legend"><Info size={13} /> {t('store.price.legend')}</p>

      {/* Nota informativa sobre los Lotes — Epic solo permite regalar un
          lote si el cliente no posee ninguno de sus objetos. */}
      <div className="sh-bundle-notice" role="note">
        <span className="sh-bundle-notice-ic"><Info size={15} /></span>
        <div>
          <strong>{t('store.bundle.title')}</strong>
          <p>{t('store.bundle.body')}</p>
        </div>
      </div>

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
              <Link to="/login" className="btn btn-primary btn-full">
                {es ? 'Iniciar sesión' : 'Log in'}
              </Link>
              <Link to="/register" className="btn btn-ghost btn-full">
                {es ? 'Crear cuenta gratis' : 'Create free account'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
