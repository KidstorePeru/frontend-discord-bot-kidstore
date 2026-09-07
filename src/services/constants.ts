// frontend/src/services/constants.ts
import type { KCPackage } from '../types';
import type { ExchangeRates } from './useExchangeRates';
import { FALLBACK_RATES } from './useExchangeRates';

// ─────────────────────────────────────────────────────────────
// PAQUETES KC — el precio FIJO siempre es PEN
// USD y EUR se calculan dinámicamente con la API
// ─────────────────────────────────────────────────────────────
// Mismo precio para pago manual y automático — S/ 1.30 cada 100 KC (S/0.013/KC).
export const KC_PACKAGES: KCPackage[] = [
  { id: 'starter', name: 'Starter', kc: 800,   price_pen: 10.40,  price_pen_online: 10.40,  price_usd: 0, price_eur: 0, emoji: '⚡', color: '#3b82f6' },
  { id: 'gamer',   name: 'Gamer',   kc: 2400,  price_pen: 31.20,  price_pen_online: 31.20,  price_usd: 0, price_eur: 0, emoji: '🎮', color: '#8b5cf6', popular: true },
  { id: 'pro',     name: 'Pro',     kc: 4500,  price_pen: 58.50,  price_pen_online: 58.50,  price_usd: 0, price_eur: 0, emoji: '🔥', color: '#f59e0b' },
  { id: 'legend',  name: 'Legend',  kc: 12500, price_pen: 162.50, price_pen_online: 162.50, price_usd: 0, price_eur: 0, emoji: '👑', color: '#f59e0b', premium: true },
];

// KC price per unit — igual para pago manual y automático
export const KC_PRICE_PER_UNIT = 0.013;  // S/ 1.30 cada 100 KC

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
// PRECIO DE REFERENCIA EN CUALQUIER DIVISA (todas las que da la API)
// ─────────────────────────────────────────────────────────────

/** Convierte un monto en PEN a cualquier código ISO 4217 que tengamos en
 *  `rates`, o `null` si no tenemos esa divisa todavía (ej. sin
 *  EXCHANGE_RATE_API_KEY configurado en el backend, solo hay PEN/USD/EUR). */
export function convertFromPEN(
  amountPEN: number,
  currencyCode: string,
  rates: ExchangeRates = FALLBACK_RATES
): number | null {
  if (currencyCode === 'PEN') return amountPEN;
  const rate = rates.rates?.[currencyCode];
  if (!rate) return null;
  return roundCents(amountPEN * rate);
}

/** Formatea un monto con el símbolo/formato correcto de su divisa (usa Intl,
 *  soporta cualquier código ISO 4217 sin necesidad de mapear símbolos a mano). */
export function formatCurrency(amount: number, currencyCode: string, locale = 'es-PE'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, currencyDisplay: 'narrowSymbol' }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/** Convierte y formatea un monto PEN en la divisa pedida — si no tenemos el
 *  tipo de cambio de esa divisa, cae a mostrar el monto en PEN (nunca
 *  etiqueta un monto en soles con el código de otra moneda). */
export function formatReferencePrice(
  amountPEN: number,
  currencyCode: string,
  rates: ExchangeRates = FALLBACK_RATES
): string {
  const converted = convertFromPEN(amountPEN, currencyCode, rates);
  if (converted === null) return formatCurrency(amountPEN, 'PEN');
  return formatCurrency(converted, currencyCode);
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
  return Math.ceil(vbucks * 1);
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
// DATOS DE PAGO — se obtienen del backend via GET /store/payment-info
// ─────────────────────────────────────────────────────────────
export type PaymentInfo = Record<string, Record<string, string>>;

// ─────────────────────────────────────────────────────────────
// TRUSTPILOT — link público de reseñas del perfil ya reclamado
// ─────────────────────────────────────────────────────────────
export const TRUSTPILOT_REVIEW_URL = 'https://www.trustpilot.com/evaluate/kidstoreperu.net';