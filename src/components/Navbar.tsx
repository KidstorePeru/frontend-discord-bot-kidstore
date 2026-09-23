import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import CurrencySelector from './CurrencySelector';
import { Store, LayoutDashboard, LogOut, Zap, Menu, X, Globe, User, Bot, Sun, Moon, Coins, ShoppingCart, Shield, LayoutGrid } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';

export default function Navbar() {
  const { customer, logout, isAdmin } = useAuth();
  const { lang, setLang, t } = useLang();
  const { toggleTheme, isDark } = useTheme();
  const { cartCount, setCartOpen } = useCart();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const balance = useCountUp(customer?.kc_balance ?? 0);

  // Store.tsx (StorePage) monta la tienda en la ruta "/store" — pero React
  // Router no distingue "/store" de "/store/" al hacer MATCH (ambas
  // renderizan StorePage), mientras que "location.pathname" sí puede traer
  // la barra final tal cual quedó en la URL (un link externo, un share, o
  // el usuario escribiéndola a mano). Comparar con "===" contra un único
  // string literal rompía el acceso a categorías en esa variante, aunque
  // la tienda SÍ estaba montada. Se normaliza sacando cualquier barra
  // final (salvo la raíz "/") antes de comparar, en vez de sumar un
  // segundo string hardcodeado — cubre cualquier cantidad de barras
  // finales, no solo la de un caso puntual.
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isStorePage = normalizedPath === '/store';

  // Espejo de "navOpen" (estado real, dueño: Store.tsx) para poder anunciar
  // "aria-expanded" en el disparador de acá — Navbar y Store son
  // componentes hermanos sin estado compartido, así que Store.tsx
  // retransmite cada cambio por el mismo canal de eventos que ya usa para
  // recibir la orden de abrir/cerrar (ver 'toggle-store-categories' más
  // abajo y el useEffect correspondiente en Store.tsx).
  const [storeNavOpen, setStoreNavOpen] = useState(false);
  useEffect(() => {
    function handler(e: Event) {
      setStoreNavOpen((e as CustomEvent<boolean>).detail);
    }
    window.addEventListener('store-categories-state', handler);
    return () => window.removeEventListener('store-categories-state', handler);
  }, []);

  const links = customer
    ? [
        { to: '/store',     label: t('nav.store'),    icon: <Store size={17} /> },
        { to: '/dashboard', label: t('nav.orders'),   icon: <LayoutDashboard size={17} /> },
        { to: '/recharge',  label: t('nav.recharge'), icon: <Zap size={17} /> },
        { to: '/bots',      label: t('nav.bots'),     icon: <Bot size={17} /> },
        { to: '/account',   label: t('nav.profile'),  icon: <User size={17} /> },
        ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: <Shield size={17} /> }] : []),
      ]
    : [
        { to: '/store', label: t('nav.store'), icon: <Store size={17} /> },
        { to: '/login', label: t('nav.login'), icon: <Coins size={17} /> },
      ];

  const isActive = (path: string) => normalizedPath === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
          <img src="/logotipo.png" alt="KidStorePeru" className="brand-logo-only" />
        </Link>

        {customer && (
          <div className="navbar-balance">
            <img src="/kidcoin.png" alt="KC" className="kc-icon-sm" />
            <span>{balance.toLocaleString()} KC</span>
          </div>
        )}

        {/* Controles de la derecha */}
        <div className="navbar-controls">
          {/* Idioma */}
          <div className="navbar-lang">
            <Globe size={14} />
            <button className={`lang-sw ${lang === 'es' ? 'active' : ''}`} onClick={() => setLang('es')}>ES</button>
            <button className={`lang-sw ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
          </div>

          {/* Divisa */}
          <CurrencySelector />

          {/* Tema */}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Categorías de la tienda — solo en /store, a CUALQUIER ancho:
              reemplaza el botón flotante ".fnav-btn" que vivía sobre la
              cuadrícula de productos (tapaba controles tanto en celular
              como en tablet/escritorio). La barra del navbar es "sticky" y
              el contenido de la página SIEMPRE fluye por debajo de ella
              (nunca al revés), así que un disparador acá adentro nunca
              puede terminar tapando el precio/carrito de una tarjeta, sin
              importar en qué scroll se detenga el usuario ni el ancho de
              pantalla. Store.tsx escucha 'toggle-store-categories' para
              abrir/cerrar el panel (".fnav") y retransmite su estado real
              por 'store-categories-state' para que "aria-expanded" acá
              nunca quede desincronizado del panel que en verdad controla. */}
          {isStorePage && (
            <button
              className="navbar-store-nav-btn"
              onClick={() => window.dispatchEvent(new Event('toggle-store-categories'))}
              aria-label={t('store.nav')}
              aria-expanded={storeNavOpen}
              aria-controls="store-categories-panel"
            >
              <LayoutGrid size={18} />
            </button>
          )}

          {/* Carrito — visible solo si el cliente tiene items */}
          {customer && cartCount > 0 && (
            <button
              className="navbar-cart-btn"
              onClick={() => setCartOpen(true)}
              aria-label="Carrito"
            >
              <ShoppingCart size={18} />
              <span className="navbar-cart-badge" key={cartCount}>{cartCount}</span>
            </button>
          )}

          {/* Hamburger */}
          <button className="navbar-toggle" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Links */}
        <div className={`navbar-links ${open ? 'open' : ''}`}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link ${isActive(l.to) ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.icon}{l.label}
            </Link>
          ))}
          {customer && (
            <button className="nav-link nav-logout" onClick={() => { logout(); setOpen(false); }}>
              <LogOut size={17} />{t('nav.logout')}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
