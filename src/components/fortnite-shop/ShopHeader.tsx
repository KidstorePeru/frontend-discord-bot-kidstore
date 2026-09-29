import { useState } from 'react';
import { ClockIcon, CloseIcon, InfoIcon, RefreshIcon, SearchIcon } from './Icons';
import { nextShopReset, useNow } from './hooks';
import { SHOP_LANGS, type ShopLangKey, type ShopText } from './i18n';
import Slanted from './Slanted';

const pad = (n: number) => String(n).padStart(2, '0');

// Contador hasta la rotación (00:00 UTC): horas, minutos y segundos en casillas
// de ancho fijo (los dígitos no "bailan" al cambiar), con su etiqueta debajo.
// En la última hora se pone en rojo; al llegar a cero muestra "Actualizando…"
// mientras la tienda se recarga sola (ver useShopData).
function Countdown({ t }: { t: ShopText }) {
  const now = useNow();
  const ms = nextShopReset(now) - now;
  const total = Math.max(0, Math.floor(ms / 1000));
  const parts: [number, string][] = [
    [Math.floor(total / 3600), t.units.h],
    [Math.floor((total % 3600) / 60), t.units.m],
    [total % 60, t.units.s],
  ];
  const urgent = total < 3600;
  return (
    <div
      className={`fns-countdown${urgent ? ' is-urgent' : ''}`}
      role="timer"
      aria-label={`${t.changesIn} ${parts.map(([v, u]) => `${v} ${u}`).join(' ')}`}
    >
      <span className="fns-countdown__label">
        <ClockIcon size={14} />
        <span>{t.changesIn}</span>
      </span>
      {total === 0 ? (
        <span className="fns-countdown__done">{t.refreshing}</span>
      ) : (
        <span className="fns-countdown__clock" aria-hidden="true">
          {parts.map(([v, unit], i) => (
            <span key={unit} className="fns-countdown__part">
              {i > 0 && <span className="fns-countdown__sep">:</span>}
              <span className="fns-countdown__seg">
                <b>{pad(v)}</b>
                <i>{unit}</i>
              </span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

// Encabezado centrado sobre el fondo de la tienda:
//   chip "en vivo" con los objetos disponibles → "TIENDA DE OBJETOS" → fecha y lotes
//   → panel con el contador, el buscador, el idioma y actualizar.
// El selector ES/EN cambia el idioma de TODA la web (no solo el catálogo) — es también el
// único selector de idioma visible en celular, donde el navbar lo oculta.
export default function ShopHeader({
  t,
  shopDate,
  itemCount,
  langKey,
  onLang,
  query,
  onQuery,
  onRefresh,
  loading,
}: {
  t: ShopText;
  shopDate: string | null;
  itemCount: number | null;
  langKey: ShopLangKey;
  onLang: (k: ShopLangKey) => void;
  query: string;
  onQuery: (q: string) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const [showInfo, setShowInfo] = useState(false);
  // `date` de la API es la medianoche UTC del día de la tienda: se formatea en UTC.
  const date = new Date(shopDate ?? Date.now()).toLocaleDateString(t.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <header className="fns-header">
      {itemCount !== null && (
        <p className="fns-header__eyebrow">
          <span className="fns-header__live" aria-hidden="true" />
          <span className="fns-sr-only">{t.live}: </span>
          {/* El texto va en su propio elemento: si no, cada palabra inclinada sería un
              elemento flex aparte y en celular no podría pasar a la línea siguiente. */}
          <span>
            <Slanted text={t.shopEyebrow(new Intl.NumberFormat(t.locale).format(itemCount))} />
          </span>
        </p>
      )}
      <h1 className="fns-header__title">
        <Slanted text={t.shopTitle} />
      </h1>

      <div className="fns-header__meta">
        <span>{date.charAt(0).toUpperCase() + date.slice(1)}</span>
        <button
          type="button"
          className={`fns-header__info${showInfo ? ' is-open' : ''}`}
          onClick={() => setShowInfo((v) => !v)}
          aria-expanded={showInfo}
        >
          <InfoIcon size={15} />
          {t.giftTitle}
        </button>
      </div>
      {showInfo && <p className="fns-header__note">{t.giftText}</p>}

      <div className="fns-deck">
        <Countdown t={t} />
        <div className="fns-tools">
          <label className="fns-search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.search}
              autoComplete="off"
            />
            {query && (
              <button type="button" className="fns-icon-button" onClick={() => onQuery('')} aria-label={t.close}>
                <CloseIcon size={16} />
              </button>
            )}
          </label>
          <div className="fns-lang" role="group" aria-label="Idioma / Language">
            {(Object.keys(SHOP_LANGS) as ShopLangKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={key === langKey ? 'is-active' : ''}
                aria-pressed={key === langKey}
                onClick={() => onLang(key)}
              >
                {SHOP_LANGS[key].label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`fns-icon-button fns-refresh${loading ? ' is-spinning' : ''}`}
            onClick={onRefresh}
            aria-label={t.refresh}
            title={t.refresh}
          >
            <RefreshIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
