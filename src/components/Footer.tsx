import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';

const SOCIAL_LINKS = [
  { label: 'WhatsApp', href: 'https://wa.me/51999999999',
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> },
  { label: 'Discord', href: 'https://discord.gg/kidstoreperu',
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
  { label: 'Instagram', href: 'https://instagram.com/kidstoreperu',
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
  { label: 'Facebook', href: 'https://facebook.com/kidstoreperu',
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  { label: 'TikTok', href: 'https://tiktok.com/@kidstoreperu',
    svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-6.13 6.3 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.17a8.2 8.2 0 0 0 4.79 1.52V7.25a4.85 4.85 0 0 1-1.02-.56z"/></svg> },
];

export default function Footer() {
  const { lang } = useLang();
  const es = lang === 'es';

  return (
    <footer className="lv7-footer">
      <div className="lv7-footer-inner">
        {/* Brand */}
        <div className="lv7-footer-brand">
          <img src="/logotipo.png" alt="KidStorePeru" className="lv7-footer-logo" />
          <p>{es ? 'La tienda de Fortnite más confiable de Perú. Compra skins y emotes con KidCoins.' : 'The most trusted Fortnite store in Peru. Buy skins and emotes with KidCoins.'}</p>
          <div className="lv7-footer-hours">
            <span className="lv7-hours-dot"/>
            <span><strong>{es ? 'Atención:' : 'Hours:'}</strong> {es ? 'Lun–Dom · 12:00 AM – 9:00 AM' : 'Mon–Sun · 12:00 AM – 9:00 AM'}</span>
          </div>
          <div className="lv7-socials">
            {SOCIAL_LINKS.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="lv7-social" aria-label={s.label}>{s.svg}</a>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="lv7-footer-links">
          <div className="lv7-fcol">
            <strong>{es ? 'Tienda' : 'Store'}</strong>
            <Link to="/store">{es ? 'Ver items' : 'Browse items'}</Link>
            <Link to="/recharge">{es ? 'Recargar KC' : 'Recharge KC'}</Link>
            <Link to="/bots">{es ? 'Cuentas Bot' : 'Bot Accounts'}</Link>
          </div>
          <div className="lv7-fcol">
            <strong>{es ? 'Cuenta' : 'Account'}</strong>
            <Link to="/register">{es ? 'Registrarse' : 'Sign up'}</Link>
            <Link to="/login">{es ? 'Iniciar sesión' : 'Login'}</Link>
            <Link to="/dashboard">{es ? 'Mi Panel' : 'My Panel'}</Link>
          </div>
          <div className="lv7-fcol">
            <strong>{es ? 'Soporte' : 'Support'}</strong>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">{es ? 'Contacto' : 'Contact'}</Link>
          </div>
          <div className="lv7-fcol">
            <strong>Legal</strong>
            <Link to="/terms">{es ? 'Términos y Condiciones' : 'Terms & Conditions'}</Link>
            <Link to="/privacy">{es ? 'Política de Privacidad' : 'Privacy Policy'}</Link>
            <Link to="/refunds">{es ? 'Política de Reembolsos' : 'Refund Policy'}</Link>
          </div>
        </div>
      </div>

      <div className="lv7-footer-bottom">
        <span>© {new Date().getFullYear()} KidStorePeru — {es ? 'Todos los derechos reservados' : 'All rights reserved'}</span>
        <span>{es ? 'No afiliado con Epic Games' : 'Not affiliated with Epic Games'}</span>
      </div>
    </footer>
  );
}
