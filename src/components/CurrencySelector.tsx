import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useLang } from '../context/LangContext';
import { SUPPORTED_CURRENCIES, type CurrencyRegion } from '../services/geo';
import { ChevronDown, Search } from 'lucide-react';

/** Nombre legible de una divisa ISO 4217 usando Intl — sin mantener una
 *  tabla propia de nombres a mano. */
function currencyName(code: string, lang: string): string {
  try {
    const dn = new Intl.DisplayNames([lang === 'es' ? 'es' : 'en'], { type: 'currency' });
    return dn.of(code) || code;
  } catch {
    return code;
  }
}

const REGION_LABEL: Record<CurrencyRegion, { es: string; en: string }> = {
  latam: { es: 'Latinoamérica', en: 'Latin America' },
  na:    { es: 'Norteamérica',  en: 'North America' },
  eu:    { es: 'Europa',        en: 'Europe' },
};

export default function CurrencySelector() {
  const { currency, setCurrency, rates } = useCurrency();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const availableCodes = Object.keys(rates.rates || {});
  const available = SUPPORTED_CURRENCIES.filter(c => c.code === 'PEN' || availableCodes.includes(c.code));

  const q = query.trim().toLowerCase();
  const matches = (code: string) =>
    !q || code.toLowerCase().includes(q) || currencyName(code, lang).toLowerCase().includes(q);
  const filtered = available.filter(c => matches(c.code));
  const noResults = filtered.length === 0;

  function pick(code: string) {
    setCurrency(code);
    setOpen(false);
    setQuery('');
  }

  let lastRegion: CurrencyRegion | null = null;

  return (
    <div className="currency-picker" ref={wrapRef}>
      <button type="button" className="currency-picker-btn" onClick={() => setOpen(v => !v)}>
        <span>{currency}</span>
        <ChevronDown size={13} className={`cp-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="currency-picker-panel">
          <div className="currency-picker-search">
            <Search size={13} />
            <input
              autoFocus
              placeholder={lang === 'es' ? 'Buscar divisa o país...' : 'Search currency or country...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="currency-picker-list">
            {noResults && (
              <div className="currency-picker-empty">{lang === 'es' ? 'Sin resultados' : 'No results'}</div>
            )}
            {filtered.map(c => {
              const showGroup = c.region !== lastRegion;
              lastRegion = c.region;
              return (
                <div key={c.code}>
                  {showGroup && (
                    <div className="currency-picker-group">
                      {lang === 'es' ? REGION_LABEL[c.region].es : REGION_LABEL[c.region].en}
                    </div>
                  )}
                  <button
                    type="button"
                    className={`currency-picker-item ${c.code === currency ? 'sel' : ''}`}
                    onClick={() => pick(c.code)}
                  >
                    <span className="cpi-code">{c.code}</span>
                    <span className="cpi-name">{currencyName(c.code, lang)}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
