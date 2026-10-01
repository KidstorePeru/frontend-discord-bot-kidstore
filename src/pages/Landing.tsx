import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatReferencePrice } from '../services/constants';
import { ArrowRight, ChevronRight, ChevronDown, ShieldCheck, Zap, Clock, Star, Wallet, BadgeCheck, RotateCcw } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import Footer from '../components/Footer';
import { isSeasonCurrent } from '../services/season';
import { getPublicReviews, getStoreStats, type PublicReview, type StoreStats } from '../services/api';

function IconStar()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>; }
function IconFire()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-4.4 0-8-3.6-8-8 0-3.5 2.3-6.5 5.5-7.6-.3 1-.2 2.1.4 3 .3.5.8.9 1.3 1.1C10.1 9.4 10 7 10.8 5c.8-2 2.4-3.5 4.2-4.5-.3 1.6.1 3.3 1.2 4.5.7.8 1.5 1.3 2.5 1.6-1 1.2-1.7 2.7-1.7 4.4 0 3.3 2 4.5 2 7C19 19.4 15.4 23 12 23z"/></svg>; }
function IconCrown() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 19h18v2H3v-2zM2 7l4 8h12l4-8-5 3-5-8-5 8-5-3z"/></svg>; }

// Refleja los métodos reales de /recharge: pasarelas automáticas primero,
// luego los manuales. Binance ya no es un método manual (ver Recharge.tsx) —
// la cripto ahora es parte del pago automático internacional (dLocal Go
// cubre tarjetas internacionales, NOWPayments cubre USDT/USDC y otras cripto).
const PAYMENT_METHODS = [
  { name: 'MercadoPago', logo: '/mercadopago.png' },
  { name: 'PayPal',      logo: '/paypal-imagotipo.png' },
  { name: 'Tarjetas',    logo: '/tarjetas.png' },
  { name: 'USDT',        logo: '/usdt.png' },
  { name: 'USDC',        logo: '/usdc.png' },
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

// Acordeón de preguntas frecuentes para la portada — una versión corta de
// /faq, con las 5 dudas más comunes antes de la primera compra.
function LandingFAQ({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="lv7-faq">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div className={`lv7-faq-item ${isOpen ? 'open' : ''}`} key={i}>
            <button
              className="lv7-faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{it.q}</span>
              <ChevronDown size={18} className="lv7-faq-chev" />
            </button>
            {isOpen && (
              <div className="lv7-faq-a">
                <p>{it.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Landing() {
  const { t, lang } = useLang();
  useSEO({
    title: lang === 'es' ? 'Inicio' : 'Home',
    description: lang === 'es'
      ? 'Compra skins, packs y V-Bucks de Fortnite con KidCoins. Entrega automática, pagos con Yape, Plin, MercadoPago, PayPal y más.'
      : 'Buy Fortnite skins, packs and V-Bucks with KidCoins. Automatic delivery, pay with Yape, Plin, MercadoPago, PayPal and more.',
    path: '/',
  });
  const { customer } = useAuth();
  const { currency: refCurrency, rates: refRates } = useCurrency();
  const isLogged = !!customer;

  // Cifras reales (pedidos entregados, ofertas de hoy) y reseñas verificadas.
  // Mientras cargan, o si fallan, se muestran los textos fijos de siempre.
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [verified, setVerified] = useState<{ reviews: PublicReview[]; summary: { average: number; count: number } } | null>(null);
  useEffect(() => {
    getStoreStats().then(setStats).catch(() => {});
    getPublicReviews().then(setVerified).catch(() => {});
  }, []);
  const statNf = new Intl.NumberFormat('es-PE');
  const ordersStat = stats && stats.orders_delivered > 0
    ? `+${statNf.format(Math.floor(stats.orders_delivered / 100) * 100)}`
    : t('land.stats.orders');
  const itemsToday = stats?.shop_items_today ?? 0;
  const verifiedReviews = verified?.reviews ?? [];
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

  return (
    <div className="lv7">
      <section className="lv7-hero">
        <div className="lv7-hero-left">
          {isSeasonCurrent() && (
            <div className="lv7-season">
              <span className="lv7-dot" />
              {t('land.season')}
              <span className="lv7-sep">·</span>
              <span className="lv7-sname">{t('land.season.name')}</span>
            </div>
          )}

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

          <div className="lv7-value">
            <Wallet size={15} />
            <span>{t('land.hero.value')}</span>
          </div>

          <div className="lv7-btns">
            <Link to="/store" className="lv7-btn-primary">{t('land.btn.store')} <ArrowRight size={17} /></Link>
            {isLogged
              ? <Link to="/dashboard" className="lv7-btn-ghost">{t('nav.orders')}</Link>
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
          <div className="lv7-img-stat lv7-is1"><strong>{itemsToday > 0 ? statNf.format(itemsToday) : '200+'}</strong><span>{lang === 'es' ? 'Objetos hoy' : 'Items today'}</span></div>
          <div className="lv7-img-stat lv7-is2"><strong>48h</strong><span>{lang === 'es' ? 'Entrega máx.' : 'Max delivery'}</span></div>
        </div>
      </section>

      <section className="lv7-stats" aria-label={lang === 'es' ? 'En números' : 'By the numbers'}>
        <div className="lv7-stats-inner">
          <div className="lv7-stat">
            <strong>{ordersStat}</strong>
            <span>{t('land.stats.orders.l')}</span>
          </div>
          <div className="lv7-stat">
            <strong className="lv7-stat-rating">{t('land.stats.rating')} <Star size={16} fill="currentColor" /></strong>
            <span>{t('land.stats.rating.l')}</span>
          </div>
          <div className="lv7-stat">
            <strong>{t('land.stats.since')}</strong>
            <span>{t('land.stats.since.l')}</span>
          </div>
          <div className="lv7-stat">
            <strong>{itemsToday > 0 ? statNf.format(itemsToday) : t('land.stats.items')}</strong>
            <span>{itemsToday > 0 ? t('land.stats.today.l') : t('land.stats.items.l')}</span>
          </div>
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
          <div className="lv7-note">
            <Clock size={16} />
            <p>{t('land.step1.note')}</p>
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
                  <div className="lv7-pkg-kc">{pkg.kc.toLocaleString('es-PE')} <span>KC</span></div>
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
          <p className="lv7-pkg-note">{t('land.pkg.note')}</p>
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
          <div className="lv7-head">
            <span className="lv7-tag">{t('land.why.tag')}</span>
            <h2>{t('land.why.title')}</h2>
            <p>{t('land.why.sub')}</p>
          </div>
          <div className="lv7-trust-grid">
            {[
              { icon:<Wallet size={26}/>,      c:'#22c55e', ti:t('land.why.price'), td:t('land.why.price.d') },
              { icon:<Zap size={26}/>,         c:'#f59e0b', ti:t('land.why.pay'),   td:t('land.why.pay.d') },
              { icon:<BadgeCheck size={26}/>,  c:'#3b82f6', ti:t('land.why.off'),   td:t('land.why.off.d') },
              { icon:<RotateCcw size={26}/>,   c:'#8b5cf6', ti:t('land.why.safe'),  td:t('land.why.safe.d') },
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

      {(FACEBOOK_REVIEWS.length > 0 || TESTIMONIALS.length > 0 || verifiedReviews.length > 0) && (
        <section className="lv7-sec lv7-sec-reviews">
          <div className="lv7-inner">
            <div className="lv7-head">
              <span className="lv7-tag">{t('land.reviews.tag')}</span>
              <h2>{t('land.reviews.title')}</h2>
              <p>{t('land.reviews.sub')}</p>
            </div>

            {/* Reseñas verificadas: de clientes con un pedido entregado en la web, aprobadas por el admin */}
            {verifiedReviews.length > 0 && verified && (
              <div className="lv7-verified">
                <div className="lv7-verified-summary">
                  <span className="lv7-verified-avg"><Star size={18} fill="currentColor" /> {verified.summary.average.toFixed(1)}</span>
                  <span>
                    {lang === 'es'
                      ? `${verified.summary.count} ${verified.summary.count === 1 ? 'reseña' : 'reseñas'} de compras verificadas en esta web`
                      : `${verified.summary.count} ${verified.summary.count === 1 ? 'review' : 'reviews'} from verified purchases on this site`}
                  </span>
                </div>
                <div className="lv7-reviews-grid">
                  {verifiedReviews.map((rv, i) => (
                    <div className="lv7-review-card" key={i}>
                      <div className="lv7-review-stars" aria-label={`${rv.rating} / 5`}>
                        {Array.from({ length: 5 }).map((_, s) => (
                          <span key={s} style={{ opacity: s < rv.rating ? 1 : 0.25 }}><IconStar /></span>
                        ))}
                      </div>
                      {rv.comment && <p className="lv7-review-text">"{rv.comment}"</p>}
                      <div className="lv7-review-item">
                        {rv.item_image && <img src={rv.item_image} alt="" loading="lazy" />}
                        <span>{rv.item_name}</span>
                      </div>
                      {rv.reply && (
                        <p className="lv7-review-reply"><strong>{lang === 'es' ? 'Respuesta de KidStorePeru:' : 'KidStorePeru replied:'}</strong> {rv.reply}</p>
                      )}
                      <div className="lv7-review-foot">
                        <span className="lv7-review-name">{rv.display_name}</span>
                        <span className="lv7-review-verified"><BadgeCheck size={13} /> {lang === 'es' ? 'Compra verificada' : 'Verified purchase'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      <section className="lv7-sec lv7-sec-faq">
        <div className="lv7-inner lv7-inner-narrow">
          <div className="lv7-head">
            <span className="lv7-tag">{t('land.faq.tag')}</span>
            <h2>{t('land.faq.title')}</h2>
            <p>{t('land.faq.sub')}</p>
          </div>
          <LandingFAQ
            items={[
              { q: t('land.faq.q1'), a: t('land.faq.a1') },
              { q: t('land.faq.q2'), a: t('land.faq.a2') },
              { q: t('land.faq.q3'), a: t('land.faq.a3') },
              { q: t('land.faq.q4'), a: t('land.faq.a4') },
              { q: t('land.faq.q5'), a: t('land.faq.a5') },
            ]}
          />
          <Link to="/faq" className="lv7-faq-more">{t('land.faq.more')} <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="lv7-cta">
        <div className="lv7-cta-inner">
          <h2>{t('land.cta.title')}</h2>
          <p>{t('land.cta.sub')}</p>
          <div className="lv7-btns">
            <Link to="/store" className="lv7-btn-primary">{t('land.btn.store')} <ArrowRight size={17} /></Link>
            {isLogged
              ? <Link to="/dashboard" className="lv7-btn-ghost lv7-btn-ghost-onaccent">{t('nav.orders')}</Link>
              : <Link to="/register" className="lv7-btn-ghost lv7-btn-ghost-onaccent">{t('land.btn.account')}</Link>
            }
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
