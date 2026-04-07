// frontend/src/services/constants.ts
import type { KCPackage } from '../types';
import type { ExchangeRates } from './useExchangeRates';
import { FALLBACK_RATES } from './useExchangeRates';

// ─────────────────────────────────────────────────────────────
// PAQUETES KC — el precio FIJO siempre es PEN
// USD y EUR se calculan dinámicamente con la API
// ─────────────────────────────────────────────────────────────
export const KC_PACKAGES: KCPackage[] = [
  { id: 'starter', name: 'Starter', kc: 800,   price_pen: 12.80,  price_pen_online: 14.70,  price_usd: 0, price_eur: 0, emoji: '⚡', color: '#3b82f6' },
  { id: 'gamer',   name: 'Gamer',   kc: 2400,  price_pen: 38.40,  price_pen_online: 41.60,  price_usd: 0, price_eur: 0, emoji: '🎮', color: '#8b5cf6', popular: true },
  { id: 'pro',     name: 'Pro',     kc: 4500,  price_pen: 72.00,  price_pen_online: 76.80,  price_usd: 0, price_eur: 0, emoji: '🔥', color: '#f59e0b' },
  { id: 'legend',  name: 'Legend',  kc: 12500, price_pen: 200.00, price_pen_online: 211.30, price_usd: 0, price_eur: 0, emoji: '👑', color: '#f59e0b', premium: true },
];

// KC price per unit for custom amounts
export const KC_PRICE_PER_UNIT_MANUAL = 0.016;  // S/ 0.016 per KC (manual payment)
export const KC_PRICE_PER_UNIT_ONLINE = 0.017;  // approximate, actual = (amount * 0.016 + 1.18) / 0.9529

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
// PRODUCTOS DE TIENDA — precio fijo en PEN
// ─────────────────────────────────────────────────────────────

export interface StoreProduct {
  id: string;
  name: string;
  name_en?: string;
  subtitle?: string;
  subtitle_en?: string;
  description?: string;
  description_en?: string;
  amount: number;
  price_pen: number;
  originalPrice_pen?: number;
  image: string;
  color: string;
}

export interface BulkProduct {
  id: string;
  name: string;
  description?: string;
  image: string;
  color: string;
  tiers: { min: number; max: number; step: number }[];
  values?: number[]; // explicit list of available amounts (overrides tiers)
  pricePerUnit_pen: number;
  prices?: Record<number, number>; // individual price per amount (overrides pricePerUnit_pen)
}

export interface InfoCard {
  icon: string;
  title_es: string;
  title_en: string;
  items_es: string[];
  items_en: string[];
  color: string;
}

export interface InfoTag {
  icon: string;
  text_es: string;
  text_en: string;
  color: string;
}

export interface CategoryInfo {
  title_es: string;
  title_en: string;
  desc_es: string;
  desc_en: string;
  infoTitle_es?: string;
  infoTitle_en?: string;
  infoSubtitle_es?: string;
  infoSubtitle_en?: string;
  infoDesc_es?: string;
  infoDesc_en?: string;
  infoCards?: InfoCard[];
  tags?: InfoTag[];
}

// ── Descripciones de categorias ──
export const CATEGORY_INFO: Record<string, CategoryInfo> = {
  vbucks: {
    title_es: 'V-Bucks',
    title_en: 'V-Bucks',
    desc_es: 'Compra V-Bucks para usar en la tienda de Fortnite.',
    desc_en: 'Buy V-Bucks to use in the Fortnite Item Shop.',
    infoTitle_es: 'Informacion del Producto',
    infoTitle_en: 'Product Information',
    infoSubtitle_es: 'Que son los paVos? — Explicacion general',
    infoSubtitle_en: 'What are V-Bucks? — General explanation',
    infoDesc_es: 'Los paVos (V-Bucks) son la moneda oficial de Fortnite. Con ellos puedes comprar skins, gestos, picos, planeadores, packs y el Pase de Batalla de cada temporada.',
    infoDesc_en: 'V-Bucks are Fortnite\'s official currency. Use them to buy skins, emotes, pickaxes, gliders, packs and each season\'s Battle Pass.',
    infoCards: [
      { icon: 'gamepad', title_es: 'Compatibilidad', title_en: 'Compatibility', color: '#ede9fe',
        items_es: ['PC (Epic Games / Steam)', 'PlayStation 4 / 5', 'Xbox One / Series', 'Nintendo Switch', 'Dispositivos moviles'],
        items_en: ['PC (Epic Games / Steam)', 'PlayStation 4 / 5', 'Xbox One / Series', 'Nintendo Switch', 'Mobile devices'] },
      { icon: 'sparkles', title_es: 'Beneficios', title_en: 'Benefits', color: '#fef3c7',
        items_es: ['Cosmeticos exclusivos', 'Personaliza tu personaje', 'Skins de temporada', 'Gestos y bailes unicos', 'Acceso a contenido premium'],
        items_en: ['Exclusive cosmetics', 'Customize your character', 'Seasonal skins', 'Unique emotes & dances', 'Access premium content'] },
      { icon: 'zap', title_es: 'Uso en el juego', title_en: 'In-game usage', color: '#dcfce7',
        items_es: ['Comprar skins y gestos', 'Desbloquear emotes', 'Pase de Batalla de temporada', 'Articulos de la tienda diaria', 'Regalar items a amigos'],
        items_en: ['Buy skins & emotes', 'Unlock emotes', 'Season Battle Pass', 'Daily shop items', 'Gift items to friends'] },
    ],
    tags: [
      { icon: 'monitor', text_es: 'PC - PS - Xbox - Switch - Movil', text_en: 'PC - PS - Xbox - Switch - Mobile', color: '#ede9fe' },
      { icon: 'sparkles', text_es: 'Skins, emotes y cosmeticos', text_en: 'Skins, emotes & cosmetics', color: '#fef3c7' },
      { icon: 'star', text_es: 'Desbloquea el Pase de Batalla', text_en: 'Unlock the Battle Pass', color: '#dcfce7' },
    ],
  },
  packs: {
    title_es: 'Packs de Fortnite',
    title_en: 'Fortnite Packs',
    desc_es: 'Packs exclusivos con trajes, accesorios y mas.',
    desc_en: 'Exclusive packs with outfits, accessories and more.',
    infoTitle_es: 'Que son los Paquetes de Fortnite?',
    infoTitle_en: 'What are Fortnite Packs?',
    infoSubtitle_es: 'Bundles exclusivos con cosmeticos + V-Bucks',
    infoSubtitle_en: 'Exclusive bundles with cosmetics + V-Bucks',
    infoDesc_es: 'Los Paquetes de Fortnite son bundles especiales que incluyen cosmeticos exclusivos y V-Bucks a un precio reducido. Perfectos para obtener contenido exclusivo y ahorrar pavos.',
    infoDesc_en: 'Fortnite Packs are special bundles that include exclusive cosmetics and V-Bucks at a reduced price. Perfect for getting exclusive content and saving V-Bucks.',
    infoCards: [
      { icon: 'shirt', title_es: 'Outfits exclusivos', title_en: 'Exclusive outfits', color: '#ede9fe',
        items_es: ['Skins que solo se consiguen en paquetes, no disponibles en la tienda diaria'],
        items_en: ['Skins only available in packs, not in the daily shop'] },
      { icon: 'coins', title_es: 'V-Bucks incluidos', title_en: 'V-Bucks included', color: '#fef3c7',
        items_es: ['Cada paquete trae V-Bucks para gastar libremente en tienda del juego'],
        items_en: ['Each pack includes V-Bucks to spend freely in the game shop'] },
      { icon: 'zap', title_es: 'Acceso inmediato', title_en: 'Instant access', color: '#dcfce7',
        items_es: ['Los cosmeticos se desbloquean al instante al activarlos en tu cuenta'],
        items_en: ['Cosmetics unlock instantly when activated on your account'] },
    ],
  },
  club: {
    title_es: 'Club de Fortnite',
    title_en: 'Fortnite Club',
    desc_es: 'La suscripcion mensual premium de Fortnite.',
    desc_en: 'Fortnite\'s premium monthly subscription.',
    infoTitle_es: 'Cual es la diferencia?',
    infoTitle_en: 'What\'s the difference?',
    infoSubtitle_es: 'Club, Battle Pass y Pases Especiales explicados',
    infoSubtitle_en: 'Club, Battle Pass & Special Passes explained',
    infoCards: [
      { icon: 'crown', title_es: 'Club de Fortnite', title_en: 'Fortnite Club', color: '#ede9fe',
        items_es: ['1,000 V-Bucks cada mes', 'Pase de Batalla incluido', 'Skin y cosmeticos exclusivos del Club'],
        items_en: ['1,000 V-Bucks each month', 'Battle Pass included', 'Exclusive Club skin & cosmetics'] },
      { icon: 'star', title_es: 'Pase de Batalla', title_en: 'Battle Pass', color: '#fef3c7',
        items_es: ['Mas de 100 recompensas desbloqueables', 'Cosmeticos exclusivos de temporada', 'Posibilidad de recuperar V-Bucks'],
        items_en: ['100+ unlockable rewards', 'Season-exclusive cosmetics', 'Possibility to earn back V-Bucks'] },
      { icon: 'music', title_es: 'Pases Especiales', title_en: 'Special Passes', color: '#dcfce7',
        items_es: ['Recompensas exclusivas de cada modo', 'Cosmeticos unicos y tematicos', 'Progreso independiente del Pase'],
        items_en: ['Mode-exclusive rewards', 'Unique themed cosmetics', 'Independent Pass progress'] },
    ],
    tags: [
      { icon: 'crown', text_es: 'Club — Suscripcion mensual', text_en: 'Club — Monthly subscription', color: '#ede9fe' },
      { icon: 'star', text_es: 'Battle Pass — 100+ recompensas', text_en: 'Battle Pass — 100+ rewards', color: '#fef3c7' },
      { icon: 'music', text_es: 'Pases Especiales — Modos unicos', text_en: 'Special Passes — Unique modes', color: '#dcfce7' },
    ],
  },
  rocket: {
    title_es: 'Rocket League Credits',
    title_en: 'Rocket League Credits',
    desc_es: 'Compra Credits para Rocket League.',
    desc_en: 'Buy Credits for Rocket League.',
    infoTitle_es: 'Informacion del Producto',
    infoTitle_en: 'Product Information',
    infoSubtitle_es: 'Que son los Credits? — Explicacion general',
    infoSubtitle_en: 'What are Credits? — General explanation',
    infoDesc_es: 'Los Credits son la moneda premium de Rocket League. Usalos para comprar items en la tienda, obtener el Rocket Pass o intercambiar con otros jugadores.',
    infoDesc_en: 'Credits are Rocket League\'s premium currency. Use them to buy items in the shop, get the Rocket Pass or trade with other players.',
    infoCards: [
      { icon: 'gamepad', title_es: 'Compatibilidad', title_en: 'Compatibility', color: '#ede9fe',
        items_es: ['PC (Epic Games / Steam)', 'PlayStation 4 / 5', 'Xbox One / Series', 'Nintendo Switch'],
        items_en: ['PC (Epic Games / Steam)', 'PlayStation 4 / 5', 'Xbox One / Series', 'Nintendo Switch'] },
      { icon: 'sparkles', title_es: 'Beneficios', title_en: 'Benefits', color: '#dbeafe',
        items_es: ['Personaliza tu coche', 'Ruedas, boosts y decals', 'Goal explosions exclusivos', 'Intercambio con jugadores'],
        items_en: ['Customize your car', 'Wheels, boosts & decals', 'Exclusive goal explosions', 'Player trading'] },
      { icon: 'zap', title_es: 'Uso en el juego', title_en: 'In-game usage', color: '#dcfce7',
        items_es: ['Comprar en la tienda de items', 'Rocket Pass premium', 'Blueprints y crafting', 'Trading con otros jugadores'],
        items_en: ['Buy from the item shop', 'Premium Rocket Pass', 'Blueprints & crafting', 'Trading with other players'] },
    ],
    tags: [
      { icon: 'monitor', text_es: 'PC - PS - Xbox - Switch', text_en: 'PC - PS - Xbox - Switch', color: '#dbeafe' },
      { icon: 'sparkles', text_es: 'Personaliza tu coche', text_en: 'Customize your car', color: '#fef3c7' },
      { icon: 'rocket', text_es: 'Rocket Pass premium', text_en: 'Premium Rocket Pass', color: '#dcfce7' },
    ],
  },
};

// ── V-Bucks ──
export const VBUCKS_PRODUCTS: StoreProduct[] = [
  { id: 'vb-800',   name: '800 V-Bucks',
    description: 'Ideal para comprar 1 outfit basico o varios gestos en la tienda.',
    description_en: 'Great for buying 1 basic outfit or several emotes from the shop.',
    amount: 800, price_pen: 23.20, originalPrice_pen: 26.32, image: '/vbucks-800.png', color: '#2196f3' },
  { id: 'vb-2400',  name: '2400 V-Bucks',
    description: 'El paquete mas popular. Alcanza para outfits de temporada y accesorios.',
    description_en: 'The most popular pack. Enough for seasonal outfits and accessories.',
    amount: 2400, price_pen: 53.60, originalPrice_pen: 63.92, image: '/vbucks-2400.png', color: '#7c4dff' },
  { id: 'vb-4500',  name: '4500 V-Bucks',
    description: 'Perfecto para el Pase de Batalla + varios cosmeticos extra.',
    description_en: 'Perfect for the Battle Pass + several extra cosmetics.',
    amount: 4500, price_pen: 79.80, originalPrice_pen: 103.92, image: '/vbucks-4800.png', color: '#ff9800' },
  { id: 'vb-12500', name: '12500 V-Bucks',
    description: 'El mejor precio por V-Buck. Para coleccionistas y jugadores frecuentes.',
    description_en: 'Best price per V-Buck. For collectors and frequent players.',
    amount: 12500, price_pen: 190.00, originalPrice_pen: 263.92, image: '/vbucks-12500.png', color: '#f44336' },
];

export const VBUCKS_BULK: BulkProduct = {
  id: 'vb-custom', name: '— V-Bucks', image: '/vbucks-custom.png', color: '#00bcd4',
  tiers: [],
  values: [
    50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
    850, 900, 950, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500,
    1550, 1600, 1650, 1750, 1800, 1850, 1900, 1950, 2000, 2050, 2100, 2150,
    2200, 2250, 2350, 2450, 2500, 2550, 2600, 2650, 2700, 2750, 2850, 2900,
    2950, 3000, 3050, 3100, 3150, 3200, 3250, 3300, 3350, 3400, 3450, 3500,
    3550, 3600, 3650, 3700, 3750, 3800, 3850, 3900, 3950, 4000, 4050, 4100,
    4150, 4200, 4250, 4300, 4350, 4400, 4450, 4550, 4600, 4650, 4700, 4750,
    4800, 4850, 4900, 4950,
  ],
  pricePerUnit_pen: 0,
  prices: {
    50:3.70, 100:6.10, 150:8.50, 200:10.90, 250:13.40, 300:15.80, 350:18.30, 400:20.80,
    450:21.90, 500:21.90, 550:21.90, 600:21.90, 650:21.90, 700:21.90, 750:21.90,
    850:24.00, 900:26.30, 950:28.60, 1050:33.10, 1100:35.40, 1150:37.60, 1200:40.00,
    1250:42.30, 1300:44.50, 1350:46.80, 1400:49.10, 1450:51.30,
    1500:52.50, 1550:52.50, 1600:52.50, 1650:52.50, 1750:52.50, 1800:52.50, 1850:52.50,
    1900:52.50, 1950:52.50, 2000:52.50, 2050:52.50, 2100:52.50, 2150:52.50, 2200:52.50,
    2250:52.50, 2350:52.50,
    2450:52.20, 2500:54.40, 2550:56.50, 2600:58.60, 2650:60.70, 2700:62.80, 2750:64.90,
    2850:69.30, 2900:71.40, 2950:73.50, 3000:75.60, 3050:77.70,
    3100:78.80, 3150:78.80, 3200:78.80, 3250:78.80, 3300:78.80, 3350:78.80, 3400:78.80,
    3450:78.80, 3500:78.80, 3550:78.80, 3600:78.80, 3650:78.80, 3700:78.80, 3750:78.80,
    3800:78.80, 3850:78.80, 3900:78.80, 3950:78.80, 4000:78.80, 4050:78.80, 4100:78.80,
    4150:78.80, 4200:78.80, 4250:78.80, 4300:78.80, 4350:78.80, 4400:78.80, 4450:78.80,
    4550:82.00, 4600:84.10, 4650:86.20, 4700:88.30, 4750:90.40, 4800:92.50, 4850:94.70,
    4900:96.80, 4950:98.90,
  },
};

// ── Packs ──
export const PACKS_PRODUCTS: StoreProduct[] = [
  { id: 'pack-koi', name: 'Pack de Reino Koi', name_en: 'Koi Kingdom Pack',
    subtitle: '3 Outfits + 3 Mochilas + 3 Picos + Wrap + Loading Screen',
    subtitle_en: '3 Outfits + 3 Back Blings + 3 Pickaxes + Wrap + Loading Screen',
    description: 'Protege al Koi con 3 trajes exclusivos (Koi Striker Envoy, Koi Brawler Zero, Koi Agent Chigusa), mochilas retro, picos, envoltorio y pantalla de carga. Todos con estilo LEGO.',
    description_en: 'Protect the Koi with 3 exclusive outfits (Koi Striker Envoy, Koi Brawler Zero, Koi Agent Chigusa), back blings, pickaxes, wrap and loading screen. All with LEGO style.',
    amount: 1, price_pen: 23.20, originalPrice_pen: 72.50, image: '/pack-koi.png', color: '#e91e63' },
  { id: 'pack-drift', name: 'Pack de Deriva Infinita', name_en: 'Infinite Drift Pack',
    subtitle: '3 Outfits + 3 Mochilas + 3 Picos',
    subtitle_en: '3 Outfits + 3 Back Blings + 3 Pickaxes',
    description: 'Prepara tus tacticas con 3 trajes (Calavera Derivada, Deriva de la Grieta, Palito de Deriva), mochilas retro y picos. Todos con estilo LEGO.',
    description_en: 'Gear up with 3 outfits (Skull Drift, Rift Strider, Fishdrift), back blings and pickaxes. All with LEGO style.',
    amount: 1, price_pen: 23.20, originalPrice_pen: 68.90, image: '/pack-drift.png', color: '#7c4dff' },
  { id: 'pack-brite', name: 'Pack de inicio de Operación brillante', name_en: 'Operation Brite Starter Pack',
    subtitle: 'Outfit + Mochila + Lote de decoracion (13 objetos)',
    subtitle_en: 'Outfit + Back Bling + Decoration Bundle (13 items)',
    description: 'Agente Brillante esta lista para explorar. Incluye traje con estilo LEGO, mochila retro Brillo Estelar y lote de decoracion con 13 objetos para LEGO Fortnite.',
    description_en: 'Brite Agent is ready to explore. Includes outfit with LEGO style, Starshine back bling and decoration bundle with 13 items for LEGO Fortnite.',
    amount: 1, price_pen: 13.70, originalPrice_pen: 14.99, image: '/pack-brite.png', color: '#ff9800' },
];

// ── Club de Fortnite ──
export const CLUB_PRODUCTS: StoreProduct[] = [
  { id: 'club-monthly', name: 'Fortnite Crew', name_en: 'Fortnite Crew',
    subtitle: 'Suscripcion mensual',
    subtitle_en: 'Monthly subscription',
    description: 'Incluye 1,000 V-Bucks, Pase de Batalla y un pack exclusivo de skin + accesorios cada mes.',
    description_en: 'Includes 1,000 V-Bucks, Battle Pass and an exclusive skin + accessories pack each month.',
    amount: 1, price_pen: 22.10, originalPrice_pen: 39.90, image: '/fortnite-club.avif', color: '#651fff' },
];

// ── Rocket League Credits ──
export const ROCKET_PRODUCTS: StoreProduct[] = [
  { id: 'rl-500',  name: '500 — RL Credits',
    description: 'Para items basicos y blueprints.', description_en: 'For basic items and blueprints.',
    amount: 500, price_pen: 13.70, originalPrice_pen: 19.90, image: '/rl-500.webp', color: '#0091ea' },
  { id: 'rl-1100', name: '1100 — RL Credits',
    description: 'Alcanza para el Rocket Pass y mas.', description_en: 'Enough for the Rocket Pass and more.',
    amount: 1100, price_pen: 26.30, originalPrice_pen: 38.90, image: '/rl-1100.webp', color: '#00bfa5' },
  { id: 'rl-3000', name: '3000 — RL Credits',
    description: 'Ideal para trading y tienda de items.', description_en: 'Great for trading and the item shop.',
    amount: 3000, price_pen: 59.90, originalPrice_pen: 89.90, image: '/rl-3000.webp', color: '#ffab00' },
  { id: 'rl-6500', name: '6500 — RL Credits',
    description: 'El mejor valor. Para coleccionistas.', description_en: 'Best value. For collectors.',
    amount: 6500, price_pen: 116.50, originalPrice_pen: 169.90, image: '/rl-6500.webp', color: '#dd2c00' },
];

export const ROCKET_BULK: BulkProduct = {
  id: 'rl-custom', name: '— RL Credits', image: '/rl-custom.webp', color: '#00b8d4',
  tiers: [], // using explicit values instead
  values: [
    50, 100, 150, 200, 250, 300, 350, 400, 450,
    600, 700, 800, 900, 1000,
    1200, 1400, 1600, 1800, 2000,
    2100, 2300, 2400, 2500, 2800, 2900, 2950,
    3200, 3500, 3800, 3900,
  ],
  pricePerUnit_pen: 0,
  prices: {
    50:2.40, 100:3.70, 150:4.90, 200:6.20, 250:7.40, 300:8.70, 350:9.90, 400:11.20, 450:12.40,
    600:16.00, 700:17.20, 800:19.40, 900:21.70, 1000:22.90,
    1200:26.30, 1400:26.30, 1600:26.30, 1800:26.30, 2000:26.30,
    2100:26.30, 2300:26.30, 2400:26.30, 2500:26.30, 2800:26.30, 2900:26.30, 2950:26.30,
    3200:27.90, 3500:36.70, 3800:45.40, 3900:47.60,
  },
};