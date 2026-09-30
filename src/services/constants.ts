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

// ─────────────────────────────────────────────────────────────
// COMISIONES
// ─────────────────────────────────────────────────────────────
export const COMMISSIONS = {
  bizum: 0.015,  // 1.5%
};

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

// PEN_PER_KC: 1 KC = 1 V-Buck (ver vbucksToKC) y KC siempre cuesta lo mismo en
// soles sin importar el paquete (S/ 1.30 cada 100 KC) — se deriva del paquete
// "starter" en vez de repetir el número suelto, para que solo haya un lugar
// que cambiar si el precio de KC cambia algún día.
export const PEN_PER_KC = KC_PACKAGES[0].price_pen / KC_PACKAGES[0].kc;

/** Precio de referencia de un objeto de la tienda en la moneda del cliente
 *  (nunca lo que se cobra: eso siempre es en KC). Se convierte el IMPORTE TOTAL
 *  y recién después se redondea — convertir primero la tasa por V-Buck y
 *  redondearla a céntimos daba 0,00 en USD/EUR (0,013 × 0,27 = 0,0035 → 0,00).
 *  Si no hay tasa para esa divisa, muestra el importe en soles con su propio
 *  símbolo (ver formatReferencePrice), nunca soles con el símbolo de otra moneda. */
export function vbucksReferencePrice(vbucks: number, currencyCode: string, rates: ExchangeRates = FALLBACK_RATES): string {
  return formatReferencePrice(vbucks * PEN_PER_KC, currencyCode, rates);
}

// ─────────────────────────────────────────────────────────────
// DATOS DE PAGO — se obtienen del backend via GET /store/payment-info
// ─────────────────────────────────────────────────────────────
export type PaymentInfo = Record<string, Record<string, string>>;

// ─────────────────────────────────────────────────────────────
// TRUSTPILOT — link público de reseñas del perfil ya reclamado
// ─────────────────────────────────────────────────────────────
export const TRUSTPILOT_REVIEW_URL = 'https://www.trustpilot.com/evaluate/kidstoreperu.net';