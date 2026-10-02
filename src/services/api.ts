import type { AuthResponse, Customer, Order } from '../types';

// Exportado para components/fortnite-shop/hooks.ts (useShopData): esa
// consulta necesita su propio control fino sobre cache/reintentos (ver el
// proxy con caché en el backend, GET /store/shop) en vez de pasar por
// request(), así que arma su URL con el mismo BASE que usa el resto de la
// app en vez de duplicar la lógica de VITE_API_URL.
export const BASE = import.meta.env.VITE_API_URL || '/api';

// Renovación "single-flight": si varias peticiones descubren el token
// vencido casi al mismo tiempo (muy común — un dashboard que dispara
// varias llamadas en paralelo al cargar), TODAS esperan el resultado de la
// MISMA renovación en vez de que solo la primera la intente y el resto se
// rinda de inmediato. Antes, un simple booleano ("isRefreshing") hacía que
// cualquier llamada que llegara mientras otra ya estaba renovando
// devolviera false al toque — eso se interpretaba como "la sesión expiró"
// y podía cerrar una sesión perfectamente válida solo por la mala suerte
// de que dos pedidos de datos coincidieran justo cuando el token venció.
// Exportado para que otros lugares que hacen fetch directo (panel admin,
// seguimiento de pago) puedan compartir la misma renovación en vez de
// tener cada uno su propia lógica de refresh (o ninguna).
let refreshInFlight: { epoch: number; promise: Promise<RefreshOutcome> } | null = null;

// Época de sesión: un contador en memoria que avanza cada vez que EMPIEZA una
// sesión distinta (cerrar sesión, iniciar sesión, cambiar de cuenta). NO avanza
// al rotar tokens de la misma sesión. Toda petición autenticada y toda renovación
// capturan la época al iniciar; si al volver la época cambió, su respuesta
// pertenece a una sesión anterior y se DESCARTA — no restaura usuarios, no guarda
// tokens y no borra los de la sesión nueva.
let authEpoch = 0;
export function beginNewSession(): void { authEpoch++; }

// Intentos de inicio de sesión (contraseña, 2FA, OAuth, registro OAuth,
// verificación de correo). Cada intento captura su número y la época al salir;
// su respuesta solo se acepta si al volver sigue siendo el intento MÁS NUEVO y
// nadie cerró sesión ni empezó otra sesión mientras tanto. Así una respuesta
// lenta de un intento viejo no reemplaza una sesión nueva ni "revive" la sesión
// después de cerrarla: se descarta con SESSION_CHANGED sin guardar tokens.
// Además, cada pantalla pasa un AbortSignal que aborta al salir de ella: el
// intento se cancela (también la petición de red) y su respuesta, si llega, se
// descarta igual — no inicia sesión ni navega desde una pantalla que ya no está.
let authAttemptSeq = 0;
function startAuthAttempt(signal?: AbortSignal) {
  const attempt = ++authAttemptSeq;
  const epoch = authEpoch;
  const isCurrent = () => attempt === authAttemptSeq && epoch === authEpoch && !signal?.aborted;
  return {
    /** Espera la respuesta y la descarta (SESSION_CHANGED) si el intento dejó de ser vigente. */
    async guard<T>(pending: Promise<T>): Promise<T> {
      if (!isCurrent()) throw sessionChangedError();
      try {
        const res = await pending;
        if (!isCurrent()) throw sessionChangedError();
        return res;
      } catch (err) {
        if (!isCurrent()) throw sessionChangedError(); // incluye el AbortError de fetch
        throw err;
      }
    },
  };
}
/** Abandona los intentos de inicio de sesión en vuelo (el usuario canceló el
 *  paso de 2FA): sus respuestas se descartarán. */
export function cancelAuthAttempts(): void { authAttemptSeq++; }

// Códigos de error propios de este mecanismo.
export const SESSION_CHANGED = 'SESSION_CHANGED';
export const SESSION_REFRESH_UNAVAILABLE = 'SESSION_REFRESH_UNAVAILABLE';

export function isSessionChangedError(err: unknown): boolean {
  return (err as ApiError | undefined)?.code === SESSION_CHANGED;
}
// Fallo TEMPORAL de renovación (red caída, 5xx, 429): la sesión puede seguir
// siendo válida, así que NO se cierra ni se borran los tokens; se puede reintentar.
export function isTransientSessionError(err: unknown): boolean {
  return (err as ApiError | undefined)?.code === SESSION_REFRESH_UNAVAILABLE;
}

function sessionChangedError(): ApiError {
  const err = new Error('La sesión cambió mientras se procesaba la solicitud') as ApiError;
  err.code = SESSION_CHANGED;
  return err;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('kc_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getLang(): string {
  return localStorage.getItem('kc_lang') || 'es';
}

// ApiError — el status HTTP real de una respuesta no-ok, adjunto a todo
// error que lance request() (además del .code que ya traían algunas rutas).
// Sin esto, un llamador no tenía forma confiable de distinguir, por
// ejemplo, un 429 (límite de intentos) de un 500 (error de servidor) sin
// parsear el texto del mensaje — específicamente necesario para
// ResetPassword.tsx, que antes mostraba "enlace enviado" ante CUALQUIER
// error, incluida una caída de red o el propio backend caído.
export type ApiError = Error & { status?: number; code?: string };

// Resultado de intentar renovar la sesión:
//   ok        → tokens nuevos guardados.
//   invalid   → el servidor rechazó el refresh token (4xx): sesión realmente inválida; se borran los tokens.
//   transient → red caída, 5xx, 408/429 o respuesta ilegible: NO se toca nada, se puede reintentar.
//   stale     → mientras tanto se cerró sesión o cambió de cuenta: se descarta el resultado.
export type RefreshOutcome = 'ok' | 'invalid' | 'transient' | 'stale';

export async function refreshSession(): Promise<RefreshOutcome> {
  const refreshToken = localStorage.getItem('kc_refresh_token');
  if (!refreshToken) return 'invalid';

  const epoch = authEpoch;
  if (refreshInFlight && refreshInFlight.epoch === epoch) return refreshInFlight.promise;

  const entry = { epoch, promise: undefined as unknown as Promise<RefreshOutcome> };
  entry.promise = (async () => {
    try {
      const res = await fetch(`${BASE}/store/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const body = await res.json().catch(() => ({}));
      // Respuesta atrasada de una sesión anterior: no guarda ni borra nada.
      if (epoch !== authEpoch) return 'stale';
      if (res.ok && body.token && body.refresh_token) {
        localStorage.setItem('kc_token', body.token);
        localStorage.setItem('kc_refresh_token', body.refresh_token);
        return 'ok';
      }
      const rejected = res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429;
      if (rejected) {
        localStorage.removeItem('kc_token');
        localStorage.removeItem('kc_refresh_token');
        return 'invalid';
      }
      return 'transient';
    } catch {
      return epoch !== authEpoch ? 'stale' : 'transient';
    } finally {
      if (refreshInFlight === entry) refreshInFlight = null;
    }
  })();
  refreshInFlight = entry;
  return entry.promise;
}

// Compatibilidad: true solo si se renovó (los llamadores que solo necesitan
// saber si hay token nuevo, como el panel admin y la recarga).
export async function tryRefreshToken(): Promise<boolean> {
  return (await refreshSession()) === 'ok';
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  // Solo las peticiones que viajan CON sesión son sensibles a un cambio de
  // sesión; las públicas (catálogo, tasas) no.
  const epoch = authEpoch;
  const sessionBound = !!localStorage.getItem('kc_token');
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      // Un FormData (subida de archivos) lleva su propio Content-Type con el boundary.
      ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      'X-Lang': getLang(),
      ...authHeaders(),
      ...(opts.headers as Record<string, string> || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (sessionBound && epoch !== authEpoch) throw sessionChangedError();

  if (!res.ok) {
    // Auto-refresh on TOKEN_EXPIRED
    if (body?.code === 'TOKEN_EXPIRED' || (res.status === 401 && localStorage.getItem('kc_refresh_token'))) {
      const outcome = await refreshSession();
      if (outcome === 'stale' || (sessionBound && epoch !== authEpoch)) throw sessionChangedError();
      if (outcome === 'transient') {
        const err = new Error('No se pudo renovar la sesión por ahora. Reintenta en unos segundos.') as ApiError;
        err.code = SESSION_REFRESH_UNAVAILABLE;
        err.status = 503;
        throw err;
      }
      if (outcome === 'ok') {
        // Retry the original request with new token
        const retryRes = await fetch(`${BASE}${url}`, {
          ...opts,
          headers: {
            // Un FormData (subida de archivos) lleva su propio Content-Type con el boundary.
            ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            'X-Lang': getLang(),
            ...authHeaders(),
            ...(opts.headers as Record<string, string> || {}),
          },
        });
        const retryBody = await retryRes.json().catch(() => ({}));
        if (sessionBound && epoch !== authEpoch) throw sessionChangedError();
        if (!retryRes.ok) {
          const err = new Error(retryBody.error || retryBody.message || `Error ${retryRes.status}`) as ApiError;
          err.status = retryRes.status;
          throw err;
        }
        return retryBody as T;
      }
      const err = new Error(body.error || 'Sesión expirada') as ApiError;
      err.code = 'TOKEN_EXPIRED';
      err.status = res.status;
      throw err;
    }
    if (res.status === 401) {
      const err = new Error(body.error || 'No autorizado') as ApiError;
      err.code = 'UNAUTHORIZED';
      err.status = res.status;
      throw err;
    }
    if (body?.code === 'EMAIL_NOT_VERIFIED' || res.status === 403) {
      const err = new Error(body.error || 'Email no verificado') as ApiError;
      err.code = body.code || 'EMAIL_NOT_VERIFIED';
      err.status = res.status;
      throw err;
    }
    const err = new Error(body.error || body.message || `Error ${res.status}`) as ApiError;
    err.status = res.status;
    throw err;
  }
  return body as T;
}

/* ── Auth ── */

export async function register(epic_username: string, email: string, password: string): Promise<{ requires_verification: boolean }> {
  const res = await request<{ success: boolean; requires_verification: boolean }>('/store/register', {
    method: 'POST',
    body: JSON.stringify({ epic_username, email, password }),
  });
  return { requires_verification: res.requires_verification };
}

// LoginResult: o entra directo, o la cuenta tiene 2FA activado y hay que
// completar con /store/login/2fa antes de tener un token real.
export type LoginResult =
  | { requires2FA: false; token: string; customer: Customer }
  | { requires2FA: true; tempToken: string };

export async function login(email: string, password: string, signal?: AbortSignal): Promise<LoginResult> {
  const attempt = startAuthAttempt(signal);
  const res = await attempt.guard(request<{ success: boolean; token?: string; refresh_token?: string; customer?: Customer; requires_2fa?: boolean; temp_token?: string }>('/store/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    signal,
  }));
  if (res.requires_2fa && res.temp_token) {
    return { requires2FA: true, tempToken: res.temp_token };
  }
  if (res.refresh_token) {
    beginNewSession(); // empieza una sesión nueva: descarta respuestas de la anterior
    localStorage.setItem('kc_refresh_token', res.refresh_token);
  }
  return { requires2FA: false, token: res.token!, customer: res.customer! };
}

// exchangeOAuthCode canjea el código de un solo uso que /auth/callback
// recibe por query tras un login con Google/Discord — el código en sí no
// sirve para nada (no es el token real), así que aunque quedara en la URL
// visible o en el historial, no compromete la cuenta; los tokens de
// verdad viajan acá, en el cuerpo de la respuesta, nunca en una URL.
export async function exchangeOAuthCode(code: string, signal?: AbortSignal): Promise<
  { requires2FA: true; tempToken: string } | { requires2FA: false; token: string; refreshToken?: string }
> {
  const attempt = startAuthAttempt(signal);
  const res = await attempt.guard(request<{ success: boolean; token?: string; refresh_token?: string; requires_2fa?: boolean; temp_token?: string }>('/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
    signal,
  }));
  if (res.requires_2fa && res.temp_token) {
    return { requires2FA: true, tempToken: res.temp_token };
  }
  if (!res.token) throw new Error('Código inválido o expirado');
  // Los tokens se guardan aquí mismo, en el mismo paso que la comprobación de
  // arriba: no queda ningún hueco en el que un logout pueda colarse en medio.
  beginNewSession();
  localStorage.setItem('kc_token', res.token);
  if (res.refresh_token) localStorage.setItem('kc_refresh_token', res.refresh_token);
  return { requires2FA: false, token: res.token, refreshToken: res.refresh_token };
}

// verify2FA completa un login que quedó pendiente de segundo factor —
// "code" acepta tanto un código TOTP de 6 dígitos como un código de
// respaldo (formato XXXX-XXXX).
export async function verify2FA(tempToken: string, code: string, signal?: AbortSignal): Promise<AuthResponse & { refresh_token?: string }> {
  const attempt = startAuthAttempt(signal);
  const res = await attempt.guard(request<{ success: boolean; token: string; refresh_token: string; customer: Customer }>('/store/login/2fa', {
    method: 'POST',
    body: JSON.stringify({ temp_token: tempToken, code }),
    signal,
  }));
  if (res.refresh_token) {
    beginNewSession(); // empieza una sesión nueva: descarta respuestas de la anterior
    localStorage.setItem('kc_refresh_token', res.refresh_token);
  }
  return { token: res.token, customer: res.customer };
}

/* ── 2FA management (cuentas admin) ── */

export async function get2FAStatus(): Promise<{ enabled: boolean; backup_codes_remaining: number }> {
  return request('/store/2fa/status');
}

// password: obligatoria si la cuenta YA tiene 2FA activado (es una
// sustitución) — el backend la exige en ese caso para confirmar identidad
// antes de generar un secreto nuevo.
export async function setup2FA(password?: string): Promise<{ secret: string; otpauth_url: string }> {
  return request('/store/2fa/setup', { method: 'POST', body: password ? JSON.stringify({ password }) : undefined });
}

export async function confirm2FA(code: string): Promise<{ backup_codes: string[] }> {
  return request('/store/2fa/confirm', { method: 'POST', body: JSON.stringify({ code }) });
}

export async function disable2FA(password: string): Promise<void> {
  await request('/store/2fa/disable', { method: 'POST', body: JSON.stringify({ password }) });
}

/* ── Eliminar cuenta propia ── */

export async function deleteOwnAccount(password: string): Promise<void> {
  await request('/store/account', { method: 'DELETE', body: JSON.stringify({ password }) });
}

// Revoca el refresh token del dispositivo actual del lado del servidor —
// antes "cerrar sesión" solo borraba el token del navegador y el servidor
// seguía aceptándolo hasta sus 7 días completos. Se llama antes de limpiar
// el localStorage.
export async function logoutRequest(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  try {
    await request('/store/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
  } catch {
    // best-effort — si falla (red caída, etc.) igual se limpia la sesión local
  }
}

export async function forgotPassword(email: string, lang?: string): Promise<void> {
  await request('/store/forgot-password', {
    method: 'POST',
    headers: { 'X-Lang': lang || getLang() },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await request('/store/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

/* ── Customer ── */

export async function getMe(): Promise<Customer> {
  const res = await request<{ success: boolean; customer: Customer }>('/store/me');
  return res.customer;
}

export async function getMyOrders(page = 1, limit = 20): Promise<{ orders: Order[]; total: number; page: number }> {
  const res = await request<{ success: boolean; orders: Order[]; total: number; page: number }>(`/store/orders?page=${page}&limit=${limit}`);
  return { orders: res.orders ?? [], total: res.total, page: res.page };
}

// Totales reales calculados en el servidor — a diferencia de derivarlos de
// una página de pedidos ya cargada (que puede no ser el historial
// completo), estos números son exactos sin importar cuántos pedidos tenga
// el cliente.
export async function getMyOrderStats(): Promise<{ total_orders: number; sent_orders: number; pending_orders: number; total_spent_kc: number }> {
  return request('/store/orders/stats');
}

// total_pen_recharged solo cuenta pagos ya aprobados/cumplidos — nunca
// pendientes o fallidos, a diferencia de sumar amount_pen del historial de
// pagos tal cual llega del backend.
export async function getMyRechargeStats(): Promise<{ total_kc_recharged: number; total_pen_recharged: number; pending_payments: number }> {
  return request('/store/recharges/stats');
}

export async function updateProfile(data: {
  epic_username?: string;
  phone?: string | null;
  current_password?: string;
  new_password?: string;
}): Promise<{ token: string; customer: Customer }> {
  const res = await request<{ success: boolean; token: string; customer: Customer }>('/store/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return { token: res.token, customer: res.customer };
}

export async function updateAvatar(avatarDataUrl: string): Promise<Customer> {
  const res = await request<{ success: boolean; customer: Customer }>('/store/avatar', {
    method: 'PUT',
    body: JSON.stringify({ avatar: avatarDataUrl }),
  });
  return res.customer;
}

export async function requestEmailChange(newEmail: string, currentPassword?: string): Promise<void> {
  await request('/store/email/request-change', {
    method: 'POST',
    body: JSON.stringify({ new_email: newEmail, current_password: currentPassword || '' }),
  });
}

export async function confirmEmailChange(code: string): Promise<{ token: string; customer: Customer }> {
  const res = await request<{ success: boolean; token: string; customer: Customer }>('/store/email/confirm-change', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return { token: res.token, customer: res.customer };
}

/* ── Account linking (Google / Discord) ── */

// password: obligatoria si la cuenta YA tiene contraseña — el backend la
// exige en ese caso para confirmar identidad antes de agregar un método de
// acceso nuevo y permanente a la cuenta.
export async function startAccountLink(provider: 'google' | 'discord', password?: string): Promise<string> {
  const res = await request<{ success: boolean; link_token: string }>(`/store/link/${provider}/start`, {
    method: 'POST',
    body: password ? JSON.stringify({ password }) : undefined,
  });
  return res.link_token;
}

export async function unlinkAccount(provider: 'google' | 'discord'): Promise<Customer> {
  const res = await request<{ success: boolean; customer: Customer }>(`/store/link/${provider}`, {
    method: 'DELETE',
  });
  return res.customer;
}

/* ── Recharge History ── */

// RechargeHistoryItem: una fila del historial YA combinado, deduplicado y
// paginado en el servidor (ver db.GetRechargeHistoryByCustomer en el
// backend) — la unión de recargas manuales genuinas (kind:'kc') y pagos por
// pasarela de tipo kc_recharge (kind:'pay'). Antes /store/recharges traía
// las dos listas completas (una con tope fijo de 2000, la otra sin límite)
// y el dashboard las combinaba/paginaba en el navegador — con más de 2000
// intentos de pago, los más antiguos desaparecían del historial y de sus
// propios comprobantes.
export type RechargeHistoryItem =
  | { kind: 'kc'; id: string; created_at: string; amount_kc: number; amount_soles: number | null; method: string }
  | {
      kind: 'pay'; id: string; created_at: string; gateway: string; payment_type: string;
      product_name: string; amount_pen: number;
      // charged_amount/charged_currency: monto y divisa REALES cobrados por
      // la pasarela (calculados en el backend); amount_pen es solo un
      // precio de referencia, nunca lo que PayPal/NOWPayments/dLocal Go
      // cobraron de verdad para pasarelas que no facturan en soles.
      charged_amount?: number; charged_currency?: string;
      kc_amount: number; status: string;
    };

// signal: permite cancelar la petición en vuelo (ver usePaginatedHistory) —
// cuando el cliente cambia de página, reintenta, o el componente se
// desmonta mientras una consulta lenta sigue esperando respuesta, se aborta
// en vez de dejarla flotando hasta que el servidor responda por su cuenta.
export async function getMyRecharges(page = 1, limit = 20, signal?: AbortSignal): Promise<{ items: RechargeHistoryItem[]; total: number; page: number }> {
  const res = await request<{ success: boolean; items: RechargeHistoryItem[]; total: number; page: number }>(`/store/recharges?page=${page}&limit=${limit}`, { signal });
  return { items: res.items ?? [], total: res.total, page: res.page };
}

/* ── Payment Info ── */

export async function getPaymentInfo(): Promise<Record<string, Record<string, string>>> {
  return request<Record<string, Record<string, string>>>('/store/payment-info');
}

/* ── Bots status (público) ── */

export interface BotsStatusResponse {
  success: boolean;
  accounts: { id: string; display_name: string; remaining_gifts: number; vbucks: number; is_active: boolean; created_at: string; friends_count?: number | null; friends_limit?: number }[];
  in_schedule: boolean;
  reason: string;
  schedule: { enabled: boolean; start_hour: number; end_hour: number; timezone: string };
  current_time: string;
}

export async function getBotsStatus(): Promise<BotsStatusResponse> {
  return request<BotsStatusResponse>('/store/bots-status');
}

/* ── Exchange Rates ── */

export async function getExchangeRates(): Promise<{ USD: number; EUR: number; rates: Record<string, number>; fetchedAt: number }> {
  return request<{ USD: number; EUR: number; rates: Record<string, number>; fetchedAt: number }>('/store/exchange-rates');
}

/* ── Orders ── */

export async function createOrder(data: {
  item_offer_id: string;
  item_name: string;
  item_image: string;
  price_kc: number;
  price_vbucks: number;
}): Promise<Order> {
  const res = await request<{ success: boolean; order: Order; message: string }>('/store/order', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.order;
}

/* ── Payments ── */

export async function createPayment(
  gateway: string, paymentType: string, productId: string,
  custom?: { name: string; price: number; kc?: number },
  currency?: string
): Promise<{ payment_id: string; checkout_url: string }> {
  return request<{ success: boolean; payment_id: string; checkout_url: string }>('/store/payment', {
    method: 'POST',
    body: JSON.stringify({
      gateway, payment_type: paymentType, product_id: productId,
      ...(custom ? { custom_name: custom.name, custom_price: custom.price, custom_kc: custom.kc || 0 } : {}),
      ...(currency ? { currency } : {}),
    }),
  });
}

export async function getPaymentStatus(paymentId: string) {
  return request<{ success: boolean; transaction: { id: string; status: string; payment_type: string; product_name: string; kc_amount: number } }>(`/store/payment-status/${paymentId}`);
}

// Marca un pago propio como cancelado en cuanto la pasarela nos redirige con
// status=failure — sin esto se queda "pendiente" en el historial hasta que
// el barrido automático del backend lo expira (hasta 30 min después).
export async function cancelPayment(paymentId: string): Promise<{ success: boolean; cancelled: boolean }> {
  return request<{ success: boolean; cancelled: boolean }>(`/store/payment/${paymentId}/cancel`, { method: 'POST' });
}

export interface Voucher {
  type: 'payment' | 'order' | 'recharge';
  reference: string;
  customer_name: string;
  status: string;
  created_at: string;
  // pago / recarga
  product_name?: string;
  amount_pen?: number;
  // Monto y divisa REALES cobrados por la pasarela (PayPal y NOWPayments
  // cobran en USD, dLocal Go en la divisa real del cliente) — amount_pen es
  // solo un precio de referencia calculado al crear el pago, nunca lo que
  // realmente se cobró para esas pasarelas. Ausentes cuando el backend no
  // tiene información suficiente para afirmar un monto/divisa (nunca se
  // inventan en el frontend).
  charged_amount?: number;
  charged_currency?: string;
  // true cuando el comprobante está vinculado a un pago por pasarela que ya
  // no se pudo leer (fila borrada, error transitorio de DB) — el backend
  // deliberadamente NO envía charged_amount/charged_currency en ese caso
  // (nunca muestra el equivalente en PEN como si fuera la divisa realmente
  // cobrada).
  amount_unavailable?: boolean;
  kc_amount?: number;
  gateway?: string;
  external_id?: string;
  // pedido
  item_name?: string;
  item_image?: string;
  epic_username?: string;
  price_kc?: number;
  price_vbucks?: number;
  // Evidencia de entrega (solo pedidos "sent"): confirmación de que Epic
  // Games recibió y procesó el envío del regalo.
  delivery_confirmed?: boolean;
  delivered_at?: string;
}

// voucherKind: "pago" | "pedido" | "recarga" — coincide con la ruta del sitio;
// se traduce a la ruta real del backend (payment/order/recharge).
export async function getVoucher(voucherKind: 'pago' | 'pedido' | 'recarga', id: string): Promise<Voucher> {
  const backendKind = { pago: 'payment', pedido: 'order', recarga: 'recharge' }[voucherKind];
  const res = await request<{ success: boolean; voucher: Voucher }>(`/store/voucher/${backendKind}/${id}`);
  return res.voucher;
}

/* ── Libro de Reclamaciones Virtual ── */

export interface ComplaintRequest {
  kind: 'reclamo' | 'queja';
  full_name: string;
  document_type: 'DNI' | 'CE' | 'Pasaporte';
  document_number: string;
  email: string;
  phone?: string;
  address?: string;
  is_minor: boolean;
  guardian_name?: string;
  order_id?: string;
  amount_involved?: number;
  product_description: string;
  detail: string;
  consumer_request: string;
}

export async function submitComplaint(data: ComplaintRequest): Promise<{ reference: string; status: string; created_at: string }> {
  const res = await request<{ success: boolean; complaint: { reference: string; status: string; created_at: string } }>('/store/complaints', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.complaint;
}

export interface ComplaintStatus {
  reference: string;
  kind: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

export async function getComplaintStatus(reference: string): Promise<ComplaintStatus> {
  const res = await request<{ success: boolean; complaint: ComplaintStatus }>(`/store/complaints/${encodeURIComponent(reference)}`);
  return res.complaint;
}

/* ── Email verification ── */

export async function verifyEmail(token: string, signal?: AbortSignal): Promise<{ token: string; customer: Customer }> {
  const attempt = startAuthAttempt(signal);
  const res = await attempt.guard(request<{ success: boolean; token: string; customer: Customer }>(
    `/store/verify-email?token=${encodeURIComponent(token)}`, { signal }
  ));
  return { token: res.token, customer: res.customer };
}

export async function resendVerification(email: string, lang?: string): Promise<void> {
  await request('/store/resend-verification', {
    method: 'POST',
    headers: { 'X-Lang': lang || getLang() },
    body: JSON.stringify({ email, lang: lang || getLang() }),
  });
}

/* ── OAuth (Google / Discord) ── */

export async function getPendingOAuthRegistration(token: string): Promise<{
  provider: string;
  display_name: string | null;
  email: string | null;
}> {
  const res = await request<{ success: boolean; provider: string; display_name: string | null; email: string | null }>(
    `/auth/pending/${token}`
  );
  return { provider: res.provider, display_name: res.display_name, email: res.email };
}

export async function completeOAuthRegistration(
  token: string, epic_username: string, signal?: AbortSignal
): Promise<{ token: string; refresh_token: string; customer: Customer }> {
  const attempt = startAuthAttempt(signal);
  const res = await attempt.guard(request<{ success: boolean; token: string; refresh_token: string; customer: Customer }>(
    '/auth/complete-registration',
    { method: 'POST', body: JSON.stringify({ token, epic_username }), signal }
  ));
  if (res.refresh_token) {
    beginNewSession();
    localStorage.setItem('kc_refresh_token', res.refresh_token);
  }
  return { token: res.token, refresh_token: res.refresh_token, customer: res.customer };
}

/* ── Notificaciones (campana) y lista de deseos ── */

export type NotificationKind = 'wishlist_back' | 'order_sent' | 'order_failed' | 'kc_credited' | 'manual_payment_rejected';

export interface AppNotification {
  id: string;
  kind: NotificationKind | string;
  data: {
    item_id?: string;
    name?: string;
    image?: string;
    price_kc?: number;
    out_date?: string;
    order_id?: string;
    item_name?: string;
    item_image?: string;
    refunded?: boolean;
    amount_kc?: number;
    method?: string;
    reason?: string;
    amount?: string;
  };
  read: boolean;
  created_at: string;
}

export async function getNotifications(limit = 20): Promise<{ notifications: AppNotification[]; unread: number }> {
  const res = await request<{ notifications: AppNotification[]; unread: number }>(`/store/notifications?limit=${limit}`);
  return { notifications: res.notifications ?? [], unread: res.unread ?? 0 };
}

export interface AccountPulse {
  unread: number;
  kcBalance?: number;    // saldo actual (falta si el servidor no pudo leerlo)
  pendingManual: number; // comprobantes de pago manual en revisión
}

// Consulta liviana y periódica: avisos sin leer + saldo + comprobantes en revisión.
export async function getAccountPulse(): Promise<AccountPulse> {
  const res = await request<{ unread: number; kc_balance?: number; pending_manual?: number }>('/store/notifications/unread');
  return { unread: res.unread ?? 0, kcBalance: res.kc_balance, pendingManual: res.pending_manual ?? 0 };
}

export async function markNotificationsRead(): Promise<void> {
  await request('/store/notifications/read', { method: 'POST' });
}

export interface NotificationPrefs { email: boolean; discord: boolean }

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const res = await request<{ prefs: NotificationPrefs }>('/store/notifications/prefs');
  return res.prefs;
}

export async function updateNotificationPrefs(prefs: NotificationPrefs): Promise<NotificationPrefs> {
  const res = await request<{ prefs: NotificationPrefs }>('/store/notifications/prefs', { method: 'PUT', body: JSON.stringify(prefs) });
  return res.prefs;
}

export interface WishlistItem {
  item_id: string;
  name: string;
  item_type: string;
  image: string;
  created_at: string;
  in_shop: boolean;
  price_kc?: number;
  out_date?: string;
}

export async function getWishlist(): Promise<{ items: WishlistItem[]; limit: number }> {
  const res = await request<{ items: WishlistItem[]; limit: number }>('/store/wishlist');
  return { items: res.items ?? [], limit: res.limit ?? 30 };
}

export async function addWishlistItem(item: { item_id: string; name: string; item_type?: string; image?: string }): Promise<void> {
  await request('/store/wishlist', { method: 'POST', body: JSON.stringify(item) });
}

export async function removeWishlistItem(itemId: string): Promise<void> {
  await request(`/store/wishlist/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}

export interface CosmeticResult { item_id: string; name: string; item_type: string; image: string; last_seen?: string }

export async function searchCosmetics(q: string, signal?: AbortSignal): Promise<CosmeticResult[]> {
  const res = await request<{ results: CosmeticResult[] }>(`/store/cosmetics/search?q=${encodeURIComponent(q)}`, { signal });
  return res.results ?? [];
}

/* ── Reseñas verificadas y cifras de la portada ── */

export interface StoreStats { orders_delivered: number; shop_items_today: number; reviews: { average: number; count: number } }

export async function getStoreStats(): Promise<StoreStats> {
  return request<StoreStats>('/store/stats');
}

export interface PublicReview {
  display_name: string;
  rating: number;
  comment: string;
  item_name: string;
  item_image: string;
  reply?: string;
  created_at: string;
}

export async function getPublicReviews(): Promise<{ reviews: PublicReview[]; summary: { average: number; count: number } }> {
  const res = await request<{ reviews: PublicReview[]; summary: { average: number; count: number } }>('/store/reviews');
  return { reviews: res.reviews ?? [], summary: res.summary ?? { average: 0, count: 0 } };
}

export async function getReviewableOrders(): Promise<string[]> {
  const res = await request<{ order_ids: string[] }>('/store/reviews/pending-orders');
  return res.order_ids ?? [];
}

export async function createReview(orderId: string, rating: number, comment: string): Promise<void> {
  await request('/store/reviews', { method: 'POST', body: JSON.stringify({ order_id: orderId, rating, comment }) });
}

/* ── Pagos manuales con comprobante ── */

export interface ManualPaymentRequest {
  id: string;
  package_id: string;
  package_name: string;
  kc_amount: number;
  amount: number;
  currency: 'PEN' | 'EUR' | string;
  method: string;
  operation_number: string;
  proof_content_type: string;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string;
  reviewed_at?: string;
  proof_deleted: boolean;
  created_at: string;
}

export async function getMyManualPayments(): Promise<{ requests: ManualPaymentRequest[]; enabled: boolean; maxPending: number }> {
  const res = await request<{ requests: ManualPaymentRequest[]; enabled: boolean; max_pending: number }>('/store/manual-payments');
  return { requests: res.requests ?? [], enabled: res.enabled !== false, maxPending: res.max_pending ?? 2 };
}

export async function createManualPayment(data: {
  packageId: string;
  customKC?: number;
  method: string;
  operationNumber: string;
  proof: Blob;
  fileName: string;
}): Promise<ManualPaymentRequest> {
  const form = new FormData();
  form.append('package_id', data.packageId);
  if (data.customKC) form.append('custom_kc', String(data.customKC));
  form.append('method', data.method);
  form.append('operation_number', data.operationNumber);
  form.append('confirm', 'true');
  form.append('proof', data.proof, data.fileName);
  const res = await request<{ request: ManualPaymentRequest }>('/store/manual-payments', { method: 'POST', body: form });
  return res.request;
}

