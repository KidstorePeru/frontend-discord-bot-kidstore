// frontend/src/services/constants.ts
import type { KCPackage } from '../types';
import type { ExchangeRates } from './useExchangeRates';
import { FALLBACK_RATES } from './useExchangeRates';

// ─────────────────────────────────────────────────────────────
// PAQUETES KC — el precio FIJO siempre es PEN
// USD y EUR se calculan dinámicamente con la API
// ─────────────────────────────────────────────────────────────
export const KC_PACKAGES: KCPackage[] = [
  { id: 'starter', name: 'Starter', kc: 800,   price_pen: 12.80,  price_usd: 0, price_eur: 0, emoji: '⚡', color: '#3b82f6' },
  { id: 'gamer',   name: 'Gamer',   kc: 2400,  price_pen: 38.40,  price_usd: 0, price_eur: 0, emoji: '🎮', color: '#8b5cf6', popular: true },
  { id: 'pro',     name: 'Pro',     kc: 4800,  price_pen: 76.80,  price_usd: 0, price_eur: 0, emoji: '🔥', color: '#f59e0b' },
  { id: 'legend',  name: 'Legend',  kc: 12500, price_pen: 200.00, price_usd: 0, price_eur: 0, emoji: '👑', color: '#f59e0b', premium: true },
];

// ─────────────────────────────────────────────────────────────
// COMISIONES
// ─────────────────────────────────────────────────────────────
export const COMMISSIONS = {
  binance: 0.01,   // 1%
  bizum:   0.015,  // 1.5%
};

// ─────────────────────────────────────────────────────────────
// CONVERSIÓN
// ─────────────────────────────────────────────────────────────

/** Precio base sin comisión en la moneda solicitada */
export function getPrice(
  pkg: KCPackage,
  currency: 'PEN' | 'USD' | 'EUR',
  rates: ExchangeRates = FALLBACK_RATES
): number {
  if (currency === 'PEN') return pkg.price_pen;
  if (currency === 'USD') return roundCents(pkg.price_pen * rates.USD);
  return roundCents(pkg.price_pen * rates.EUR);
}

// ─────────────────────────────────────────────────────────────
// COMISIÓN BINANCE  →  base_usd × (1 + 1%)
// ─────────────────────────────────────────────────────────────
export function binancePrice(
  price_pen: number,
  rates: ExchangeRates = FALLBACK_RATES
): number {
  return roundCents(price_pen * rates.USD * (1 + COMMISSIONS.binance));
}

// ─────────────────────────────────────────────────────────────
// COMISIÓN BIZUM  →  base_eur × (1 + 1.5%)
// ─────────────────────────────────────────────────────────────
export function bizumPrice(
  price_pen: number,
  rates: ExchangeRates = FALLBACK_RATES
): number {
  return roundCents(price_pen * rates.EUR * (1 + COMMISSIONS.bizum));
}

// ─────────────────────────────────────────────────────────────
// HELPERS — compatibilidad con código existente
// ─────────────────────────────────────────────────────────────
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function withCommission(base: number, rate: number): number {
  return Math.ceil(base * (1 + rate) * 100) / 100;
}

export function vbucksToKC(vbucks: number): number {
  return Math.ceil(vbucks * 0.5);
}

// ─────────────────────────────────────────────────────────────
// ESTADO DE ÓRDENES
// ─────────────────────────────────────────────────────────────
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',    color: 'var(--amber-500)' },
  processing: { label: 'Procesando',  color: 'var(--blue-500)'  },
  sent:       { label: 'Enviado',     color: 'var(--green-500)' },
  failed:     { label: 'Fallido',     color: 'var(--red-500)'   },
  refunded:   { label: 'Reembolsado', color: 'var(--gray-500)'  },
};

// ─────────────────────────────────────────────────────────────
// DATOS DE PAGO
// ⚠️ Reemplaza con tus datos reales antes de producción
// ─────────────────────────────────────────────────────────────
export const PAYMENT_INFO = {
  yape:      { number: '999-888-777',            raw: '999888777',           owner: 'KidStorePeru'        },
  plin:      { number: '999-888-777',            raw: '999888777',           owner: 'KidStorePeru'        },
  bcp:       { account: '191-00000000-0-00',     raw: '19100000000000',      owner: 'KidStorePeru S.A.C.' },
  interbank: { account: '200-00000000-0-00',     raw: '20000000000000',      owner: 'KidStorePeru S.A.C.' },
  bbva:      { account: '0011-0000-00000000-00', raw: '001100000000000000',  owner: 'KidStorePeru S.A.C.' },
  paypal:    { email: 'pagos@kidstoreperu.com' },
  binance:   { id: 'KidStorePeru', payId: '123456789' },
  bizum:     { number: '+34 600 000 000',        owner: 'KidStorePeru ES'   },
};