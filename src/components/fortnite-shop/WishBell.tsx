import { useWishlist, type WishTarget } from '../../context/WishlistContext';
import { BellIcon } from './Icons';
import type { ShopText } from './i18n';

/** Aviso para la página de la tienda (Store.tsx lo muestra como toast). */
export function shopToast(msg: string, type: 'success' | 'error' = 'success') {
  window.dispatchEvent(new CustomEvent('shop-toast', { detail: { msg, type } }));
}

// Campana «Avísame cuando vuelva» de cada tarjeta. Es su propio componente
// (suscrito a la lista de deseos) para que seguir un objeto no vuelva a
// dibujar todas las tarjetas de la tienda.
export default function WishBell({ wish, t }: { wish: WishTarget; t: ShopText }) {
  const { has, toggle, limit } = useWishlist();
  const on = has(wish.itemId);
  const label = on ? t.wishRemove(wish.name) : t.wishAdd(wish.name);

  const onClick = async () => {
    const result = await toggle(wish);
    if (result === 'login') window.dispatchEvent(new CustomEvent('show-login-modal', { detail: 'wish' }));
    else if (result === 'added') shopToast(t.wishAdded(wish.name));
    else if (result === 'removed') shopToast(t.wishRemoved(wish.name));
    else if (result === 'full') shopToast(t.wishFull(limit), 'error');
    else shopToast(t.wishError, 'error');
  };

  return (
    <button
      type="button"
      className={`fns-card__wish${on ? ' is-on' : ''}`}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
    >
      <BellIcon size={17} filled={on} />
    </button>
  );
}
