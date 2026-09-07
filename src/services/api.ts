import type { AuthResponse, Customer, Order, ShopResponse } from '../types';

const BASE = import.meta.env.VITE_API_URL || '/api';

let isRefreshing = false;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('kc_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getLang(): string {
  return localStorage.getItem('kc_lang') || 'es';
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('kc_refresh_token');
  if (!refreshToken || isRefreshing) return false;

  isRefreshing = true;
  try {
    const res = await fetch(`${BASE}/store/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.token) {
      localStorage.setItem('kc_token', body.token);
      localStorage.setItem('kc_refresh_token', body.refresh_token);
      return true;
    }
    // Refresh failed — clear tokens
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_refresh_token');
    return false;
  } catch {
    return false;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Lang': getLang(),
      ...authHeaders(),
      ...(opts.headers as Record<string, string> || {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Auto-refresh on TOKEN_EXPIRED
    if (body?.code === 'TOKEN_EXPIRED' || (res.status === 401 && localStorage.getItem('kc_refresh_token'))) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry the original request with new token
        const retryRes = await fetch(`${BASE}${url}`, {
          ...opts,
          headers: {
            'Content-Type': 'application/json',
            'X-Lang': getLang(),
            ...authHeaders(),
            ...(opts.headers as Record<string, string> || {}),
          },
        });
        const retryBody = await retryRes.json().catch(() => ({}));
        if (!retryRes.ok) {
          throw new Error(retryBody.error || retryBody.message || `Error ${retryRes.status}`);
        }
        return retryBody as T;
      }
      const err = new Error(body.error || 'Sesión expirada') as Error & { code?: string };
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }
    if (res.status === 401) {
      const err = new Error(body.error || 'No autorizado') as Error & { code?: string };
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    if (body?.code === 'EMAIL_NOT_VERIFIED' || res.status === 403) {
      const err = new Error(body.error || 'Email no verificado') as Error & { code?: string };
      err.code = body.code || 'EMAIL_NOT_VERIFIED';
      throw err;
    }
    throw new Error(body.error || body.message || `Error ${res.status}`);
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

export async function login(email: string, password: string): Promise<AuthResponse & { refresh_token?: string }> {
  const res = await request<{ success: boolean; token: string; refresh_token: string; customer: Customer }>('/store/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.refresh_token) {
    localStorage.setItem('kc_refresh_token', res.refresh_token);
  }
  return { token: res.token, customer: res.customer };
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

export async function startAccountLink(provider: 'google' | 'discord'): Promise<string> {
  const res = await request<{ success: boolean; link_token: string }>(`/store/link/${provider}/start`, {
    method: 'POST',
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

export async function getMyRecharges(): Promise<{
  recharges: { id: string; amount_kc: number; amount_soles: number | null; method: string; note: string | null; approved_by: string | null; created_at: string }[];
  payments: { id: string; gateway: string; payment_type: string; product_name: string; amount_pen: number; amount_usd: number; kc_amount: number; status: string; created_at: string }[];
}> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const res = await request<{ success: boolean; recharges: any[]; payments: any[] }>('/store/recharges');
  return { recharges: res.recharges ?? [], payments: res.payments ?? [] };
}

/* ── Shop ── */

export async function getShop(lang: 'es-419' | 'en' = 'es-419'): Promise<ShopResponse> {
  return request<ShopResponse>(`/store/shop?lang=${lang}`);
}

/* ── Payment Info ── */

export async function getPaymentInfo(): Promise<Record<string, Record<string, string>>> {
  return request<Record<string, Record<string, string>>>('/store/payment-info');
}

/* ── Bots status (público) ── */

export interface BotsStatusResponse {
  success: boolean;
  accounts: { id: string; display_name: string; remaining_gifts: number; vbucks: number; is_active: boolean; created_at: string }[];
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
  kc_amount?: number;
  gateway?: string;
  external_id?: string;
  // pedido
  item_name?: string;
  item_image?: string;
  epic_username?: string;
  price_kc?: number;
  price_vbucks?: number;
}

// voucherKind: "pago" | "pedido" | "recarga" — coincide con la ruta del sitio;
// se traduce a la ruta real del backend (payment/order/recharge).
export async function getVoucher(voucherKind: 'pago' | 'pedido' | 'recarga', id: string): Promise<Voucher> {
  const backendKind = { pago: 'payment', pedido: 'order', recarga: 'recharge' }[voucherKind];
  const res = await request<{ success: boolean; voucher: Voucher }>(`/store/voucher/${backendKind}/${id}`);
  return res.voucher;
}

/* ── Product Availability ── */

export async function checkProductAvailable(productId: string): Promise<boolean> {
  try {
    const res = await request<{ success: boolean; available: boolean }>(`/store/product-available/${productId}`);
    return res.available;
  } catch { return true; } // default available if endpoint fails
}

/* ── Admin ── */

export async function adminGetCustomers(adminKey: string) {
  return request<{ success: boolean; customers: Customer[] }>('/admin/customers', {
    headers: { 'X-Admin-Key': adminKey },
  });
}

export async function adminGetOrders(adminKey: string) {
  return request<{ success: boolean; orders: Order[] }>('/admin/orders', {
    headers: { 'X-Admin-Key': adminKey },
  });
}

export async function adminGetStats(adminKey: string) {
  return request<{
    success: boolean;
    total_customers: number;
    total_orders: number;
    total_sent: number;
    total_pending: number;
    total_kc_recharged: number;
  }>('/admin/stats', {
    headers: { 'X-Admin-Key': adminKey },
  });
}

export async function adminRechargeKC(adminKey: string, data: {
  customer_id: string;
  amount_kc: number;
  amount_soles?: number;
  note?: string;
}) {
  return request<{ success: boolean; new_balance: number; message: string }>('/admin/recharge', {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey, 'X-Approved-By': 'admin-panel' },
    body: JSON.stringify(data),
  });
}

/* ── Email verification ── */

export async function verifyEmail(token: string): Promise<{ token: string; customer: Customer }> {
  const res = await request<{ success: boolean; token: string; customer: Customer }>(
    `/store/verify-email?token=${token}`
  );
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
  token: string, epic_username: string
): Promise<{ token: string; refresh_token: string; customer: Customer }> {
  const res = await request<{ success: boolean; token: string; refresh_token: string; customer: Customer }>(
    '/auth/complete-registration',
    { method: 'POST', body: JSON.stringify({ token, epic_username }) }
  );
  return { token: res.token, refresh_token: res.refresh_token, customer: res.customer };
}