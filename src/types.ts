/* ── Domain Models ── */

export interface Customer {
  id: string;
  epic_username: string;
  email: string;
  kc_balance: number;
  avatar_url?: string;
  phone?: string;
  has_password: boolean;
  google_linked: boolean;
  discord_linked: boolean;
  discord_username?: string;
  next_email_change_at?: string;
  is_admin?: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  epic_username: string;
  item_offer_id: string;
  item_name: string;
  item_image: string;
  price_kc: number;
  price_vbucks: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'refunded' | 'review';
  error_msg?: string;
  created_at: string;
}

/* ── API Responses ── */

export interface AuthResponse {
  token: string;
  customer: Customer;
}

/* ── KC Packages ── */

export interface KCPackage {
  id: string;
  name: string;
  kc: number;
  price_pen: number;
  price_pen_online?: number;
  price_usd: number;
  price_eur: number;
  emoji: string;
  color: string;
  popular?: boolean;
  premium?: boolean;
}