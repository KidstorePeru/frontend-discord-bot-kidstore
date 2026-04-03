import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { ArrowRight, ChevronRight, ShieldCheck, Zap, Clock, Package, Headphones, Star } from 'lucide-react';

function IconStar()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>; }
function IconFire()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-4.4 0-8-3.6-8-8 0-3.5 2.3-6.5 5.5-7.6-.3 1-.2 2.1.4 3 .3.5.8.9 1.3 1.1C10.1 9.4 10 7 10.8 5c.8-2 2.4-3.5 4.2-4.5-.3 1.6.1 3.3 1.2 4.5.7.8 1.5 1.3 2.5 1.6-1 1.2-1.7 2.7-1.7 4.4 0 3.3 2 4.5 2 7C19 19.4 15.4 23 12 23z"/></svg>; }
function IconCrown() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 19h18v2H3v-2zM2 7l4 8h12l4-8-5 3-5-8-5 8-5-3z"/></svg>; }

const PAYMENT_METHODS = [
  { name: 'Yape',      logo: '/yape-imagotipo.png' },
  { name: 'Plin',      logo: '/plin-imagotipo.png' },
  { name: 'BCP',       logo: '/bcp-imagotipo.png' },
  { name: 'Interbank', logo: '/interbank-imagotipo.png' },
  { name: 'BBVA',      logo: '/bbva-imagotipo.png' },
  { name: 'PayPal',    logo: '/paypal-imagotipo.png' },
  { name: 'Binance',   logo: '/binance-imagotipo.png' },
];

const KC_PACKAGES_BASE = [
  { id: 'starter', name: 'Starter', kc: 800,   price_soles: 12.8,  image: '/800-kc.png',   color: '#3b82f6', glow: '#3b82f625', tag: null,   tagIcon: null },
  { id: 'gamer',   name: 'Gamer',   kc: 2400,  price_soles: 38.4,  image: '/2400-kc.png',  color: '#8b5cf6', glow: '#8b5cf625', tag: 'pop',  tagIcon: 'star' },
  { id: 'pro',     name: 'Pro',     kc: 4800,  price_soles: 76.8,  image: '/4800-kc.png',  color: '#f59e0b', glow: '#f59e0b25', tag: 'sell', tagIcon: 'fire' },
  { id: 'legend',  name: 'Legend',  kc: 12500, price_soles: 200.0, image: '/12500-kc.png', color: '#ec4899', glow: '#ec489925', tag: 'prem', tagIcon: 'crown' },
];

import { getExchangeRates } from '../services/api';

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
  const words = t('land.words').split(',');
  const { word, phase, ref } = useRotatingWord(words);

  // Tasas de cambio dinámicas
  const [usdRate, setUsdRate] = useState<number>(0.27);
  const [eurRate, setEurRate] = useState<number>(0.25);

  useEffect(() => {
    getExchangeRates()
      .then(data => {
        if (data.USD) setUsdRate(data.USD);
        if (data.EUR) setEurRate(data.EUR);
      })
      .catch(() => {}); // Usar valores por defecto si falla
  }, []);

  // Calcular precios con tasas actuales
  const KC_PACKAGES = KC_PACKAGES_BASE.map(pkg => ({
    ...pkg,
    price_usd: Math.round(pkg.price_soles * usdRate * 100) / 100,
    price_eur: Math.round(pkg.price_soles * eurRate * 100) / 100,
  }));

  const tagLabels: Record<string, string> = {
    pop:  lang === 'es' ? 'Más Popular' : 'Most Popular',
    sell: lang === 'es' ? 'Más Vendido' : 'Best Seller',
    prem: 'Premium',
  };

  const longestWord = words.reduce((a, b) => a.length > b.length ? a : b);

  const socialLinks = [
    { label: 'WhatsApp', href: '#', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> },
    { label: 'Facebook',  href: '#', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { label: 'Instagram', href: '#', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
    { label: 'Discord',   href: '#', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
    { label: 'TikTok',    href: '#', svg: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-6.13 6.3 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.17a8.2 8.2 0 0 0 4.79 1.52V7.25a4.85 4.85 0 0 1-1.02-.56z"/></svg> },
  ];

  return (
    <div className="lv7">
      <section className="lv7-hero">
        <div className="lv7-hero-left">
          <div className="lv7-float lv7-f1"><img src="/kidcoin.png" alt="" /></div>
          <div className="lv7-float lv7-f2">
            <div className="lv7-float-card">
              <span className="lv7-fc-kc">+800 KC</span>
              <span className="lv7-fc-lbl">Starter</span>
            </div>
          </div>
          <div className="lv7-float lv7-f3">
            <div className="lv7-float-badge"><ShieldCheck size={13} />{t('land.check.pay')}</div>
          </div>

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
            <Link to="/register" className="lv7-btn-ghost">{t('land.btn.account')}</Link>
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
            {KC_PACKAGES.map(pkg => (
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
                    <strong>S/ {pkg.price_soles.toLocaleString()}</strong>
                    <span>${pkg.price_usd.toFixed(2)} · €{pkg.price_eur.toFixed(2)}</span>
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
                    <img src={pm.logo} alt={pm.name} />
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
