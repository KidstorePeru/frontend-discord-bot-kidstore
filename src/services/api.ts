import type { AuthResponse, Customer, Order, ShopResponse } from '../types';

const BASE = '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('kc_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(opts.headers as Record<string, string> || {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (body?.code === 'TOKEN_EXPIRED' || res.status === 401) {
      const err = new Error(body.error || 'Sesión expirada') as Error & { code?: string };
      err.code = body.code || 'UNAUTHORIZED';
      throw err;
    }
    throw new Error(body.error || body.message || `Error ${res.status}`);
  }
  return body as T;
}

/* ── Auth ── */

export async function register(epic_username: string, email: string, password: string): Promise<AuthResponse> {
  const res = await request<{ success: boolean; token: string; customer: Customer }>('/store/register', {
    method: 'POST',
    body: JSON.stringify({ epic_username, email, password }),
  });
  return { token: res.token, customer: res.customer };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await request<{ success: boolean; token: string; customer: Customer }>('/store/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { token: res.token, customer: res.customer };
}

export async function forgotPassword(email: string): Promise<void> {
  await request('/store/forgot-password', {
    method: 'POST',
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

export async function getMyOrders(): Promise<Order[]> {
  const res = await request<{ success: boolean; orders: Order[] }>('/store/orders');
  return res.orders ?? [];
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

/* ── Shop ── */

export async function getShop(lang: 'es-419' | 'en' = 'es-419'): Promise<ShopResponse> {
  return request<ShopResponse>(`/store/shop?lang=${lang}`);
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
 
// Obtiene la URL de autorización de Discord e inicia el flujo OAuth
export async function getDiscordAuthURL(): Promise<string> {
  const token = localStorage.getItem('kc_token') || '';
  const res = await request<{ success: boolean; url: string }>(
    `/discord/auth?token=${encodeURIComponent(token)}`
  );
  return res.url;
}

export async function unlinkDiscord(): Promise<void> {
  await request('/store/unlink-discord', { method: 'DELETE' });
}
