import { describe, it, expect } from 'vitest';
import { buildShop, filterShop, isValidEntry, withBestSellers, type ApiEntry } from './model';
import { SHOP_LANGS, type ShopText } from './i18n';

// Regresiones del orden exacto de la tienda oficial (ver PROMPT-tienda-fortnite.md §2):
//   secciones por layout.rank DESC (empate: layout.index ASC)
//   → grupos por el número final de layoutId DESC
//   → ofertas por sortPriority DESC (empate: orden de la API)
// más el filtro sin acentos y por tipo.

const t = SHOP_LANGS.es;

function entry(over: Partial<ApiEntry> & { offerId: string }): ApiEntry {
  return {
    finalPrice: 500,
    regularPrice: 500,
    tileSize: 'Size_1_x_1',
    sortPriority: 0,
    layoutId: 'sec.1',
    brItems: [{ id: 'i-' + over.offerId, name: 'Item ' + over.offerId, type: { value: 'outfit', displayValue: 'Atuendo' }, images: { icon: 'https://x/icon.png' } }],
    layout: { id: 'sec', name: 'Sección', rank: 0, index: 0, displayType: 'tileGrid' },
    ...over,
  };
}

describe('buildShop — orden', () => {
  it('ordena las secciones por rank DESC, empate por index ASC', () => {
    const entries: ApiEntry[] = [
      entry({ offerId: 'a', layout: { id: 'low', name: 'Baja', rank: 1, index: 0 } }),
      entry({ offerId: 'b', layout: { id: 'hi', name: 'Alta', rank: 5, index: 0 } }),
      entry({ offerId: 'c', layout: { id: 'mid1', name: 'Media 1', rank: 3, index: 1 } }),
      entry({ offerId: 'd', layout: { id: 'mid0', name: 'Media 0', rank: 3, index: 0 } }),
    ];
    const shop = buildShop(entries, t);
    expect(shop.sections.map((s) => s.id)).toEqual(['hi', 'mid0', 'mid1', 'low']);
  });

  it('ignora entradas sin layout (piezas sueltas de un lote, no comprables)', () => {
    const entries: ApiEntry[] = [
      entry({ offerId: 'a' }),
      { offerId: 'sin-layout', finalPrice: 100, brItems: [{ id: 'x', name: 'X' }] } as ApiEntry,
    ];
    const shop = buildShop(entries, t);
    const allIds = shop.sections.flatMap((s) => s.groups.flatMap((g) => g.offers.map((o) => o.id)));
    expect(allIds).toEqual(['a']);
  });

  it('agrupa por el número final de layoutId DESC — cada grupo es su propia fila', () => {
    const entries: ApiEntry[] = [
      entry({ offerId: 'a', layoutId: 'sec.1' }),
      entry({ offerId: 'b', layoutId: 'sec.99' }),
      entry({ offerId: 'c', layoutId: 'sec.50' }),
    ];
    const shop = buildShop(entries, t);
    expect(shop.sections[0].groups.map((g) => g.id)).toEqual([99, 50, 1]);
  });

  it('ordena las ofertas dentro de un grupo por sortPriority DESC, empate por orden de la API', () => {
    const entries: ApiEntry[] = [
      entry({ offerId: 'a', sortPriority: 1 }),
      entry({ offerId: 'b', sortPriority: 5 }),
      entry({ offerId: 'c', sortPriority: 5 }), // empata con b, pero llegó después → va después
    ];
    const shop = buildShop(entries, t);
    expect(shop.sections[0].groups[0].offers.map((o) => o.id)).toEqual(['b', 'c', 'a']);
  });

  it('agrupa el menú de categorías: secciones consecutivas con la misma layout.category se fusionan', () => {
    const entries: ApiEntry[] = [
      entry({ offerId: 'a', layout: { id: 's1', name: 'Uno', rank: 3, index: 0, category: 'Motores' } }),
      entry({ offerId: 'b', layout: { id: 's2', name: 'Dos', rank: 2, index: 0, category: 'Motores' } }),
      entry({ offerId: 'c', layout: { id: 's3', name: 'Tres', rank: 1, index: 0 } }),
    ];
    const shop = buildShop(entries, t);
    expect(shop.categories).toHaveLength(2);
    expect(shop.categories[0]).toMatchObject({ label: 'Motores', sectionIds: ['fns-s1', 'fns-s2'] });
    expect(shop.categories[1]).toMatchObject({ label: 'Tres', sectionIds: ['fns-s3'] });
  });
});

describe('filterShop — búsqueda y filtro por tipo', () => {
  const entries: ApiEntry[] = [
    entry({ offerId: 'a', layout: { id: 's1', name: 'Sección Uno', rank: 2, index: 0 } }),
    entry({
      offerId: 'b',
      layout: { id: 's2', name: 'Sección Dos', rank: 1, index: 0 },
      brItems: [{ id: 'peak', name: 'Peak Águila', type: { value: 'outfit', displayValue: 'Atuendo' }, images: { icon: 'https://x/icon.png' } }],
    }),
  ];
  const shop = buildShop(entries, t);

  it('la búsqueda ignora acentos y mayúsculas', () => {
    const r = filterShop(shop, 'aguila', new Set());
    const ids = r.sections.flatMap((s) => s.groups.flatMap((g) => g.offers.map((o) => o.id)));
    expect(ids).toEqual(['b']);
  });

  it('un texto que coincide con el NOMBRE de la sección muestra todos sus ítems', () => {
    const r = filterShop(shop, 'Sección Uno', new Set());
    const ids = r.sections.flatMap((s) => s.groups.flatMap((g) => g.offers.map((o) => o.id)));
    expect(ids).toEqual(['a']);
  });

  it('elimina secciones y grupos que quedan vacíos tras filtrar', () => {
    const r = filterShop(shop, 'no existe ningún objeto así', new Set());
    expect(r.sections).toHaveLength(0);
    expect(r.categories).toHaveLength(0);
  });

  it('sin búsqueda ni filtro, devuelve la tienda completa sin copiar de más', () => {
    const r = filterShop(shop, '', new Set());
    expect(r).toBe(shop);
  });
});

describe('withBestSellers — "LO MÁS VENDIDO DE HOY"', () => {
  const shop = buildShop([
    entry({ offerId: 'a', layout: { id: 's1', name: 'Uno', rank: 2, index: 0 } }),
    entry({ offerId: 'b', tileSize: 'Size_2_x_1', layout: { id: 's2', name: 'Dos', rank: 1, index: 0 } }),
  ], t);

  it('inserta la sección al principio, en el orden del ranking, en tarjetas de 1 columna', () => {
    const r = withBestSellers(shop, ['b', 'a'], 'Lo más vendido de hoy');
    expect(r.sections[0].name).toBe('Lo más vendido de hoy');
    expect(r.sections[0].groups[0].offers.map((o) => [o.id, o.cols])).toEqual([['b', 1], ['a', 1]]);
    expect(r.categories[0]).toMatchObject({ label: 'Lo más vendido de hoy', sectionIds: ['fns-bestsellers'] });
    // Las secciones originales siguen igual (los objetos se repiten, como en la oficial).
    expect(r.sections.slice(1).map((s) => s.id)).toEqual(['s1', 's2']);
    expect(r.sections[2].groups[0].offers[0].cols).toBe(2);
  });

  it('ignora ids que ya no están en la tienda; sin ninguno válido la tienda no cambia', () => {
    expect(withBestSellers(shop, ['rotado', 'a'], 'X').sections[0].groups[0].offers.map((o) => o.id)).toEqual(['a']);
    expect(withBestSellers(shop, ['rotado'], 'X')).toBe(shop);
    expect(withBestSellers(shop, [], 'X')).toBe(shop);
  });

  it('el filtro por tipo también aplica a la sección de más vendidos', () => {
    const r = filterShop(withBestSellers(shop, ['a'], 'X'), '', new Set(['emote']));
    expect(r.sections).toHaveLength(0);
  });
});

// Regresión: una entrada rota del catálogo (sin offerId, precio no numérico,
// listas que no son listas de objetos…) llegaba a buildShop y podía romper la
// tienda entera. isValidEntry aplica las mismas reglas que el backend.
describe('isValidEntry', () => {
  const ok = { offerId: 'a', finalPrice: 500, regularPrice: 800, brItems: [{ name: 'X' }] };
  it('acepta entradas válidas de distintos tipos', () => {
    expect(isValidEntry(ok)).toBe(true);
    expect(isValidEntry({ offerId: 'b', finalPrice: 0, tracks: [{ title: 'T' }] })).toBe(true);
    expect(isValidEntry({ offerId: 'c', finalPrice: 1200, bundle: { name: 'Lote' }, brItems: [] })).toBe(true);
    expect(isValidEntry({ offerId: 'd', finalPrice: 300, cars: [{ name: 'C' }], layout: null })).toBe(true);
  });
  it.each([
    ['null', null],
    ['texto', 'x'],
    ['sin offerId', { finalPrice: 500, brItems: [{}] }],
    ['offerId vacío', { ...ok, offerId: ' ' }],
    ['precio texto', { ...ok, finalPrice: 'gratis' }],
    ['precio negativo', { ...ok, finalPrice: -1 }],
    ['precio decimal', { ...ok, finalPrice: 1.5 }],
    ['regularPrice null', { ...ok, regularPrice: null }],
    ['sin contenido', { offerId: 'a', finalPrice: 500 }],
    ['brItems no es lista', { ...ok, brItems: { name: 'X' } }],
    ['brItems con null', { ...ok, brItems: [null] }],
    ['layout no es objeto', { ...ok, layout: 'x' }],
  ])('rechaza %s', (_name, value) => {
    expect(isValidEntry(value)).toBe(false);
  });
});

describe('buildShop — cintas y material de la tarjeta (como la tienda oficial)', () => {
  const offersOf = (entries: ApiEntry[], lang: ShopText = t) => buildShop(entries, lang).sections.flatMap((s) => s.groups.flatMap((g) => g.offers));

  it('la etiqueta va como cinta: amarilla si es de intensidad alta, con signos de exclamación', () => {
    const [a, b, c] = offersOf([
      entry({ offerId: 'a', banner: { value: 'Personalizable', backendValue: 'Customizable', intensity: 'High' } }),
      entry({ offerId: 'b', banner: { value: 'Reacciona a la música', backendValue: 'MusicianPickaxe', intensity: 'High' } }),
      entry({ offerId: 'c' }),
    ]);
    expect(a.ribbon).toEqual({ text: '¡Personalizable!', high: true });
    expect(b.ribbon).toEqual({ text: '¡Reacciona a la música!', high: true });
    expect(c.ribbon).toBeNull();
    expect(a.features).not.toContain('Personalizable');
  });

  it('en inglés solo lleva el signo final', () => {
    const [a] = offersOf([entry({ offerId: 'a', banner: { value: 'New', backendValue: 'New', intensity: 'High' } })], SHOP_LANGS.en);
    expect(a.ribbon).toEqual({ text: 'New!', high: true });
  });

  it('el descuento es una cinta blanca con lo que se ahorra', () => {
    const [a] = offersOf([entry({ offerId: 'a', regularPrice: 2000, finalPrice: 1500, banner: { value: '500 monedas V de descuento', backendValue: 'AmountOff', intensity: 'Low' } })]);
    expect(a.ribbon).toEqual({ text: '500 monedas V de descuento', high: false });
  });

  it('el material holográfico activa el fondo animado; los demás no', () => {
    const [holo, glitch, plain] = offersOf([
      entry({ offerId: 'a', tileBackgroundMaterial: 'ShopTile_Holographic' }),
      entry({ offerId: 'b', tileBackgroundMaterial: 'ShopTile_Glitch' }),
      entry({ offerId: 'c' }),
    ]);
    expect([holo.holo, glitch.holo, plain.holo]).toEqual([true, false, false]);
  });
});
