import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart, type CartItem } from '../context/CartContext';
import { useLang } from '../context/LangContext';
import { vbucksToKC } from '../services/constants';
import { PageLoader, Toast } from '../components/UI';
import { ShoppingBag, X } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import ShopHeader from '../components/fortnite-shop/ShopHeader';
import ShopSection from '../components/fortnite-shop/ShopSection';
import SectionBackgrounds from '../components/fortnite-shop/SectionBackgrounds';
import FilterPanel from '../components/fortnite-shop/FilterPanel';
import { SectionNavRail, MobileSectionNav } from '../components/fortnite-shop/SectionNav';
import { useActiveSection, useBestSellers, useShopData } from '../components/fortnite-shop/hooks';
import { buildShop, filterShop, withBestSellers, type Offer, type ShopModel } from '../components/fortnite-shop/model';
import { SHOP_LANGS, type OfferKind, type ShopLangKey } from '../components/fortnite-shop/i18n';
import '../components/fortnite-shop/fortnite-shop.css';

// Réplica de la tienda de objetos oficial de Fortnite (orden, tamaños y diseño) con los
// datos de fortnite-api.com — vía nuestro proxy, GET /store/shop (ver backend/src/store/shop.go).
// Compra directa desde la tarjeta (botón de carrito, sin modal de detalle), con el flujo que ya
// tenía KidStorePeru: el carrito, el modal de confirmación y la creación del pedido
// (App.tsx / CartContext) no cambiaron — esta página solo arma la oferta como un CartItem y
// llama a las mismas funciones de siempre.
// "LO MÁS VENDIDO DE HOY" se arma con las ventas reales (GET /store/shop/bestsellers).
export default function StorePage() {
  const { refresh } = useAuth();
  const { cart, cartCount, addToCart, removeFromCart, setCartOpen, validateAgainstShop } = useCart();
  const { lang, setLang } = useLang();

  const langKey: ShopLangKey = lang === 'en' ? 'en' : 'es';
  const t = SHOP_LANGS[langKey];
  const es = langKey === 'es';
  const { status, entries, date, stale, entriesLang, reload } = useShopData(t.apiLang);

  useSEO({
    title: es ? 'Tienda de Fortnite' : 'Fortnite Store',
    description: es
      ? 'Compra skins, packs y cosméticos de Fortnite con KidCoins. Catálogo actualizado según la tienda oficial.'
      : 'Buy Fortnite skins, packs, and cosmetics with KidCoins. Catalog synced with the official store.',
  });

  const catalog: ShopModel | null = useMemo(() => (entries ? buildShop(entries, t) : null), [entries, t]);
  // Objetos disponibles: se cuentan ANTES de agregar "lo más vendido" (esa
  // sección repite objetos que ya están en su sección original).
  const itemCount = useMemo(
    () => (catalog ? catalog.sections.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.offers.length, 0), 0) : null),
    [catalog],
  );
  const bestSellerIds = useBestSellers(date);
  const shop: ShopModel | null = useMemo(
    () => (catalog ? withBestSellers(catalog, bestSellerIds, t.bestSellers) : null),
    [catalog, bestSellerIds, t],
  );

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [types, setTypes] = useState<Set<OfferKind>>(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const visibleShop = useMemo(() => (shop ? filterShop(shop, deferredQuery, types) : null), [shop, deferredQuery, types]);
  const filtering = Boolean(deferredQuery.trim()) || types.size > 0;

  const sectionIds = useMemo(() => visibleShop?.sections.map((s) => s.domId) ?? [], [visibleShop]);
  const activeSectionId = useActiveSection(sectionIds);

  // Precio en KidCoins: lo que de verdad se cobra (el mismo cálculo que usa el
  // carrito, vbucksToKC). La divisa del cliente solo aparece al recargar KC.
  const kcFormat = useMemo(() => new Intl.NumberFormat(t.locale), [t.locale]);
  const formatKC = useCallback((vbucks: number) => kcFormat.format(vbucksToKC(vbucks)), [kcFormat]);

  const cartIds = useMemo(() => new Set(cart.map((i) => i.offerId)), [cart]);

  // Si algún ítem del carrito ya no está en la tienda actual (rotó fuera), se
  // quita solo y se avisa — mismo comportamiento que tenía la tienda anterior.
  useEffect(() => {
    if (!shop) return;
    const offerIds = new Set(shop.sections.flatMap((s) => s.groups.flatMap((g) => g.offers.map((o) => o.id))));
    const removed = validateAgainstShop(offerIds);
    if (removed > 0) {
      setToast({
        msg: es
          ? `${removed} item${removed > 1 ? 's' : ''} ${removed > 1 ? 'fueron eliminados' : 'fue eliminado'} del carrito porque ya no está${removed > 1 ? 'n' : ''} en la tienda.`
          : `${removed} item${removed > 1 ? 's' : ''} ${removed > 1 ? 'were removed' : 'was removed'} from your cart because ${removed > 1 ? 'they are' : 'it is'} no longer in the shop.`,
        type: 'error',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  useEffect(() => {
    const handler = () => setShowLoginModal(true);
    window.addEventListener('show-login-modal', handler);
    return () => window.removeEventListener('show-login-modal', handler);
  }, []);

  // offerToCartItem: el carrito, el modal de confirmación y la creación del
  // pedido (App.tsx → POST /store/order) siguen trabajando con la MISMA forma
  // de ítem de siempre — acá solo se traduce una Offer del nuevo catálogo a
  // ese formato, sin tocar nada de ese flujo ya probado.
  const offerToCartItem = useCallback((offer: Offer): CartItem => ({
    offerId: offer.id,
    name: offer.title,
    featuredImg: offer.images[0] || '',
    albumArt: '',
    renderImg: '',
    rarityText: offer.rarityLabel || (offer.kind === 'jamtrack' ? t.jamTrack : ''),
    finalPrice: offer.price.final,
    regularPrice: offer.price.regular,
    price_kc: vbucksToKC(offer.price.final),
    span: offer.cols,
    sectionName: offer.subtitle || offer.title,
    sectionRank: 0,
    colors: {
      color1: offer.colors.accent.replace('#', ''),
      color2: offer.colors.text.replace('#', ''),
      color3: offer.colors.accent.replace('#', ''),
      textBg: offer.colors.text.replace('#', ''),
    },
    hasDiscount: offer.price.regular > offer.price.final,
    isBundle: offer.isBundle,
    isBigBundle: offer.isBundle && offer.cols >= 2,
    outDate: offer.outDate,
  }), [t]);

  // Botón de carrito de la tarjeta: agrega el objeto o, si ya estaba, lo quita
  // (una unidad por objeto: se regalan de uno en uno). Sin sesión, abre el modal
  // de inicio de sesión. Al agregar el primero se abre el carrito, igual que la
  // tienda anterior.
  const handleToggleCart = useCallback((offer: Offer) => {
    if (cartIds.has(offer.id)) {
      removeFromCart(offer.id);
      return;
    }
    const result = addToCart(offerToCartItem(offer));
    if (result === 'not_logged_in') { setShowLoginModal(true); return; }
    if (result === 'added' && cartCount === 0) setCartOpen(true);
  }, [cartIds, cartCount, addToCart, removeFromCart, offerToCartItem, setCartOpen]);

  const toggleType = useCallback((kind: OfferKind) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      return next;
    });
  }, []);
  const toggleFilters = useCallback(() => setFiltersOpen((v) => !v), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  // Refresca el saldo/perfil al volver a la tienda por si cambió en otra pestaña.
  useEffect(() => { void refresh(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  // Modal de inicio de sesión requerido — mismo mecanismo que el resto del sitio.
  const loginModalRef = useRef<HTMLDivElement>(null);
  const loginModalCloseBtnRef = useRef<HTMLButtonElement>(null);
  useModalFocusTrap(showLoginModal, loginModalRef, loginModalCloseBtnRef, () => setShowLoginModal(false));

  const navProps = {
    categories: visibleShop?.categories ?? [],
    activeSectionId,
    t,
    filterCount: types.size,
    onToggleFilters: toggleFilters,
    filtersOpen,
  };

  if (status === 'loading' && !shop) return <PageLoader />;

  return (
    <div className="fnshop">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {shop && <SectionBackgrounds sections={shop.sections} activeId={activeSectionId} />}

      <div className="fns-shop">
        <div className="fns-frame">
          {visibleShop && <SectionNavRail {...navProps} />}

          <div className="fns-content">
            <ShopHeader
              t={t}
              shopDate={date}
              itemCount={itemCount}
              langKey={langKey}
              onLang={setLang}
              query={query}
              onQuery={setQuery}
              onRefresh={reload}
              loading={status === 'loading'}
            />
            {visibleShop && <MobileSectionNav {...navProps} />}

            {filtersOpen && shop && (
              <FilterPanel
                shop={shop}
                types={types}
                onToggle={toggleType}
                onClear={() => setTypes(new Set())}
                onClose={closeFilters}
                t={t}
              />
            )}

            {/* Falló la actualización pero hay objetos de antes: se conservan, con un
                aviso claro de que pueden no estar al día y la opción de reintentar. */}
            {shop && status === 'error' && (
              <div className="fns-notice fns-notice--error" role="alert">
                <span>{entriesLang && entriesLang !== t.apiLang ? t.updateFailedLang : t.updateFailed}</span>
                <button type="button" className="fns-pill-button" onClick={reload}>
                  {t.retry}
                </button>
              </div>
            )}
            {shop && stale && status !== 'error' && (
              <div className="fns-notice" role="status">
                <span>{t.stale}</span>
                <button type="button" className="fns-pill-button" onClick={reload}>
                  {t.retry}
                </button>
              </div>
            )}

            {!shop && status === 'error' && (
              <div className="fns-state">
                <h3>{t.error}</h3>
                <button type="button" className="fns-pill-button" onClick={reload}>
                  {t.retry}
                </button>
              </div>
            )}

            {visibleShop && visibleShop.sections.length === 0 && (
              <div className="fns-state">
                <p>{t.noResults}</p>
                <button
                  type="button"
                  className="fns-pill-button"
                  onClick={() => { setQuery(''); setTypes(new Set()); }}
                >
                  {t.clearFilters}
                </button>
              </div>
            )}

            {visibleShop?.sections.map((section) => (
              <ShopSection
                key={section.id}
                section={section}
                t={t}
                onToggleCart={handleToggleCart}
                filtering={filtering}
                formatKC={formatKC}
                cartIds={cartIds}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Login Required Modal (mismo componente que usaba la tienda anterior) ── */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div
            className="login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            aria-describedby="login-modal-desc"
            ref={loginModalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="login-modal-close"
              onClick={() => setShowLoginModal(false)}
              aria-label={es ? 'Cerrar' : 'Close'}
              ref={loginModalCloseBtnRef}
            >
              <X size={18} />
            </button>
            <div className="login-modal-icon">
              <ShoppingBag size={32} />
            </div>
            <h3 id="login-modal-title">{es ? '¡Inicia sesión para comprar!' : 'Log in to purchase!'}</h3>
            <p id="login-modal-desc">
              {es
                ? 'Necesitas una cuenta para comprar productos. Inicia sesión o crea una cuenta gratis.'
                : 'You need an account to purchase products. Log in or create a free account.'}
            </p>
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
