import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { Store, LayoutDashboard, LogOut, Zap, Menu, X, Globe, User, Bot, Sun, Moon, Coins, ShoppingCart, Shield } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { customer, logout, isAdmin } = useAuth();
  const { lang, setLang, t } = useLang();
  const { toggleTheme, isDark } = useTheme();
  const { cartCount, setCartOpen } = useCart();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = customer
    ? [
        { to: '/store',     label: t('nav.store'),    icon: <Store size={17} /> },
        { to: '/dashboard', label: t('nav.orders'),   icon: <LayoutDashboard size={17} /> },
        { to: '/recharge',  label: t('nav.recharge'), icon: <Zap size={17} /> },
        { to: '/bots',      label: t('nav.bots'),     icon: <Bot size={17} /> },
        { to: '/profile',   label: t('nav.profile'),  icon: <User size={17} /> },
        ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: <Shield size={17} /> }] : []),
      ]
    : [
        { to: '/store', label: t('nav.store'), icon: <Store size={17} /> },
        { to: '/login', label: t('nav.login'), icon: <Coins size={17} /> },
      ];

  const isActive = (path: string) => location.pathname === path;

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
            <span>{customer.kc_balance.toLocaleString()} KC</span>
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

          {/* Tema */}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Carrito — visible solo si el cliente tiene items */}
          {customer && cartCount > 0 && (
            <button
              className="navbar-cart-btn"
              onClick={() => setCartOpen(true)}
              aria-label="Carrito"
            >
              <ShoppingCart size={18} />
              <span className="navbar-cart-badge">{cartCount}</span>
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
