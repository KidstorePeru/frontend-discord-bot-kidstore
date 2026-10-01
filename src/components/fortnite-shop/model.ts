// Convierte las entradas de fortnite-api.com (vía nuestro proxy, GET
// /store/shop) en la estructura de la tienda oficial:
//   secciones (layout.rank DESC, empate layout.index ASC)
//   → grupos (número final de layoutId DESC; cada grupo es una fila propia)
//   → ofertas (sortPriority DESC; empate: orden de la API)
import type { OfferKind, ShopText } from './i18n';
import { sectionBackground } from './sectionMeta';

/* ── Tipos de la API (solo los campos que se usan) ─────────────────── */

interface ApiImageSet { icon?: string; smallIcon?: string; featured?: string; small?: string; large?: string }
interface ApiVariant { options?: unknown[] }
interface ApiItem {
  id: string;
  name?: string;
  type?: { value?: string; displayValue?: string };
  rarity?: { displayValue?: string };
  series?: { value?: string };
  images?: ApiImageSet;
  variants?: ApiVariant[];
}
interface ApiTrack {
  id?: string;
  title?: string;
  artist?: string;
  albumArt?: string;
}
export interface ApiEntry {
  offerId: string;
  devName?: string;
  regularPrice?: number;
  finalPrice: number;
  tileSize?: string;
  sortPriority?: number;
  layoutId?: string;
  inDate?: string;
  outDate?: string;
  giftable?: boolean;
  banner?: { value?: string; backendValue?: string };
  colors?: { color1?: string; color2?: string; color3?: string; textBackgroundColor?: string };
  layout?: { id: string; name?: string; category?: string; index?: number; rank?: number; displayType?: string };
  bundle?: { name?: string; info?: string; image?: string };
  newDisplayAsset?: { renderImages?: { productTag?: string; image?: string }[] };
  brItems?: ApiItem[];
  tracks?: ApiTrack[];
  cars?: ApiItem[];
  instruments?: ApiItem[];
  legoKits?: ApiItem[];
}

/* ── Modelo de la tienda ───────────────────────────────────────────── */

export type ImagePreset =
  | 'default' | 'outfit-wide' | 'bundle' | 'tool' | 'half' | 'kicks' | 'standard' | 'full' | 'square';

export interface Offer {
  id: string;
  order: number;
  sortPriority: number;
  title: string;
  subtitle: string | null;
  kind: OfferKind;
  isBundle: boolean;
  preset: ImagePreset;
  cols: 1 | 2 | 3 | 4;
  images: string[];
  colors: { gradient: string; text: string; accent: string };
  price: { final: number; regular: number; formattedFinal: string; formattedRegular: string };
  discountBanner: string | null;
  features: string[];
  outDate?: string;
  rarityLabel: string | null;
  searchText: string;
  /** Objeto que sigue la lista de deseos (el principal de la oferta) — null si no se puede seguir. */
  wish: { itemId: string; name: string; type: string; image: string } | null;
}

export interface ShopGroup { id: number; displayType: string; offers: Offer[] }
export interface ShopSection {
  id: string;
  domId: string;
  name: string;
  rank: number;
  index: number;
  category: string | null;
  background: string;
  groups: ShopGroup[];
}
export interface ShopCategory { id: string; label: string; category: string | null; sectionIds: string[] }
export interface ShopModel { sections: ShopSection[]; categories: ShopCategory[] }

const SIZE_COLS: Record<string, 1 | 2 | 3 | 4> = { Size_1_x_1: 1, Size_2_x_1: 2, Size_3_x_1: 3, Size_4_x_1: 4 };

/* ── Validación de entradas ──────────────────────────────────────────
   Lo mismo que exige el backend (validateShopEntry en shop.go): un objeto con
   offerId, precios enteros no negativos y algún contenido. Una entrada rota
   nunca llega a buildShop (podía romper el render de toda la tienda). */

const CONTENT_KEYS = ['brItems', 'tracks', 'instruments', 'cars', 'legoKits'] as const;
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isPrice = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0;

export function isValidEntry(e: unknown): e is ApiEntry {
  if (!isObject(e)) return false;
  if (typeof e.offerId !== 'string' || !e.offerId.trim()) return false;
  if (!isPrice(e.finalPrice)) return false;
  if ('regularPrice' in e && !isPrice(e.regularPrice)) return false;
  for (const key of ['layout', 'bundle']) {
    if (e[key] != null && !isObject(e[key])) return false;
  }
  let hasContent = false;
  for (const key of CONTENT_KEYS) {
    const list = e[key];
    if (list == null) continue;
    if (!Array.isArray(list) || !list.every(isObject)) return false;
    if (list.length > 0) hasContent = true;
  }
  return hasContent || isObject(e.bundle);
}

export function buildShop(entries: ApiEntry[], t: ShopText): ShopModel {
  const nf = new Intl.NumberFormat(t.locale);
  const sections = new Map<string, Omit<ShopSection, 'groups'> & { groups: Map<number, ShopGroup> }>();

  entries.forEach((entry, order) => {
    // Las entradas sin layout (p. ej. "alc.0") no se muestran en la tienda oficial.
    if (!entry.layout) return;
    const offer = toOffer(entry, order, t, nf);
    if (!offer) return;

    const { layout } = entry;
    let section = sections.get(layout.id);
    if (!section) {
      const name = layout.name?.trim() || layout.id;
      section = {
        id: layout.id,
        domId: `fns-${layout.id.toLowerCase()}`,
        name,
        rank: layout.rank ?? 0,
        index: layout.index ?? 0,
        category: layout.category?.trim() || null,
        background: sectionBackground(name),
        groups: new Map(),
      };
      sections.set(layout.id, section);
    }

    const groupId = Number(entry.layoutId?.split('.').pop()) || 0;
    let group = section.groups.get(groupId);
    if (!group) {
      group = { id: groupId, displayType: layout.displayType || 'tileGrid', offers: [] };
      section.groups.set(groupId, group);
    }
    group.offers.push(offer);
  });

  const sorted: ShopSection[] = [...sections.values()]
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map((section) => ({
      ...section,
      groups: [...section.groups.values()]
        .sort((a, b) => b.id - a.id)
        .map((group) => ({
          ...group,
          offers: group.offers.sort((a, b) => b.sortPriority - a.sortPriority || a.order - b.order),
        })),
    }));

  return { sections: sorted, categories: buildCategories(sorted) };
}

// Menú lateral: secciones consecutivas con la misma layout.category se agrupan (p. ej. "Calienta los motores").
function buildCategories(sections: ShopSection[]): ShopCategory[] {
  const categories: ShopCategory[] = [];
  for (const section of sections) {
    const last = categories[categories.length - 1];
    if (section.category && last?.category === section.category) {
      last.sectionIds.push(section.domId);
    } else {
      categories.push({
        id: section.domId,
        label: section.category || section.name,
        category: section.category,
        sectionIds: [section.domId],
      });
    }
  }
  return categories;
}

// Búsqueda (sin acentos) y filtro por tipo; elimina grupos y secciones vacíos.
export function filterShop(shop: ShopModel, query: string, types: Set<OfferKind>): ShopModel {
  const q = normalize(query);
  if (!q && types.size === 0) return shop;
  const sections = shop.sections
    .map((section) => {
      const sectionMatch = !!q && normalize(section.name).includes(q);
      const groups = section.groups
        .map((group) => ({
          ...group,
          offers: group.offers.filter(
            (o) => (!q || sectionMatch || o.searchText.includes(q)) && (types.size === 0 || types.has(o.kind)),
          ),
        }))
        .filter((g) => g.offers.length);
      return { ...section, groups };
    })
    .filter((s) => s.groups.length);
  const visible = new Set(sections.map((s) => s.domId));
  const categories = shop.categories
    .map((c) => ({ ...c, sectionIds: c.sectionIds.filter((id) => visible.has(id)) }))
    .filter((c) => c.sectionIds.length);
  return { sections, categories };
}

function normalize(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/* ── Oferta individual ─────────────────────────────────────────────── */

const TYPE_KIND: Record<string, OfferKind> = {
  emote: 'emote',
  pickaxe: 'pickaxe',
  backpack: 'backpack',
  glider: 'glider',
  wrap: 'wrap',
  shoe: 'shoe',
  sidekick: 'sidekick',
};

function toOffer(entry: ApiEntry, order: number, t: ShopText, nf: Intl.NumberFormat): Offer | null {
  const br = entry.brItems ?? [];
  const car = entry.cars?.[0];
  const instrument = entry.instruments?.[0];
  // Solo es "pista" si la oferta no trae nada más (los lotes de artistas también incluyen pistas).
  const track = !entry.bundle && !br.length && !car && !instrument ? entry.tracks?.[0] ?? null : null;
  const outfit = br.find((i) => i.type?.value === 'outfit');
  const main = outfit ?? br[0] ?? car ?? instrument ?? entry.legoKits?.[0];

  const title = entry.bundle?.name || track?.title || main?.name || nameFromDevName(entry.devName);
  if (!title) return null;

  const kind: OfferKind = track
    ? 'jamtrack'
    : car
      ? 'car'
      : entry.bundle
        ? 'bundle'
        : outfit
          ? 'outfit'
          : instrument && !br.length
            ? 'instrument'
            : TYPE_KIND[br[0]?.type?.value ?? ''] || 'other';

  const cols = SIZE_COLS[entry.tileSize ?? ''] ?? 1;
  const images = offerImages(entry, track, car, instrument, main);
  if (!images.length) return null;

  const regular = entry.regularPrice ?? entry.finalPrice;
  const final = entry.finalPrice;

  let discountBanner: string | null = null;
  const features: string[] = [];
  if (entry.banner?.value) {
    if (entry.banner.backendValue === 'AmountOff') {
      discountBanner = regular > final ? t.amountOff(nf.format(regular - final)) : entry.banner.value;
    } else {
      features.push(entry.banner.value);
    }
  }
  if (br.some((i) => i.variants?.some((v) => (v.options?.length ?? 0) > 1))) features.push(t.selectableStyles);

  // Nombres de todo lo que incluye la oferta: la búsqueda también los encuentra
  // (buscar "pico" encuentra el lote que trae ese pico).
  const includedNames = [...br, ...(entry.cars ?? []), ...(entry.instruments ?? [])].map((i) => i.name ?? '');

  return {
    id: entry.offerId,
    order,
    sortPriority: entry.sortPriority ?? 0,
    title,
    subtitle: track?.artist || null,
    kind,
    isBundle: kind === 'bundle' || br.length > 1 || (entry.cars?.length ?? 0) > 1,
    preset: imagePreset(kind, cols, br.length),
    cols,
    images,
    colors: offerColors(entry.colors),
    price: { final, regular, formattedFinal: nf.format(final), formattedRegular: nf.format(regular) },
    discountBanner,
    features,
    outDate: entry.outDate,
    rarityLabel: main?.series?.value || main?.rarity?.displayValue || null,
    searchText: normalize([title, track?.artist, ...includedNames].join(' ')),
    wish: wishTarget(main?.id || track?.id, title, main?.type?.displayValue ?? (track ? t.jamTrack : ''), images[0]),
  };
}

// La lista de deseos sigue al objeto principal de la oferta (la skin de un
// lote, la pista, el auto…): si vuelve solo o en otro lote, igual avisa.
function wishTarget(itemId: string | undefined, name: string, type: string, image: string | undefined) {
  if (!itemId || !/^[A-Za-z0-9_.:-]{1,150}$/.test(itemId)) return null;
  return { itemId, name, type, image: image && image.startsWith('https://') ? image : '' };
}

// Presets de posición de imagen de la tienda oficial (ver fortnite-shop.css).
function imagePreset(kind: OfferKind, cols: number, brCount: number): ImagePreset {
  if (kind === 'jamtrack') return 'square';
  if (kind === 'car') return cols >= 2 ? 'full' : 'standard';
  if (kind === 'bundle' || (kind === 'outfit' && brCount > 1)) return 'bundle';
  if (kind === 'outfit') return cols > 1 ? 'outfit-wide' : 'default';
  if (kind === 'pickaxe' || kind === 'instrument') return 'tool';
  if (kind === 'backpack' || kind === 'glider') return 'half';
  if (kind === 'shoe') return 'kicks';
  return 'standard';
}

function offerImages(
  entry: ApiEntry,
  track: ApiTrack | null,
  car: ApiItem | undefined,
  instrument: ApiItem | undefined,
  main: ApiItem | undefined,
): string[] {
  if (track?.albumArt) return [track.albumArt];
  const renders = entry.newDisplayAsset?.renderImages ?? [];
  const brRenders = renders.filter((r) => r.productTag === 'Product.BR');
  const list = (brRenders.length ? brRenders : renders).map((r) => r.image).filter((u): u is string => !!u);
  if (list.length) return [...new Set(list)];
  const fallback =
    entry.bundle?.image || main?.images?.featured || main?.images?.icon || car?.images?.large || instrument?.images?.large;
  return fallback ? [fallback] : [];
}

function hex(c?: string): string | null {
  return c && c.length >= 6 ? `#${c.slice(0, 6)}` : null;
}

// La tienda oficial pinta el fondo con color1 → color2 → color3; en fortnite-api color2/color3 vienen invertidos.
function offerColors(colors: ApiEntry['colors'] = {}) {
  const stops = [hex(colors.color1), hex(colors.color3), hex(colors.color2)].filter((s): s is string => !!s);
  if (!stops.length) stops.push('#3d8fe0', '#1f6cc4', '#0f4d99');
  if (stops.length === 1) stops.push(stops[0]);
  return {
    gradient: `linear-gradient(${stops.join(', ')})`,
    text: hex(colors.textBackgroundColor) || stops[stops.length - 1],
    accent: stops[0],
  };
}

function nameFromDevName(devName?: string): string | null {
  const m = devName?.match(/\[VIRTUAL\]\d+ x (.+?)(?:,| for )/);
  const name = m?.[1]?.trim();
  return name && name !== 'Blank' && !name.startsWith('TBD') ? name : null;
}


/* ── "LO MÁS VENDIDO DE HOY" ───────────────────────────────────────── */

export const BEST_SELLERS_ID = 'bestsellers';

// Inserta al principio la sección de más vendidos, con las ofertas en el orden
// del ranking (GET /store/shop/bestsellers — ventas reales de KidStorePeru).
// Como en la tienda oficial, todas van como tarjetas de 1 columna y se repiten
// además en su sección original. Los ids que ya no estén en la tienda se
// ignoran; sin ninguno, la tienda queda igual.
export function withBestSellers(shop: ShopModel, offerIds: string[], title: string): ShopModel {
  if (!offerIds.length) return shop;
  const byId = new Map<string, Offer>();
  for (const s of shop.sections) for (const g of s.groups) for (const o of g.offers) if (!byId.has(o.id)) byId.set(o.id, o);
  const offers = offerIds
    .map((id) => byId.get(id))
    .filter((o): o is Offer => !!o)
    .map((o) => ({ ...o, cols: 1 as const, preset: o.preset === 'outfit-wide' ? ('default' as const) : o.preset === 'full' ? ('standard' as const) : o.preset }));
  if (!offers.length) return shop;
  const section: ShopSection = {
    id: BEST_SELLERS_ID,
    domId: `fns-${BEST_SELLERS_ID}`,
    name: title,
    rank: Number.MAX_SAFE_INTEGER,
    index: 0,
    category: null,
    background: sectionBackground('LO MÁS VENDIDO DE HOY'),
    groups: [{ id: 0, displayType: 'tileGrid', offers }],
  };
  const sections = [section, ...shop.sections];
  return { sections, categories: [{ id: section.domId, label: title, category: null, sectionIds: [section.domId] }, ...shop.categories] };
}
