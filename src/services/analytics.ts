// Medición de visitas con Umami Cloud (https://umami.is): sin cookies, sin
// datos personales y sin banner de cookies. Solo se activa en la web real
// (kidstoreperu.net) y si VITE_UMAMI_WEBSITE_ID está configurado en Railway
// (servicio del frontend); en desarrollo o sin esa variable no hace nada.
//
// Eventos del recorrido de compra (para el informe de "Embudo" en Umami):
//   registro            → cuenta creada
//   carrito_agregar     → objeto agregado al carrito
//   compra_confirmar    → abrió la confirmación de compra
//   compra_exitosa      → pedido(s) creado(s)          { objetos, kc }
//   recarga_pago        → eligió pagar con una pasarela  { metodo }
//   recarga_aprobada    → recarga acreditada            { kc }
//   deseos_agregar      → siguió un objeto (lista de deseos)
// Nunca se envían correos, nombres, montos de dinero ni IDs de pedidos.

export type AnalyticsEvent =
  | 'registro'
  | 'carrito_agregar'
  | 'compra_confirmar'
  | 'compra_exitosa'
  | 'recarga_pago'
  | 'recarga_aprobada'
  | 'deseos_agregar';

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | number>) => void };
  }
}

const SCRIPT_URL = 'https://cloud.umami.is/script.js';
const SITE_DOMAINS = ['www.kidstoreperu.net', 'kidstoreperu.net'];
const OPT_OUT_KEY = 'umami.disabled';

function optedOut(): boolean {
  try { return !!localStorage.getItem(OPT_OUT_KEY); } catch { return false; }
}

/** Carga el script de Umami (una sola vez). Devuelve si quedó activo. */
export function initAnalytics(
  websiteId: string | undefined = import.meta.env.VITE_UMAMI_WEBSITE_ID,
  hostname: string = window.location.hostname,
): boolean {
  if (!websiteId || !SITE_DOMAINS.includes(hostname) || optedOut()) return false;
  if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) return true;
  const s = document.createElement('script');
  s.defer = true;
  s.src = SCRIPT_URL;
  s.dataset.websiteId = websiteId;
  s.dataset.domains = SITE_DOMAINS.join(',');
  // Los parámetros de la URL pueden traer tokens (verificación de correo,
  // restablecer contraseña, OAuth): nunca se envían.
  s.dataset.excludeSearch = 'true';
  s.dataset.excludeHash = 'true';
  document.head.appendChild(s);
  return true;
}

/** Registra un evento. Si la medición no está activa, no hace nada. */
export function track(event: AnalyticsEvent, data?: Record<string, string | number>): void {
  try {
    if (optedOut()) return;
    window.umami?.track(event, data);
  } catch {
    /* la medición nunca debe romper la web */
  }
}

/** El dueño no cuenta como visita (se activa solo al entrar como admin). */
export function excludeThisBrowser(): void {
  try { localStorage.setItem(OPT_OUT_KEY, '1'); } catch { /* sin almacenamiento: se ignora */ }
}
