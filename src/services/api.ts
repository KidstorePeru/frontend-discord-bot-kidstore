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
  email?: string;
  current_password?: string;
  new_password?: string;
}): Promise<{ token: string; customer: Customer }> {
  const res = await request<{ success: boolean; token: string; customer: Customer }>('/store/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return { token: res.token, customer: res.customer };
}

export async function linkDiscord(discord_id: string, discord_username: string): Promise<void> {
  await request('/store/link-discord', {
    method: 'POST',
    body: JSON.stringify({ discord_id, discord_username }),
  });
}

export async function unlinkDiscord(): Promise<void> {
  await request('/store/unlink-discord', { method: 'DELETE' });
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

/* ── Exchange Rates ── */

export async function getExchangeRates(): Promise<{ USD: number; EUR: number; fetchedAt: number }> {
  return request<{ USD: number; EUR: number; fetchedAt: number }>('/store/exchange-rates');
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
  custom?: { name: string; price: number; kc?: number }
): Promise<{ payment_id: string; checkout_url: string }> {
  return request<{ success: boolean; payment_id: string; checkout_url: string }>('/store/payment', {
    method: 'POST',
    body: JSON.stringify({
      gateway, payment_type: paymentType, product_id: productId,
      ...(custom ? { custom_name: custom.name, custom_price: custom.price, custom_kc: custom.kc || 0 } : {}),
    }),
  });
}

export async function getPaymentStatus(paymentId: string) {
  return request<{ success: boolean; transaction: { id: string; status: string; payment_type: string; product_name: string; kc_amount: number } }>(`/store/payment-status/${paymentId}`);
}

export async function capturePayPalPayment(paymentId: string, token: string) {
  return request<{ success: boolean }>(`/store/paypal-capture?id=${paymentId}&token=${token}`, { method: 'POST' });
}

/* ── Product Availability ── */

export async function checkProductAvailable(productId: string): Promise<boolean> {
  try {
    const res = await request<{ success: boolean; available: boolean }>(`/store/product-available/${productId}`);
    return res.available;
  } catch { return true; } // default available if endpoint fails
}

/* ── Chat (Autobuyer V2 direct connection) ── */

const AUTOBUYER = import.meta.env.VITE_AUTOBUYER_URL || 'http://localhost:7788';
const AB_API = `${AUTOBUYER}/api/v1`;

export async function chatStart(): Promise<string> {
  const lang = localStorage.getItem('kc_lang') || 'es';
  const res = await fetch(`${AB_API}/chat/start?lang=${lang}`, {
    method: 'POST',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || `Error ${res.status}`);
  return body.session_id as string;
}

export async function chatSendMessage(sessionId: string, text: string): Promise<void> {
  const res = await fetch(`${AB_API}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Error ${res.status}`);
  }
}

export function chatStreamURL(sessionId: string): string {
  return `${AB_API}/chat/stream/${sessionId}`;
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

/* ── Discord OAuth ── */

export async function getDiscordAuthURL(): Promise<string> {
  const token = localStorage.getItem('kc_token') || '';
  const res = await request<{ success: boolean; url: string }>(
    `/discord/auth?token=${encodeURIComponent(token)}`
  );
  return res.url;
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