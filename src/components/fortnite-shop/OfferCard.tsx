import { memo, useRef, type CSSProperties } from 'react';
import CardMedia from './CardMedia';
import Price from './Price';
import WishBell from './WishBell';
import { CartIcon, CheckIcon, ClockIcon } from './Icons';
import { formatClock, useInView, useNow } from './hooks';
import type { Offer } from './model';
import type { ShopText } from './i18n';

// Tiempo que le queda al objeto en la tienda (DD:HH:MM:SS), visible sin abrir nada.
// Solo avanza cada segundo mientras la tarjeta está en pantalla.
function LeaveBadge({ outDate, label, live }: { outDate: string; label: string; live: boolean }) {
  const now = useNow(live);
  const ms = new Date(outDate).getTime() - now;
  if (!(ms > 0)) return null;
  const text = formatClock(ms);
  return (
    <div className={`fns-card__leave${ms < 3_600_000 ? ' is-urgent' : ''}`} title={`${label} ${text}`}>
      <ClockIcon size={12} />
      <span>{text}</span>
    </div>
  );
}

// Tarjeta con compra directa: el botón de carrito agrega el objeto (o lo quita si
// ya estaba), igual que la tienda anterior — sin modal de detalle intermedio.
function OfferCard({
  offer,
  t,
  formatKC,
  inCart,
  onToggleCart,
}: {
  offer: Offer;
  t: ShopText;
  /** Precio en KidCoins (lo que se cobra) a partir del precio en monedas V. */
  formatKC: (vbucks: number) => string;
  inCart: boolean;
  onToggleCart: (o: Offer) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const wide = offer.cols > 1;
  const kc = formatKC(offer.price.final);

  return (
    <div className={`fns-cell fns-cell--${offer.cols}`}>
      <article
        ref={ref}
        className={`fns-card fns-card--${offer.cols} fns-card--${offer.preset}${wide ? ' fns-card--wide' : ''}${inCart ? ' fns-card--in-cart' : ''}`}
        style={{ '--card-bg': offer.colors.gradient, '--card-text': offer.colors.text } as CSSProperties}
      >
        <div className="fns-card__bg" aria-hidden="true" />
        <CardMedia images={offer.images} preset={offer.preset} alt={offer.title} active={inView} />
        {offer.outDate && <LeaveBadge outDate={offer.outDate} label={t.leavesIn} live={inView} />}
        {offer.wish && <WishBell wish={offer.wish} t={t} />}
        {inCart && (
          <span className="fns-card__incart">
            <CheckIcon size={11} /> {t.inCart}
          </span>
        )}

        <div className="fns-card__content">
          <div className="fns-card__info">
            {offer.discountBanner && (
              <div className="fns-card__pill">
                <span>{offer.discountBanner}</span>
              </div>
            )}
            {offer.subtitle && <div className="fns-card__subtitle">{offer.subtitle}</div>}
            <h3 className="fns-card__title">{offer.title}</h3>
            <div className="fns-card__buy">
              <Price price={offer.price} t={t} />
              {/* El precio en KidCoins ES el botón de compra: lo que pagas al pulsarlo. */}
              <button
                type="button"
                className={`fns-card__cart${inCart ? ' is-in-cart' : ''}`}
                onClick={() => onToggleCart(offer)}
                aria-pressed={inCart}
                aria-label={inCart ? t.removeFromCart(offer.title, kc) : t.addToCart(offer.title, kc)}
                title={inCart ? t.removeFromCart(offer.title, kc) : t.addToCart(offer.title, kc)}
              >
                {inCart ? <CheckIcon size={18} /> : <CartIcon size={20} />}
                <span className="fns-card__cart-price">{kc} KC</span>
              </button>
            </div>
          </div>
          {/* Franja de características al pasar el ratón (estilos seleccionables, etc.). */}
          {offer.features.length > 0 && (
            <div className="fns-card__features" aria-hidden="true">
              <span>+ {offer.features.join(', ')}</span>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export default memo(OfferCard);
