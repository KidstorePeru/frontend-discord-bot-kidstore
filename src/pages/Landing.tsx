import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatReferencePrice } from '../services/constants';
import { ArrowRight, ChevronRight, ShieldCheck, Zap, Clock, Package, Headphones, Star } from 'lucide-react';

function IconStar()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>; }
function IconFire()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-4.4 0-8-3.6-8-8 0-3.5 2.3-6.5 5.5-7.6-.3 1-.2 2.1.4 3 .3.5.8.9 1.3 1.1C10.1 9.4 10 7 10.8 5c.8-2 2.4-3.5 4.2-4.5-.3 1.6.1 3.3 1.2 4.5.7.8 1.5 1.3 2.5 1.6-1 1.2-1.7 2.7-1.7 4.4 0 3.3 2 4.5 2 7C19 19.4 15.4 23 12 23z"/></svg>; }
function IconCrown() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 19h18v2H3v-2zM2 7l4 8h12l4-8-5 3-5-8-5 8-5-3z"/></svg>; }

// Refleja los métodos reales de /recharge: pasarelas automáticas primero,
// luego los manuales. Binance ya no es un método manual (ver Recharge.tsx) —
// la cripto ahora es parte del pago automático internacional.
const PAYMENT_METHODS = [
  { name: 'MercadoPago', logo: '/mercadopago.png' },
  { name: 'PayPal',      logo: '/paypal-imagotipo.png' },
  { name: 'Yape',        logo: '/yape-imagotipo.png' },
  { name: 'Plin',        logo: '/plin-imagotipo.png' },
  { name: 'BCP',         logo: '/bcp-imagotipo.png' },
  { name: 'Interbank',   logo: '/interbank-imagotipo.png' },
  { name: 'BBVA',        logo: '/bbva-imagotipo.png' },
  { name: 'Bizum',       logo: '/bizum.png' },
];

// ─────────────────────────────────────────────────────────────
// TESTIMONIOS — reseñas reales de clientes, curadas a mano.
// Agrega aquí cada reseña conforme la vayas recibiendo (Google, Facebook,
// Trustpilot, Discord, WhatsApp, etc.) — nunca inventar contenido: la
// sección completa se oculta sola mientras este arreglo esté vacío.
// Ejemplo:
// { name: 'Juan P.', text_es: 'Todo llegó rápido y sin problemas.', text_en: 'Everything arrived fast, no issues.', rating: 5, source: 'Google' },
// ─────────────────────────────────────────────────────────────
interface Testimonial {
  name: string;
  text_es: string;
  text_en: string;
  rating: number;
  source: 'Google' | 'Facebook' | 'Trustpilot' | 'Discord' | 'WhatsApp';
}
const TESTIMONIALS: Testimonial[] = [];
const SOURCE_COLOR: Record<Testimonial['source'], string> = {
  Google: '#4285F4', Facebook: '#1877F2', Trustpilot: '#00b67a', Discord: '#5865F2', WhatsApp: '#25D366',
};

// ─────────────────────────────────────────────────────────────
// RESEÑAS DE FACEBOOK — widget oficial (iframe de Meta), no texto copiado.
// Cómo conseguir cada link: ve a tu Página de Facebook → pestaña "Reseñas"
// → los tres puntos (•••) de la reseña que quieras mostrar → "Insertar"
// → copia el link (el permalink de esa reseña/publicación). El `height`
// es el que Facebook calculó para esa reseña específica (viene en su mismo
// código de inserción) — así cada tarjeta se ve del tamaño justo, sin
// scroll interno ni espacio vacío.
// ─────────────────────────────────────────────────────────────
interface FacebookReview { url: string; height: number; }
const FACEBOOK_REVIEWS: FacebookReview[] = [
  { url: 'https://www.facebook.com/kimbun.kimbun.3386/posts/pfbid023qKRjk2fEVEtF2u6VKhqbjdKsDDDza52rJGpftoaMGU29M1JNyRGgLGtNxVbU4cpl', height: 166 },
  { url: 'https://www.facebook.com/luis.eo.4682/posts/pfbid0kG4Sb1SxvQeRrSxzZf1ssyHbJ7BJBz8CR9VD7c3mXbXC7hDm272g5kffTn9DxyUfl', height: 170 },
  { url: 'https://www.facebook.com/fabianeTsukishiro/posts/pfbid0cahdWXe32fTy9iu7U9md9CfGbRKTWQaXLvRbXyHRFuMrZqQdsFdQ4nA8A3cdLNPVl', height: 272 },
  { url: 'https://www.facebook.com/kevin.ccaso.79/posts/pfbid02iUkGRJD76LGrKQEZHvzZC5HnPtCKMEbythyHNxpECHcwc27FmU5M5eqWrCc8bzRMl', height: 250 },
  { url: 'https://www.facebook.com/SephithSTF/posts/pfbid021Ptf1HeWzfNA9qomtPVFzhiGXUf8cnFhEnZT9z9L6yefiieS2yAunHcx9vVqtCCtl', height: 250 },
  { url: 'https://www.facebook.com/AntonyYoshi/posts/pfbid02YVAjsjqAEZofpWYkMvRa9XMVh68FF5ZVdZv4U1t6Ahba6eohFVDuZbVXMUpuhg83l', height: 189 },
  { url: 'https://www.facebook.com/andrea.lucas.699467/posts/pfbid02u3R3xGGmFBREqDm9yo5RBWfbKwg1wrSidsyueVn4r7Qjizw6Q8nFEqfTAPwYdBd1l', height: 194 },
  { url: 'https://www.facebook.com/richardanderson.encinascondor/posts/pfbid0VL2LwrQAx6N5NRS3FkNxr9189Qvj7CYEhwPJgbezEyGbxarS8TptKFGutbXuWjVNl', height: 189 },
  { url: 'https://www.facebook.com/Xrusses/posts/pfbid0yFB1qqjtoJCTFcE1ccLYJVjsVdxKdVJNs91NSeJKPsAgotw8Di3G5b7UiooMWSSJl', height: 166 },
  { url: 'https://www.facebook.com/wilmercarranza.carranza.3/posts/pfbid037HibiR4wModQ57eJ5NAayhYdgXXYQ87UohGoh3icsdaPD1QcdQ5YFvYFL5H4Fb3pl', height: 166 },
  { url: 'https://www.facebook.com/brian.marquez.763203/posts/pfbid02w95JxoQbcKRVj71AeDGo7Qm4DpBPYzPWPHkJAUxgQS7c3sx1B4jqxhTsSX2VcqtQl', height: 194 },
  { url: 'https://www.facebook.com/permalink.php?story_fbid=pfbid0x2QTnWfwDLMdak8qbSg2BB3zwMTUsfYrPF1ioZ5tGqXtfD2b8Z9Ux2FeqaXjfKdNl&id=100095321777575', height: 166 },
  { url: 'https://www.facebook.com/je.veux.vingt.neuf/posts/pfbid0346iVF6YihdWrYbSphPcEVxf6RLnawP2TMLKE6wb72kkNLxaAf4Xk5piQ3eyKC3Jul', height: 170 },
  { url: 'https://www.facebook.com/fernandoaaron.grillo/posts/pfbid02LRZvCDMoFuTbLQHzKg7jvPqqcpuRSaDnDJag2J3NDivaJxNfe9J8MJUjAEEJJyz7l', height: 194 },
  { url: 'https://www.facebook.com/permalink.php?story_fbid=pfbid0MsYzUXHkSwTG12CRT56vz6SZAmXchNy4oeAFuYgTmWG9ydNSyZiGruTt5oQ41vE9l&id=61571042311900', height: 250 },
  { url: 'https://www.facebook.com/kevin.eduardo.596457/posts/pfbid09jFpmX1BPgZhXjYdhGURTmrdzXtzwZPCEYqpMg1bdtZWSjGsoeQ28EHBq8Y7wXPtl', height: 166 },
  { url: 'https://www.facebook.com/lyy.ramirez.3/posts/pfbid02FnFpCSBZu9Mm25PkFzHsvwGPP5az23zUrVTBsNxftTrfnes4PVQykxxtCJfj5RxUl', height: 166 },
  { url: 'https://www.facebook.com/diego.horna.429756/posts/pfbid02douV4gU2jVssnSH2YDv42WtgofWWzMcSzzzq9DFw8YnywwDbYgYPNpJNcwvFKBAKl', height: 166 },
  { url: 'https://www.facebook.com/marko.vallesMendoza/posts/pfbid0FDiK2VozX1YSzybRvuxtxLRsr4TungaPZSPeQJNbX5ko4wFW79NYsE4c6Ge4LoEMl', height: 194 },
  { url: 'https://www.facebook.com/whatareyoudoing15/posts/pfbid0zdzK7pF7nvghww8tPiAvbcR8eFdEy5y7dTtARSA2VbgFYtPHLZHe53NQ65mWEDNYl', height: 166 },
  { url: 'https://www.facebook.com/permalink.php?story_fbid=pfbid029NcbwzTcVu8jfWsYB4CGWr62XDDm4fPj9eJgdS1zmP35AXkCNjtmkgS3bPxzzbpRl&id=100092716593312', height: 194 },
  { url: 'https://www.facebook.com/luis.quinto.5201254/posts/pfbid02SbEQKBkoWPJRsh94e1226vzTzk8DdgNc4d3z2bMaGtFNYHLPe1boUZ3D2qSXZcxzl', height: 166 },
  { url: 'https://www.facebook.com/joseluis.mox/posts/pfbid0KxV8AQixJ8cgxzppbYHKWgX6ZPCdz77Cqp7RG8Wqi2bkZJoUVavCTjigiUSgPTLLl', height: 166 },
  { url: 'https://www.facebook.com/sherlock.gillen/posts/pfbid02PLBuF8fpfGZ9resQpR7CE9xkdDCrafakftzxY1T8L2Yn1SUWrr97igXgKU3gmX1Jl', height: 194 },
  { url: 'https://www.facebook.com/joselito.deuniversitario/posts/pfbid0kBUQWVkRvvFZktDLXKpoWEyFzKgiSSb1SZsrj9z8vaw9TgbxWjMiaDqyLN8YKjthl', height: 194 },
  { url: 'https://www.facebook.com/SainZ.trx/posts/pfbid0n1qvo8W1zxSBSakLEMZqKff3TUqkDUDAtBJXiDPGq3QWvQkB41d83GFP6H6LrvKBl', height: 194 },
  { url: 'https://www.facebook.com/maicol.jhoal.perez/posts/pfbid0KbJGTrfaMSyee3kcqnPJwnfNshmbh2izMHiSMP831ufBv4nB1Jp2sET99Pvo7nQ7l', height: 194 },
  { url: 'https://www.facebook.com/laldair/posts/pfbid02WY2XHmveSZHL76dB3HPQkZJYi7AiWV2tF7vLEKZuwEVm5J2eSaYKV1oLi44JnQ7rl', height: 170 },
  { url: 'https://www.facebook.com/joseph.daniel.907667/posts/pfbid02ztBhQwTf3kBmGW3qAvqw1jRcLbGVqTjb9QUXLFMftQgYePNPkK1NLqPVhQv9Hi4Rl', height: 194 },
  { url: 'https://www.facebook.com/jefferson.copavilla/posts/pfbid02REP6VdCRPNTZsgk1sessyFXHkJ4DETQ6to1Q4hVxvSaSuQVZmHQU5ta5d8HWEMXSl', height: 170 },
  { url: 'https://www.facebook.com/katty.fernandez.3572/posts/pfbid0RNgaVV6ZDJF1duKJGjVMRZidgAGyjWsAzseNAL1yjBQ4oCsw8g2VPx8vb1eyaCTCl', height: 166 },
  { url: 'https://www.facebook.com/RenzoZaHdiel/posts/pfbid02ft34iP326yHMHAQ3s9Av4aCv8eij6cJbKsBhNKwgSbPQfHhQJJ8FiUFi4PSBWZ6Dl', height: 166 },
  { url: 'https://www.facebook.com/sunkzzz/posts/pfbid05gfy4xCBQwkeYXwbDffb9ZwJXuqPcj7pRkMxsLDh4RCZkNEEabpMfjxGCqqS1nmSl', height: 194 },
  { url: 'https://www.facebook.com/samuel.aquino.188/posts/pfbid0We2xp9LQwE1SXSwpsu7iT25ybYThGRKmMQM5yg39Koup9NbMChxRTJUo3c3HRZQDl', height: 250 },
  { url: 'https://www.facebook.com/45pez/posts/pfbid02VjioYcH6yTTdAkceFyKo6o3jT7oNicnHdtptpqsaCr9eZ6uZsj1rSZk2XUGfpRc6l', height: 170 },
  { url: 'https://www.facebook.com/nadia.mamani.940/posts/pfbid02hFygvjW3fjMSd9J8aqQ4W1Jvm8ozxRZqgbq9UcyK69oJr5zT6FiYNsbWsFE6d4Vvl', height: 189 },
  { url: 'https://www.facebook.com/itsharlow24/posts/pfbid02RFh764FiXZ4Ceu3eMtcdji8gaohiAWgU786uKicQQXDTfwcC7PZ8mPi73WhsGckYl', height: 170 },
  { url: 'https://www.facebook.com/isac.isac.12327608/posts/pfbid0XY7GhNuQyZNLhXkPayk9MANxikGwEkwaquzSB2ZkTuJz5sBzpT7q3CnxB1YsGYZl', height: 166 },
  { url: 'https://www.facebook.com/edgardavid.abantocondori/posts/pfbid0AuJ2FnCmmHmGM4dw73KH5jesAGZHDVquvsy3WaGEPnwaSx3mufX7pvSSrscsNfH6l', height: 222 },
  { url: 'https://www.facebook.com/renzoparraga666/posts/pfbid0psJDkAvaUxrpmWN2Le2HJu76qpRDtNrF3QpTNKiLSeMV9ak7ca4jThnLUtMecoPLl', height: 194 },
];
function FacebookReviewEmbed({ url, height }: { url: string; height: number }) {
  const src = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`;
  return (
    // Ancho fijo de 500px (igual al que Facebook usó para calcular `height`)
    // — si el iframe se estira a un ancho distinto, el texto se reacomoda y
    // la altura fija queda corta, cortando contenido. Por eso NO usar 100%.
    <div className="fb-review-embed" style={{ height }}>
      <iframe
        src={src}
        title={`Facebook review ${url}`}
        width="500"
        height={height}
        style={{ border: 'none', width: 500, height }}
        scrolling="no"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      />
    </div>
  );
}

const KC_PACKAGES_BASE = [
  { id: 'starter', name: 'Starter', kc: 800,   price_soles: 10.40,  image: '/800-kc.png',   color: '#3b82f6', glow: '#3b82f625', tag: null,   tagIcon: null },
  { id: 'gamer',   name: 'Gamer',   kc: 2400,  price_soles: 31.20,  image: '/2400-kc.png',  color: '#8b5cf6', glow: '#8b5cf625', tag: 'pop',  tagIcon: 'star' },
  { id: 'pro',     name: 'Pro',     kc: 4500,  price_soles: 58.50,  image: '/4500-kc.png',  color: '#f59e0b', glow: '#f59e0b25', tag: 'sell', tagIcon: 'fire' },
  { id: 'legend',  name: 'Legend',  kc: 12500, price_soles: 162.50, image: '/12500-kc.png', color: '#ec4899', glow: '#ec489925', tag: 'prem', tagIcon: 'crown' },
];

function useRotatingWord(words: string[]) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase('out');
      setTimeout(() => {
        setIndex(i => (i + 1) % words.length);
        setPhase('in');
      }, 380);
    }, 2500);
    return () => clearInterval(id);
  }, [words.length]);

  return { word: words[index], phase, ref };
}

export default function Landing() {
  const { t, lang } = useLang();
  const { customer } = useAuth();
  const { currency: refCurrency, rates: refRates } = useCurrency();
  const isLogged = !!customer;
  const words = t('land.words').split(',');
  const { word, phase, ref } = useRotatingWord(words);
  const fbTickerRef = useRef<HTMLDivElement>(null);
  const [fbTickerPaused, setFbTickerPaused] = useState(false);

  // Fila horizontal de reseñas de Facebook — avanza sola hacia la izquierda
  // cada pocos segundos y da la vuelta al llegar al final, mostrando las 40
  // sin cargarlas todas visibles a la vez (loading="lazy" + fuera de vista).
  useEffect(() => {
    if (FACEBOOK_REVIEWS.length === 0) return;
    const id = setInterval(() => {
      const el = fbTickerRef.current;
      if (!el || fbTickerPaused) return;
      const cardStep = 518; // 500px de tarjeta + 18px de gap
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 5) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: cardStep, behavior: 'smooth' });
      }
    }, 3500);
    return () => clearInterval(id);
  }, [fbTickerPaused]);

  const tagLabels: Record<string, string> = {
    pop:  lang === 'es' ? 'Más Popular' : 'Most Popular',
    sell: lang === 'es' ? 'Más Vendido' : 'Best Seller',
    prem: 'Premium',
  };

  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b);

  const socialLinks = [
    { label: 'WhatsApp', href: 'https://wa.me/51983454837', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> },
    { label: 'Facebook',  href: 'https://www.facebook.com/kidstore.gg/', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { label: 'Instagram', href: 'https://www.instagram.com/kidstore.peru/', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
    { label: 'Discord',   href: 'https://discord.gg/kidstore', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
    { label: 'TikTok',    href: 'https://www.tiktok.com/@kidstore.peru', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-6.13 6.3 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.17a8.2 8.2 0 0 0 4.79 1.52V7.25a4.85 4.85 0 0 1-1.02-.56z"/></svg> },
  ];

  return (
    <div className="lv7">
      <section className="lv7-hero">
        <div className="lv7-hero-left">
          <div className="lv7-season">
            <span className="lv7-dot" />
            {t('land.season')}
            <span className="lv7-sep">·</span>
            <span className="lv7-sname">{t('land.season.name')}</span>
          </div>

          <div className="lv7-eyebrow"><Star size={12} fill="currentColor" />{t('land.eyebrow')}</div>

          <h1 className="lv7-title">
            {t('land.title.1')}
            <div className="lv7-word-row">
              <span className="lv7-word-sizer" aria-hidden="true">{longestWord}</span>
              <span ref={ref} className={`lv7-word lv7-word-${phase}`} aria-live="polite">{word}</span>
            </div>
            <span className="lv7-title-sub">{t('land.title.sub')}</span>
          </h1>

          <p className="lv7-desc">{t('land.desc')}</p>

          <div className="lv7-btns">
            <Link to="/store" className="lv7-btn-primary">{t('land.btn.store')} <ArrowRight size={17} /></Link>
            {isLogged
              ? <Link to="/dashboard" className="lv7-btn-ghost">{lang === 'es' ? 'Mi Dashboard' : 'My Dashboard'}</Link>
              : <Link to="/register" className="lv7-btn-ghost">{t('land.btn.account')}</Link>
            }
          </div>

          <div className="lv7-checks">
            <span><ShieldCheck size={13} />{t('land.check.pay')}</span>
            <span><Zap size={13} />{t('land.check.fast')}</span>
            <span><Clock size={13} />{t('land.check.days')}</span>
          </div>
        </div>

        <div className="lv7-hero-right">
          <img src="/sung.png" alt="Fortnite" className="lv7-hero-img" />
          <div className="lv7-img-stat lv7-is1"><strong>200+</strong><span>{lang === 'es' ? 'Items hoy' : 'Items today'}</span></div>
          <div className="lv7-img-stat lv7-is2"><strong>48h</strong><span>{lang === 'es' ? 'Entrega máx.' : 'Max delivery'}</span></div>
        </div>
      </section>

      <section className="lv7-sec lv7-sec-steps">
        <div className="lv7-inner">
          <div className="lv7-head">
            <span className="lv7-tag">{t('land.how.tag')}</span>
            <h2>{t('land.how.title')}</h2>
            <p>{t('land.how.sub')}</p>
          </div>
          <div className="lv7-steps">
            {[
              { n:'01', icon:<ShieldCheck size={24}/>, c:'#3b82f6', ti:t('land.step1.title'), td:t('land.step1.desc') },
              { n:'02', icon:<Zap size={24}/>,         c:'#8b5cf6', ti:t('land.step2.title'), td:t('land.step2.desc') },
              { n:'03', icon:<Clock size={24}/>,       c:'#f59e0b', ti:t('land.step3.title'), td:t('land.step3.desc') },
            ].map(s => (
              <div className="lv7-step" key={s.n}>
                <div className="lv7-step-n" style={{color:s.c}}>{s.n}</div>
                <div className="lv7-step-ico" style={{background:s.c+'18',color:s.c}}>{s.icon}</div>
                <h3>{s.ti}</h3><p>{s.td}</p>
                <div className="lv7-step-bar" style={{background:s.c}} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lv7-sec lv7-sec-pkg">
        <div className="lv7-inner">
          <div className="lv7-head">
            <span className="lv7-tag">{t('land.pkg.tag')}</span>
            <h2>{t('land.pkg.title')}</h2>
            <p>{t('land.pkg.sub')}</p>
          </div>
          <div className="lv7-packages">
            {KC_PACKAGES_BASE.map(pkg => (
              <div key={pkg.id} className={`lv7-pkg ${pkg.tag ? 'featured' : ''}`}
                style={{ '--pc': pkg.color, '--pg': pkg.glow } as React.CSSProperties}>
                {pkg.tag && (
                  <div className="lv7-pkg-tag">
                    {pkg.tagIcon === 'star'  && <IconStar />}
                    {pkg.tagIcon === 'fire'  && <IconFire />}
                    {pkg.tagIcon === 'crown' && <IconCrown />}
                    {tagLabels[pkg.tag]}
                  </div>
                )}
                <div className="lv7-pkg-img">
                  <img src={pkg.image} alt={`${pkg.kc} KC`}
                    onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                </div>
                <div className="lv7-pkg-body">
                  <div className="lv7-pkg-name">{pkg.name}</div>
                  <div className="lv7-pkg-kc">{pkg.kc.toLocaleString()} <span>KC</span></div>
                  <div className="lv7-pkg-prices">
                    <strong>{formatReferencePrice(pkg.price_soles, refCurrency, refRates)}</strong>
                  </div>
                  <Link to="/recharge" className="lv7-pkg-btn">
                    {t('land.pkg.btn')} <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="lv7-pay">
            <p className="lv7-pay-title">{t('land.pay.title')}</p>
            <div className="lv7-pay-wrap">
              <div className="lv7-pay-track">
                {[...PAYMENT_METHODS, ...PAYMENT_METHODS, ...PAYMENT_METHODS].map((pm, i) => (
                  <div className="lv7-pay-item" key={i}>
                    <img src={pm.logo} alt={pm.name}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span>{pm.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lv7-sec lv7-sec-trust">
        <div className="lv7-inner">
          <div className="lv7-trust-grid">
            {[
              { icon:<ShieldCheck size={26}/>, c:'#22c55e', ti:t('land.trust.pay'),  td:t('land.trust.pay.d') },
              { icon:<Zap size={26}/>,         c:'#f59e0b', ti:t('land.trust.fast'), td:t('land.trust.fast.d') },
              { icon:<Package size={26}/>,     c:'#3b82f6', ti:t('land.trust.off'),  td:t('land.trust.off.d') },
              { icon:<Headphones size={26}/>,  c:'#8b5cf6', ti:t('land.trust.sup'),  td:t('land.trust.sup.d') },
            ].map(tr => (
              <div className="lv7-trust-card" key={tr.ti}>
                <div className="lv7-trust-ico" style={{color:tr.c, background:tr.c+'15'}}>{tr.icon}</div>
                <strong>{tr.ti}</strong>
                <p>{tr.td}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(FACEBOOK_REVIEWS.length > 0 || TESTIMONIALS.length > 0) && (
        <section className="lv7-sec lv7-sec-reviews">
          <div className="lv7-inner">
            <div className="lv7-head">
              <span className="lv7-tag">{t('land.reviews.tag')}</span>
              <h2>{t('land.reviews.title')}</h2>
              <p>{t('land.reviews.sub')}</p>
            </div>

            {/* Reseñas de Facebook — widget oficial, fila horizontal con auto-scroll */}
            {FACEBOOK_REVIEWS.length > 0 && (
              <div
                className="lv7-fb-ticker"
                onMouseEnter={() => setFbTickerPaused(true)}
                onMouseLeave={() => setFbTickerPaused(false)}
              >
                <div className="lv7-fb-ticker-track" ref={fbTickerRef}>
                  {FACEBOOK_REVIEWS.map(rv => (
                    <FacebookReviewEmbed key={rv.url} url={rv.url} height={rv.height} />
                  ))}
                </div>
              </div>
            )}

            {/* Testimonios de texto curados a mano (otras fuentes) */}
            {TESTIMONIALS.length > 0 && (
              <div className="lv7-reviews-grid" style={{ marginTop: FACEBOOK_REVIEWS.length > 0 ? 24 : 0 }}>
                {TESTIMONIALS.map((rv, i) => (
                  <div className="lv7-review-card" key={i}>
                    <div className="lv7-review-stars">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <span key={s} style={{ opacity: s < rv.rating ? 1 : 0.25 }}><IconStar /></span>
                      ))}
                    </div>
                    <p className="lv7-review-text">"{lang === 'es' ? rv.text_es : rv.text_en}"</p>
                    <div className="lv7-review-foot">
                      <span className="lv7-review-name">{rv.name}</span>
                      <span className="lv7-review-source" style={{ color: SOURCE_COLOR[rv.source], background: SOURCE_COLOR[rv.source] + '18' }}>{rv.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="lv7-footer">
        <div className="lv7-footer-inner">
          <div className="lv7-footer-brand">
            <img src="/logotipo.png" alt="KidStorePeru" className="lv7-footer-logo" />
            <p>{t('land.foot.desc')}</p>
            <div className="lv7-footer-hours">
              <span className="lv7-hours-dot"/>
              <span><strong>{lang === 'es' ? 'Atención:' : 'Hours:'}</strong> {t('land.foot.hours')}</span>
            </div>
            <div className="lv7-socials">
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} className="lv7-social" aria-label={s.label}>{s.svg}</a>
              ))}
            </div>
          </div>

          <div className="lv7-footer-links">
            <div className="lv7-fcol">
              <strong>{t('land.foot.shop')}</strong>
              <Link to="/store">{t('land.foot.items')}</Link>
              <Link to="/recharge">{t('land.foot.rech')}</Link>
              <Link to="/bots">{t('land.foot.bots')}</Link>
            </div>
            <div className="lv7-fcol">
              <strong>{t('land.foot.acc')}</strong>
              <Link to="/register">{t('land.foot.reg')}</Link>
              <Link to="/login">{t('land.foot.login')}</Link>
              <Link to="/dashboard">{t('land.foot.panel')}</Link>
            </div>
            <div className="lv7-fcol">
              <strong>{t('land.foot.support')}</strong>
              <Link to="/faq">{t('land.foot.faq')}</Link>
              <Link to="/contact">{t('land.foot.contact')}</Link>
            </div>
            <div className="lv7-fcol">
              <strong>Legal</strong>
              <Link to="/terms">{t('land.foot.terms')}</Link>
              <Link to="/privacy">{t('land.foot.priv')}</Link>
              <Link to="/refunds">{t('land.foot.refunds')}</Link>
            </div>
          </div>
        </div>
        <div className="lv7-footer-bottom">
          <span>© {new Date().getFullYear()} KidStorePeru — {t('land.foot.rights')}</span>
          <span>{t('land.foot.epic')}</span>
        </div>
      </footer>
    </div>
  );
}
