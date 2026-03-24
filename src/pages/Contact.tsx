import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Clock, Send, HelpCircle } from 'lucide-react';
import { useLang } from '../context/LangContext';

const SOCIALS = [
  { id: 'whatsapp', label: 'WhatsApp', desc_es: 'Respuesta en minutos', desc_en: 'Reply in minutes', href: 'https://wa.me/51999999999', color: '#25d366', bg: 'rgba(37,211,102,0.08)', border: 'rgba(37,211,102,0.2)', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> },
  { id: 'discord', label: 'Discord', desc_es: 'Servidor de la comunidad', desc_en: 'Community server', href: 'https://discord.gg/kidstoreperu', color: '#5865f2', bg: 'rgba(88,101,242,0.08)', border: 'rgba(88,101,242,0.2)', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
  { id: 'instagram', label: 'Instagram', desc_es: '@kidstoreperu', desc_en: '@kidstoreperu', href: 'https://instagram.com/kidstoreperu', color: '#e1306c', bg: 'rgba(225,48,108,0.08)', border: 'rgba(225,48,108,0.2)', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
  { id: 'facebook', label: 'Facebook', desc_es: 'KidStorePeru', desc_en: 'KidStorePeru', href: 'https://facebook.com/kidstoreperu', color: '#1877f2', bg: 'rgba(24,119,242,0.08)', border: 'rgba(24,119,242,0.2)', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  { id: 'tiktok', label: 'TikTok', desc_es: '@kidstoreperu', desc_en: '@kidstoreperu', href: 'https://tiktok.com/@kidstoreperu', color: '#010101', bg: 'rgba(0,0,0,0.06)', border: 'rgba(0,0,0,0.12)', svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-6.13 6.3 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.17a8.2 8.2 0 0 0 4.79 1.52V7.25a4.85 4.85 0 0 1-1.02-.56z"/></svg> },
];

export default function Contact() {
  const { lang } = useLang();
  const es = lang === 'es';

  return (
    <div className="legal-page">
      <div className="legal-inner legal-inner-narrow">
        <Link to="/" className="legal-back"><ArrowLeft size={16}/> {es ? 'Volver al inicio' : 'Back to home'}</Link>
        <div className="contact-hero">
          <div className="contact-hero-icon"><MessageCircle size={32}/></div>
          <h1>{es ? '¿Cómo podemos ayudarte?' : 'How can we help you?'}</h1>
          <p>{es ? 'Estamos disponibles para resolver tus dudas sobre pedidos, pagos o cualquier consulta.' : 'We\'re available to help with your questions about orders, payments, or anything else.'}</p>
          <div className="contact-hours">
            <Clock size={15}/>
            <span><strong>{es ? 'Horario de atención:' : 'Support hours:'}</strong> {es ? 'Lunes – Domingo · 12:00 AM – 9:00 AM (hora Perú)' : 'Monday – Sunday · 12:00 AM – 9:00 AM (Peru time)'}</span>
          </div>
        </div>
        <div className="contact-channels">
          <h2 className="contact-section-title">{es ? 'Canales de soporte' : 'Support channels'}</h2>
          <div className="contact-grid">
            {SOCIALS.map(s => (
              <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" className="contact-card"
                style={{'--cc': s.color, '--cbg': s.bg, '--cborder': s.border} as React.CSSProperties}>
                <div className="contact-card-icon">{s.svg}</div>
                <div className="contact-card-info">
                  <strong>{s.label}</strong>
                  <span>{es ? s.desc_es : s.desc_en}</span>
                </div>
                <Send size={14} className="contact-card-arrow"/>
              </a>
            ))}
          </div>
        </div>
        <div className="contact-faq-cta">
          <HelpCircle size={20}/>
          <div>
            <strong>{es ? '¿Tienes una pregunta frecuente?' : 'Have a common question?'}</strong>
            <p>{es ? 'Revisa nuestras preguntas frecuentes antes de contactarnos.' : 'Check our FAQ before reaching out — we may already have the answer.'}</p>
          </div>
          <Link to="/faq" className="btn btn-primary btn-sm">{es ? 'Ver FAQ' : 'View FAQ'}</Link>
        </div>
      </div>
    </div>
  );
}
