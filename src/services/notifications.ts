import type { AppNotification } from './api';
import { paymentMethodLabel } from './paymentMethods';

export interface NotificationView {
  title: string;
  sub: string;
  /** Adónde lleva al pulsarlo. */
  to: string;
  image: string | null;
  icon: 'bell' | 'gift' | 'alert' | 'coin';
}

const nf = new Intl.NumberFormat('es-PE');

function shortDate(iso: string | undefined, es: boolean): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // La tienda cambia a las 00:00 UTC: la fecha de salida se muestra en hora de
  // Lima (UTC-5), igual que en los correos.
  return d.toLocaleDateString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'short', timeZone: 'America/Lima' });
}

// Texto de cada aviso de la campana, en el idioma que el cliente esté usando
// (el backend guarda solo los datos).
export function describeNotification(n: AppNotification, es: boolean): NotificationView {
  const d = n.data ?? {};
  switch (n.kind) {
    case 'wishlist_back': {
      const until = shortDate(d.out_date, es);
      const price = d.price_kc != null ? `${nf.format(d.price_kc)} KC` : '';
      return {
        title: es ? `Volvió a la tienda: ${d.name ?? ''}` : `Back in the shop: ${d.name ?? ''}`,
        sub: [price, until ? (es ? `hasta el ${until}` : `until ${until}`) : ''].filter(Boolean).join(' · '),
        to: '/store',
        image: d.image || null,
        icon: 'bell',
      };
    }
    case 'order_sent':
      return {
        title: es ? `Pedido entregado: ${d.item_name ?? ''}` : `Order delivered: ${d.item_name ?? ''}`,
        sub: es ? 'Ya está en tu cuenta de Fortnite. ¿Qué tal te fue? Califícalo en Mis pedidos.' : "It's in your Fortnite account. How did it go? Rate it in My orders.",
        to: '/dashboard/orders',
        image: d.item_image || null,
        icon: 'gift',
      };
    case 'order_failed':
      return {
        title: es ? `No pudimos entregar: ${d.item_name ?? ''}` : `We couldn't deliver: ${d.item_name ?? ''}`,
        sub: d.refunded
          ? (es ? `Te devolvimos ${nf.format(d.price_kc ?? 0)} KC a tu saldo.` : `We returned ${nf.format(d.price_kc ?? 0)} KC to your balance.`)
          : (es ? 'Estamos revisando tu pedido; no se te cobra dos veces.' : "We're reviewing your order; you won't be charged twice."),
        to: '/dashboard/orders',
        image: d.item_image || null,
        icon: 'alert',
      };
    case 'kc_credited':
      return {
        title: es ? `Recarga acreditada: +${nf.format(d.amount_kc ?? 0)} KC` : `Recharge credited: +${nf.format(d.amount_kc ?? 0)} KC`,
        sub: paymentMethodLabel(d.method, es),
        to: '/dashboard/recharges',
        image: null,
        icon: 'coin',
      };
    default:
      return { title: es ? 'Nueva notificación' : 'New notification', sub: '', to: '/notifications', image: null, icon: 'bell' };
  }
}

// "Hace 5 min", "Hace 2 h", "Ayer", "3 oct." (y su versión en inglés).
export function timeAgo(iso: string, es: boolean, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return es ? 'Ahora' : 'Just now';
  if (mins < 60) return es ? `Hace ${mins} min` : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return es ? `Hace ${hours} h` : `${hours} h ago`;
  if (hours < 48) return es ? 'Ayer' : 'Yesterday';
  return new Date(t).toLocaleDateString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'short' });
}
