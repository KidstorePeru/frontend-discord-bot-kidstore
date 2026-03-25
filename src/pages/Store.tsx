import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { getShop } from '../services/api';
import { vbucksToKC } from '../services/constants';
import { PageLoader, Toast } from '../components/UI';
import { Search, RefreshCw, ShoppingCart, X, Clock, CheckCircle } from 'lucide-react';
import { useLang } from '../context/LangContext';

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

function KCIcon({ s=16 }: { s?: number }) {
  return <img src="/kidcoin.png" alt="KC" width={s} height={s} style={{objectFit:'contain',flexShrink:0}}/>;
}

export default function StorePage() {
  const { cart, addToCart, removeFromCart, validateAgainstShop, cartCount, setCartOpen } = useCart();

  const [allItems, setAllItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const { storeLang: lang, setStoreLang: setLang, t } = useLang();
  const [navOpen, setNavOpen] = useState(false);
  const countdown = useCountdown(allItems[0]?.outDate);
  const [activeSec, setActiveSec] = useState('');

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
    if (result === 'not_logged_in') { setToast({ msg: t('store.login'), type: 'error' }); return; }
    if (result === 'already_in_cart') { setToast({ msg: es ? 'Ya está en el carrito' : 'Already in cart', type: 'error' }); return; }
    if (cartCount === 0) setCartOpen(true);
  }

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

      {/* ── Hero ── */}
      <div className="sh-hero">
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
    </div>
  );
}
