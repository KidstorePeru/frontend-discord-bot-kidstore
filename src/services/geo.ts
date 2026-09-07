// frontend/src/services/geo.ts
// Geolocalización por IP — para detectar automáticamente el idioma y la
// divisa local del visitante en su primera visita (no pisa una elección
// manual que ya haya hecho).

const CACHE_KEY = 'ksp_geo';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días — el país de un visitante casi no cambia

export interface GeoInfo {
  countryCode: string; // ISO 3166-1 alpha-2, ej. "PE", "MX", "US"
  currencyCode: string; // ISO 4217, ej. "PEN", "MXN", "USD"
}

const FALLBACK_GEO: GeoInfo = { countryCode: 'PE', currencyCode: 'PEN' };

// Países hispanohablantes de Latinoamérica + Brasil — para decidir el
// idioma por defecto (español vs inglés). La divisa NO depende de esta
// lista: se usa la que devuelva la API directamente para cualquier país.
export const LATAM_COUNTRIES = new Set([
  'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV',
  'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'UY', 'VE',
]);

function loadCached(): GeoInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoInfo & { fetchedAt: number };
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null;
    if (!parsed.countryCode || !parsed.currencyCode) return null;
    return { countryCode: parsed.countryCode, currencyCode: parsed.currencyCode };
  } catch {
    return null;
  }
}

function saveCache(geo: GeoInfo): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...geo, fetchedAt: Date.now() }));
  } catch { /* ignore */ }
}

let inFlight: Promise<GeoInfo> | null = null;

/** Detecta país y divisa del visitante por IP. Cachea 30 días en localStorage
 *  y comparte la misma solicitud en vuelo si varios componentes la piden a
 *  la vez (ej. LangContext y CurrencyContext en la carga inicial). */
export async function detectGeo(): Promise<GeoInfo> {
  const cached = loadCached();
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = detectGeoUncached().finally(() => { inFlight = null; });
  return inFlight;
}

async function detectGeoUncached(): Promise<GeoInfo> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('geo lookup failed');
    const data = await res.json();
    const geo: GeoInfo = {
      countryCode: (data.country_code || FALLBACK_GEO.countryCode).toUpperCase(),
      currencyCode: (data.currency || FALLBACK_GEO.currencyCode).toUpperCase(),
    };
    saveCache(geo);
    return geo;
  } catch {
    return FALLBACK_GEO;
  }
}

export function isLatam(countryCode: string): boolean {
  return LATAM_COUNTRIES.has(countryCode.toUpperCase());
}

// ── Divisas soportadas ──────────────────────────────────────────
// Lista cerrada a propósito: toda Latinoamérica + Estados Unidos + España/
// Italia (ambas usan EUR) — el resto de las ~160 que da la API de tipo de
// cambio no se ofrecen como opción. Panamá, Ecuador y El Salvador no tienen
// código propio porque ya operan en USD.
export type CurrencyRegion = 'latam' | 'na' | 'eu';
export const SUPPORTED_CURRENCIES: { code: string; region: CurrencyRegion }[] = [
  { code: 'PEN', region: 'latam' }, // Perú
  { code: 'MXN', region: 'latam' }, // México
  { code: 'ARS', region: 'latam' }, // Argentina
  { code: 'BRL', region: 'latam' }, // Brasil
  { code: 'CLP', region: 'latam' }, // Chile
  { code: 'COP', region: 'latam' }, // Colombia
  { code: 'BOB', region: 'latam' }, // Bolivia
  { code: 'CRC', region: 'latam' }, // Costa Rica
  { code: 'CUP', region: 'latam' }, // Cuba
  { code: 'DOP', region: 'latam' }, // Rep. Dominicana
  { code: 'GTQ', region: 'latam' }, // Guatemala
  { code: 'HNL', region: 'latam' }, // Honduras
  { code: 'HTG', region: 'latam' }, // Haití
  { code: 'NIO', region: 'latam' }, // Nicaragua
  { code: 'PAB', region: 'latam' }, // Panamá
  { code: 'PYG', region: 'latam' }, // Paraguay
  { code: 'UYU', region: 'latam' }, // Uruguay
  { code: 'VES', region: 'latam' }, // Venezuela
  { code: 'USD', region: 'na' },    // Estados Unidos
  { code: 'EUR', region: 'eu' },    // España / Italia
];
const SUPPORTED_CODES = new Set(SUPPORTED_CURRENCIES.map(c => c.code));

/** Para países fuera de la lista soportada (ej. Canadá, Reino Unido, Japón)
 *  cae a USD — es la divisa más universal para pagar (dLocal Go/cripto). */
export function supportedCurrencyFor(currencyCode: string): string {
  return SUPPORTED_CODES.has(currencyCode) ? currencyCode : 'USD';
}
