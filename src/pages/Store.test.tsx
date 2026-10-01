import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StorePage from './Store';
import { CartProvider, useCart } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { LangProvider } from '../context/LangContext';
import type { Customer } from '../types';

// Regresiones de la tienda renovada:
//  - compra DIRECTA desde la tarjeta (botón de carrito, sin modal de detalle), con el
//    mismo CartItem de siempre para que carrito, confirmación y pedido no cambien;
//  - "LO MÁS VENDIDO DE HOY" armado con el ranking del backend;
//  - el selector ES/EN de la tienda cambia el idioma de todo el sitio.

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error — stub mínimo
global.IntersectionObserver = IntersectionObserverStub;

// jsdom no implementa matchMedia (lo usa CardMedia para prefers-reduced-motion).
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function customer(over: Partial<Customer> = {}): Customer {
  return {
    id: 'c1', epic_username: 'TesterEpic', email: 't@example.com', kc_balance: 5000,
    has_password: true, google_linked: false, discord_linked: false, is_verified: true,
    created_at: new Date().toISOString(), ...over,
  } as Customer;
}

let mockCustomer: Customer | null = customer();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ customer: mockCustomer, refresh: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('../context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'PEN', rates: { rates: { PEN: 1 } } }),
}));

function entry(offerId: string, name: string, section: string, rank: number, price: number) {
  return {
    offerId, finalPrice: price, regularPrice: price, tileSize: 'Size_1_x_1', sortPriority: 0, layoutId: `${section}.1`,
    layout: { id: section, name: section, rank, index: 0, displayType: 'tileGrid' },
    brItems: [{ id: 'i-' + offerId, name, type: { value: 'outfit', displayValue: 'Atuendo' }, images: { icon: 'https://x/icon.png' } }],
    newDisplayAsset: { renderImages: [{ productTag: 'Product.BR', image: 'https://x/render.png' }] },
  };
}

const SHOP_JSON = {
  status: 200,
  data: {
    date: new Date().toISOString(),
    entries: [
      entry('offer-1', 'Objeto de prueba', 'Sección A', 2, 800),
      entry('offer-2', 'Otro objeto', 'Sección B', 1, 1200),
    ],
  },
};

let bestSellers: string[] | 'fail' = [];
// Cómo responde el catálogo: 'ok', 'fail' (red caída) o un cuerpo roto.
let shopMode: 'ok' | 'fail' | 'empty' | 'malformed' = 'ok';
// Peticiones a la lista de deseos (campana de las tarjetas).
let wishlistCalls: { method: string; body: unknown }[] = [];

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn((url: string, opts?: RequestInit) => {
    if (String(url).includes('/store/wishlist')) {
      wishlistCalls.push({ method: opts?.method ?? 'GET', body: opts?.body ? JSON.parse(String(opts.body)) : null });
      return Promise.resolve(new Response(JSON.stringify({ success: true, items: [], limit: 30 }), { status: 200 }));
    }
    if (String(url).includes('/store/shop/bestsellers')) {
      if (bestSellers === 'fail') return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(new Response(JSON.stringify({ offer_ids: bestSellers }), { status: 200 }));
    }
    if (shopMode === 'fail') return Promise.reject(new TypeError('Failed to fetch'));
    if (shopMode === 'empty') return Promise.resolve(new Response(JSON.stringify({ status: 200, data: { date: 'x', entries: [] } }), { status: 200 }));
    if (shopMode === 'malformed') {
      // Un catálogo "nuevo" con una entrada buena y otras rotas.
      const broken = { status: 200, data: { date: 'y', entries: [
        entry('offer-9', 'Objeto nuevo', 'Sección A', 1, 500),
        { offerId: 'roto-1', finalPrice: 'gratis', brItems: [{ name: 'X' }] },
        { finalPrice: 500, brItems: [{ name: 'Sin id' }] },
        null,
      ] } };
      return Promise.resolve(new Response(JSON.stringify(broken), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify(SHOP_JSON), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }));
}

// Expone si el carrito está abierto (el panel real vive en App.tsx, no en esta página).
function CartOpenProbe() {
  const { cartOpen } = useCart();
  return <span data-testid="cart-open">{String(cartOpen)}</span>;
}

function renderStore() {
  return render(
    <MemoryRouter>
      <LangProvider>
        <CartProvider>
          <WishlistProvider>
            <StorePage />
            <CartOpenProbe />
          </WishlistProvider>
        </CartProvider>
      </LangProvider>
    </MemoryRouter>
  );
}

const cartOf = () => JSON.parse(localStorage.getItem('kc_cart_c1') || '[]');

beforeEach(() => {
  mockCustomer = customer();
  bestSellers = [];
  shopMode = 'ok';
  wishlistCalls = [];
  localStorage.clear();
  localStorage.setItem('kc_lang', 'es');
  stubFetch();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Store — compra directa desde la tarjeta', () => {
  it('el botón de carrito agrega el objeto con el CartItem de siempre y abre el carrito', async () => {
    const { getByLabelText, getByTestId, getAllByText } = renderStore();
    await waitFor(() => expect(getByLabelText(/^Agregar Objeto de prueba al carrito/)).toBeTruthy());
    expect(getByTestId('cart-open').textContent).toBe('false');

    fireEvent.click(getByLabelText(/^Agregar Objeto de prueba al carrito/));

    await waitFor(() => expect(cartOf()).toHaveLength(1));
    expect(cartOf()[0]).toMatchObject({
      offerId: 'offer-1', name: 'Objeto de prueba', finalPrice: 800, regularPrice: 800,
      price_kc: 800, // vbucksToKC es 1:1
      isBundle: false,
    });
    expect(getByTestId('cart-open').textContent).toBe('true'); // primer objeto: se abre el carrito
    expect(getAllByText('En tu carrito').length).toBe(1);
    expect(getByLabelText(/^Quitar Objeto de prueba del carrito/).getAttribute('aria-pressed')).toBe('true');
  });

  it('volver a tocarlo lo quita del carrito', async () => {
    const { getByLabelText, queryByText } = renderStore();
    await waitFor(() => expect(getByLabelText(/^Agregar Objeto de prueba al carrito/)).toBeTruthy());
    fireEvent.click(getByLabelText(/^Agregar Objeto de prueba al carrito/));
    await waitFor(() => expect(cartOf()).toHaveLength(1));
    fireEvent.click(getByLabelText(/^Quitar Objeto de prueba del carrito/));
    await waitFor(() => expect(cartOf()).toHaveLength(0));
    expect(queryByText('En tu carrito')).toBeNull();
  });

  it('se pueden agregar varios objetos distintos, uno por uno', async () => {
    const { getByLabelText } = renderStore();
    await waitFor(() => expect(getByLabelText(/^Agregar Objeto de prueba al carrito/)).toBeTruthy());
    fireEvent.click(getByLabelText(/^Agregar Objeto de prueba al carrito/));
    await waitFor(() => expect(cartOf()).toHaveLength(1));
    fireEvent.click(getByLabelText(/^Agregar Otro objeto al carrito/));
    await waitFor(() => expect(cartOf()).toHaveLength(2));
    expect(cartOf().map((i: { offerId: string }) => i.offerId)).toEqual(['offer-1', 'offer-2']);
  });

  it('sin sesión iniciada muestra el modal de inicio de sesión y no toca el carrito', async () => {
    mockCustomer = null;
    const { getByLabelText, getByText } = renderStore();
    await waitFor(() => expect(getByLabelText(/^Agregar Objeto de prueba al carrito/)).toBeTruthy());
    fireEvent.click(getByLabelText(/^Agregar Objeto de prueba al carrito/));
    await waitFor(() => expect(getByText('¡Inicia sesión para comprar!')).toBeTruthy());
    expect(localStorage.getItem('kc_cart_c1')).toBeNull();
  });

  it('la campana de la tarjeta sigue el objeto principal en la lista de deseos', async () => {
    const { getByLabelText, findByText } = renderStore();
    await waitFor(() => expect(getByLabelText('Avísame cuando Objeto de prueba vuelva a la tienda')).toBeTruthy());
    fireEvent.click(getByLabelText('Avísame cuando Objeto de prueba vuelva a la tienda'));
    await waitFor(() => expect(wishlistCalls.find((c) => c.method === 'POST')).toBeTruthy());
    expect(wishlistCalls.find((c) => c.method === 'POST')?.body).toEqual({
      item_id: 'i-offer-1', name: 'Objeto de prueba', item_type: 'Atuendo', image: 'https://x/render.png',
    });
    await findByText('Listo: te avisaremos cuando Objeto de prueba vuelva a la tienda.');
    expect(getByLabelText('Dejar de seguir Objeto de prueba').getAttribute('aria-pressed')).toBe('true');
  });

  it('sin sesión, la campana pide iniciar sesión para recibir avisos', async () => {
    mockCustomer = null;
    const { getByLabelText, getByText } = renderStore();
    await waitFor(() => expect(getByLabelText('Avísame cuando Objeto de prueba vuelva a la tienda')).toBeTruthy());
    fireEvent.click(getByLabelText('Avísame cuando Objeto de prueba vuelva a la tienda'));
    await waitFor(() => expect(getByText('¡Inicia sesión para recibir avisos!')).toBeTruthy());
    expect(wishlistCalls).toHaveLength(0);
  });

  it('tocar la tarjeta fuera del botón no abre ningún detalle (ya no hay modal)', async () => {
    const { getByText, container } = renderStore();
    await waitFor(() => expect(getByText('Objeto de prueba')).toBeTruthy());
    fireEvent.click(getByText('Objeto de prueba'));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(cartOf()).toHaveLength(0);
  });
});

// Regresión: las tarjetas mostraban un precio en S/ / $ / € como si los objetos
// se cobraran en divisas. Se cobran en KidCoins (1 monedas V = 1 KC): la divisa
// solo aparece al recargar KC.
describe('Store — precio en KidCoins', () => {
  it('cada tarjeta muestra lo que se cobra en KC y ningún importe en divisas', async () => {
    localStorage.setItem('kc_currency', 'USD');
    const { container } = renderStore();
    await waitFor(() => expect(container.querySelectorAll('.fns-card').length).toBe(2));
    // El precio en KC es el propio botón de compra.
    const buttons = [...container.querySelectorAll('.fns-card__cart')];
    expect(buttons.map(b => b.textContent)).toEqual(expect.arrayContaining(['800 KC', '1,200 KC']));
    expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual(expect.arrayContaining([
      'Agregar Objeto de prueba al carrito por 800 KC', 'Agregar Otro objeto al carrito por 1,200 KC',
    ]));
    const cards = [...container.querySelectorAll('.fns-card')].map(c => c.textContent ?? '');
    for (const text of cards) expect(text).not.toMatch(/S\/|\$|€|US\$/);
  });
});

describe('Store — lo más vendido de hoy', () => {
  it('aparece primero, en el orden del ranking, sin inflar el total de objetos disponibles', async () => {
    bestSellers = ['offer-2', 'offer-1', 'ya-no-esta'];
    const { getAllByRole, container } = renderStore();
    await waitFor(() => expect(container.querySelector('#fns-bestsellers')).not.toBeNull());

    const titles = getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
    expect(titles[0]).toBe('Lo más vendido de hoy');
    const names = [...container.querySelectorAll('#fns-bestsellers .fns-card__title')].map((e) => e.textContent);
    expect(names).toEqual(['Otro objeto', 'Objeto de prueba']); // "ya-no-esta" se ignora
    // 2 objetos disponibles, no 4: los repetidos de "lo más vendido" no cuentan.
    expect(container.querySelector('.fns-header__eyebrow')?.textContent).toContain('2 objetos disponibles');
  });

  it('si el ranking falla, la tienda funciona igual sin esa sección', async () => {
    bestSellers = 'fail';
    const { getByText, container } = renderStore();
    await waitFor(() => expect(getByText('Objeto de prueba')).toBeTruthy());
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('#fns-bestsellers')).toBeNull();
    expect(container.querySelectorAll('.fns-section')).toHaveLength(2);
  });
});

describe('Store — idioma', () => {
  it('el selector ES/EN de la tienda cambia el idioma de todo el sitio y pide el catálogo en ese idioma', async () => {
    const { getByText, getByLabelText } = renderStore();
    await waitFor(() => expect(getByLabelText(/^Agregar Objeto de prueba al carrito/)).toBeTruthy());
    fireEvent.click(getByText('EN'));
    await waitFor(() => expect(localStorage.getItem('kc_lang')).toBe('en'));
    const urls = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0]));
    await waitFor(() => expect(urls.some((u) => u.includes('/store/shop?lang=en'))).toBe(true));
    expect(getByText('EN').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Store — fallo al actualizar el catálogo', () => {
  it.each([['red caída', 'fail'], ['catálogo vacío', 'empty'], ['entradas malformadas', 'malformed']] as const)(
    'con %s conserva los objetos, avisa que no se actualizaron y "Reintentar" recupera', async (_name, mode) => {
      const { getByText, getByLabelText, queryByRole, queryByText, findByRole } = renderStore();
      await waitFor(() => expect(getByText('Objeto de prueba')).toBeTruthy());

      shopMode = mode;
      fireEvent.click(getByLabelText('Actualizar')); // fuerza la consulta (salta la caché)
      const alert = await findByRole('alert');
      expect(alert.textContent).toContain('No se pudo actualizar la tienda');
      expect(getByText('Objeto de prueba')).toBeTruthy(); // los productos siguen ahí
      expect(queryByText('Objeto nuevo')).toBeNull(); // no se mezcla con un catálogo roto

      shopMode = 'ok';
      fireEvent.click(getByText('Reintentar'));
      await waitFor(() => expect(queryByRole('alert')).toBeNull());
      expect(getByText('Objeto de prueba')).toBeTruthy();
    });

  it('si falla el cambio de idioma, lo dice (los objetos visibles son del idioma anterior)', async () => {
    // Módulos frescos: la caché de catálogo del módulo no debe traer el inglés ya cargado.
    vi.resetModules();
    const { default: FreshStore } = await import('./Store');
    const { CartProvider: FreshCart } = await import('../context/CartContext');
    const { LangProvider: FreshLang } = await import('../context/LangContext');
    const { WishlistProvider: FreshWishlist } = await import('../context/WishlistContext');
    const { getByText, findByRole } = render(
      <MemoryRouter><FreshLang><FreshCart><FreshWishlist><FreshStore /></FreshWishlist></FreshCart></FreshLang></MemoryRouter>,
    );
    await waitFor(() => expect(getByText('Objeto de prueba')).toBeTruthy());
    shopMode = 'fail';
    fireEvent.click(getByText('EN'));
    const alert = await findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the shop in English");
    expect(getByText('Objeto de prueba')).toBeTruthy();
  });
});

