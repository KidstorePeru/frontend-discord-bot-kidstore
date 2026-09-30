import { VBuckIcon } from './Icons';
import type { Offer } from './model';
import type { ShopText } from './i18n';

// Precio en monedas V como la tienda oficial. Lo que de verdad se cobra (KidCoins)
// va en el botón de compra de la tarjeta (ver OfferCard).
export default function Price({
  price,
  t,
  className = '',
}: {
  price: Offer['price'];
  t: ShopText;
  className?: string;
}) {
  const discounted = price.regular > price.final;
  return (
    <div className={`fns-price ${className}`}>
      <span className="fns-sr-only">{discounted ? t.vbucksDiscount : t.vbucksPrice}</span>
      <span className="fns-price__current">
        <VBuckIcon className="fns-price__icon" />
        {price.formattedFinal}
      </span>
      {discounted && (
        <>
          <span className="fns-sr-only">{t.vbucksOriginal}</span>
          <s className="fns-price__original">{price.formattedRegular}</s>
        </>
      )}
    </div>
  );
}
