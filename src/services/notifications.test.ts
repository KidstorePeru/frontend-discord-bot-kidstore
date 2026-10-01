import { describe, expect, it } from 'vitest';
import { describeNotification, timeAgo } from './notifications';
import type { AppNotification } from './api';

const base = { id: 'n1', read: false, created_at: '2026-10-01T12:00:00Z' };
const n = (kind: string, data: AppNotification['data']): AppNotification => ({ ...base, kind, data });

describe('describeNotification', () => {
  it('objeto de la lista de deseos que volvió (ES y EN)', () => {
    const notif = n('wishlist_back', { name: 'Rata radiactiva', price_kc: 1200, out_date: '2026-10-04T23:59:59Z', image: 'https://x/a.png' });
    const es = describeNotification(notif, true);
    expect(es.title).toBe('Volvió a la tienda: Rata radiactiva');
    expect(es.sub).toMatch(/^1[.,]?200 KC · hasta el 4/);
    expect(es.to).toBe('/store');
    expect(es.image).toBe('https://x/a.png');
    expect(describeNotification(notif, false).title).toBe('Back in the shop: Rata radiactiva');
  });

  it('pedidos y recargas llevan a su pestaña de "Mis pedidos"', () => {
    expect(describeNotification(n('order_sent', { item_name: 'Lote' }), true)).toMatchObject({ title: 'Pedido entregado: Lote', to: '/dashboard/orders', icon: 'gift' });
    expect(describeNotification(n('order_failed', { item_name: 'Lote', price_kc: 500, refunded: true }), true).sub).toBe('Te devolvimos 500 KC a tu saldo.');
    expect(describeNotification(n('order_failed', { item_name: 'Lote', refunded: false }), false).sub).toMatch(/won't be charged twice/);
    const kc = describeNotification(n('kc_credited', { amount_kc: 2400, method: 'yape' }), true);
    expect(kc).toMatchObject({ to: '/dashboard/recharges', icon: 'coin', sub: 'Yape' });
    expect(kc.title).toMatch(/^Recarga acreditada: \+2[.,]?400 KC$/);
  });

  it('comprobante rechazado: muestra el motivo y lleva a Recargar', () => {
    const v = describeNotification(n('manual_payment_rejected', { amount_kc: 2400, reason: 'El monto no coincide' }), true);
    expect(v.title).toMatch(/^Comprobante rechazado: 2[.,]?400 KC$/);
    expect(v).toMatchObject({ sub: 'Motivo: El monto no coincide', to: '/recharge', icon: 'alert' });
    expect(describeNotification(n('manual_payment_rejected', { amount_kc: 800, reason: 'x' }), false).title).toBe('Receipt rejected: 800 KC');
  });

  it('un tipo desconocido no rompe nada', () => {
    expect(describeNotification(n('otro', {}), true).title).toBe('Nueva notificación');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  it('minutos, horas, ayer y fecha', () => {
    expect(timeAgo('2026-10-01T11:59:50Z', true, now)).toBe('Ahora');
    expect(timeAgo('2026-10-01T11:55:00Z', true, now)).toBe('Hace 5 min');
    expect(timeAgo('2026-10-01T09:00:00Z', false, now)).toBe('3 h ago');
    expect(timeAgo('2026-09-30T10:00:00Z', true, now)).toBe('Ayer');
    expect(timeAgo('fecha-mala', true, now)).toBe('');
  });
});
