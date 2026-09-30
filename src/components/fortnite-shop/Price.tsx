import { VBuckIcon } from './Icons';
import type { Offer } from './model';
import type { ShopText } from './i18n';

// Precio en monedas V como la tienda oficial y, al lado, lo que de verdad se
// cobra: KidCoins (la moneda de la tienda; los clientes compran KC con su divisa
// en Recargar y con KC pagan los objetos). Nunca un importe en PEN/USD/EUR.
export default function Price({
  price,
  t,
  kc,
  className = '',
}: {
  price: Offer['price'];
  t: ShopText;
  /** Precio en KidCoins ya formateado (p. ej. "1,000"). */
  kc?: string;
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
      {kc && (
        <span className="fns-price__kc">
          <span className="fns-sr-only">{t.kcPrice}</span>
          <img src="/kidcoin.png" alt="" className="fns-price__kc-icon" width={16} height={16} />
          {kc} KC
        </span>
      )}
    </div>
  );
}
