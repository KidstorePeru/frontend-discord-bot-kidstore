/* ── Domain Models ── */

export interface Customer {
  id: number;
  epic_username: string;
  email: string;
  kc_balance: number;
  discord_id?: string;
  discord_username?: string;
  is_admin?: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  customer_id: number;
  epic_username: string;
  item_offer_id: string;
  item_name: string;
  item_image: string;
  price_kc: number;
  price_vbucks?: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'refunded';
  created_at: string;
}

export interface KCRecharge {
  id: number;
  customer_id: number;
  amount_kc: number;
  amount_soles: number;
  method: string;
  note: string;
  created_at: string;
}

/* ── API Responses ── */

export interface AuthResponse {
  token: string;
  customer: Customer;
}

export interface ShopEntry {
  mainId: string;
  offerId: string;
  displayName: string;
  displayDescription: string;
  displayType: string;
  mainType: string;
  rarity: {
    id: string;
    text: string;
  };
  images: {
    icon: string;
    featured?: string;
    background?: string;
    full_background?: string;
  };
  price: {
    regularPrice: number;
    finalPrice: number;
  };
  added: {
    date: string;
  };
  banner?: {
    value: string;
    text: string;
  };
  series?: string;
  section?: {
    id: string;
    name: string;
  };
  /* Precio en KC calculado en frontend */
  price_kc?: number;
}

export interface ShopResponse {
  status: number;
  data: {
    featured?: { entries: ShopEntry[] };
    daily?: { entries: ShopEntry[] };
    entries?: ShopEntry[];
    [key: string]: unknown;
  };
}

/* ── KC Packages ── */

export interface KCPackage {
  id: string;
  name: string;
  kc: number;
  price_pen: number;
  price_usd: number;
  price_eur: number;
  emoji: string;
  color: string;
  popular?: boolean;
  premium?: boolean;
}