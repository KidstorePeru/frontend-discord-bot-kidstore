import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StorePage from './Store';

// jsdom no implementa IntersectionObserver (Store.tsx lo usa para resaltar
// la sección visible en el panel de categorías) ni Element.scrollIntoView
// (lo usa el click de una categoría) — sin estos stubs, el efecto/handler
// que los llama lanza una excepción real dentro de React.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error — stub mínimo, no implementa la interfaz completa
global.IntersectionObserver = IntersectionObserverStub;
Element.prototype.scrollIntoView = vi.fn();

// Pruebas de regresión de la última revisión de correcciones sobre el
// panel de categorías (".fnav"):
//
// (1) Antes se abría con un botón flotante fijo sobre la propia
//     cuadrícula de productos — ahora lo abre/cierra Navbar.tsx (un
//     componente hermano) por 'toggle-store-categories', y Store.tsx
//     retransmite el estado real por 'store-categories-state' para que el
//     "aria-expanded" del disparador nunca mienta sobre si el panel está
//     abierto. Estas pruebas verifican el lado de Store.tsx de ese
//     puente (el lado de Navbar.tsx ya se prueba en Navbar.test.tsx).
// (2) El panel queda SIEMPRE montado (para conservar la animación de
//     deslizamiento) pero debe quedar "inert" mientras está cerrado — sus
//     controles no deben poder recibir foco ni exponerse a lectores de
//     pantalla. Abierto, debe comportarse como un diálogo modal real
//     (foco inicial, Tab encerrado, Escape, foco de vuelta al
//     disparador) — ver useModalFocusTrap.test.tsx para esa mecánica en
//     detalle; acá se confirma que Store.tsx la conecta correctamente.

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    cart: [], addToCart: vi.fn(() => 'added'), removeFromCart: vi.fn(),
    validateAgainstShop: vi.fn(() => 0), cartTotal: 0, cartCount: 0, setCartOpen: vi.fn(),
  }),
}));
vi.mock('../context/LangContext', () => ({
  useLang: () => ({
    lang: 'es', storeLang: 'es', storeOverridden: false,
    setLang: vi.fn(), setStoreLang: vi.fn(), t: (k: string) => k,
  }),
}));
vi.mock('../services/api', () => ({
  getShop: vi.fn().mockResolvedValue({
    data: {
      date: new Date().toISOString(),
      entries: [
        {
          offerId: 'test-offer-1',
          layout: { name: 'PISTAS', rank: 1 },
          tileSize: 'Size_1_x_1',
          brItems: [{ name: 'Test Item', rarity: { displayValue: 'RARO' }, images: { icon: '' } }],
          finalPrice: 500,
          regularPrice: 500,
        },
      ],
    },
  }),
}));

afterEach(() => cleanup());

function renderStore() {
  return render(
    <MemoryRouter>
      <StorePage />
    </MemoryRouter>
  );
}

// Renderiza la página y espera a que termine la carga async real (la
// promesa de getShop) antes de devolver el panel — antes de "if (loading)
// return <PageLoader />;" (Store.tsx) el panel ni siquiera está montado.
async function waitForPanel() {
  renderStore();
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const el = document.getElementById('store-categories-panel');
    if (el) return el as HTMLElement & { inert: boolean };
    await new Promise(r => setTimeout(r, 20));
  }
  throw new Error('store-categories-panel nunca apareció');
}

describe('Store — panel de categorías (puente con Navbar + accesibilidad)', () => {
  it('toggle-store-categories (disparado por Navbar.tsx) abre el panel', async () => {
    const panel = await waitForPanel();
    expect(panel.className).not.toMatch(/open/);

    act(() => { window.dispatchEvent(new Event('toggle-store-categories')); });
    expect(panel.className).toMatch(/open/);
  });

  it('retransmite su estado real por store-categories-state en cada cambio (para el aria-expanded de Navbar.tsx)', async () => {
    await waitForPanel();
    const states: boolean[] = [];
    const handler = (e: Event) => states.push((e as CustomEvent<boolean>).detail);
    window.addEventListener('store-categories-state', handler);

    act(() => { window.dispatchEvent(new Event('toggle-store-categories')); }); // abre
    act(() => { window.dispatchEvent(new Event('toggle-store-categories')); }); // cierra

    window.removeEventListener('store-categories-state', handler);
    expect(states).toEqual([true, false]);
  });

  it('cerrado: el panel queda inert — sin foco posible ni expuesto a lectores de pantalla', async () => {
    const panel = await waitForPanel();
    expect(panel.inert).toBe(true);
  });

  it('abierto: deja de ser inert y se comporta como diálogo modal accesible (nombre + botón de cerrar con aria-label)', async () => {
    const panel = await waitForPanel();
    act(() => { window.dispatchEvent(new Event('toggle-store-categories')); });

    expect(panel.inert).toBe(false);
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-labelledby')).toBe('store-categories-title');
    expect(document.getElementById('store-categories-title')).toBeTruthy();

    const closeBtn = panel.querySelector('.fnav-h button') as HTMLButtonElement;
    expect(closeBtn.getAttribute('aria-label')).toBeTruthy();
  });

  it('al abrirse mueve el foco al botón de cerrar (encerrado dentro del panel)', async () => {
    await waitForPanel();
    act(() => { window.dispatchEvent(new Event('toggle-store-categories')); });

    const panel = document.getElementById('store-categories-panel')!;
    const closeBtn = panel.querySelector('.fnav-h button');
    expect(document.activeElement).toBe(closeBtn);
  });

  it('Escape cierra el panel, lo vuelve a dejar inert, y devuelve el foco al disparador', async () => {
    await waitForPanel();

    // Simula el botón real del navbar que dispara la apertura — el mismo
    // que useModalFocusTrap debe recordar para devolverle el foco.
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    act(() => { opener.focus(); });

    act(() => { window.dispatchEvent(new Event('toggle-store-categories')); });
    const panel = document.getElementById('store-categories-panel') as HTMLElement & { inert: boolean };
    expect(panel.className).toMatch(/open/);
    expect(panel.inert).toBe(false);

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });

    expect(panel.className).not.toMatch(/open/);
    expect(panel.inert).toBe(true);
    expect(document.activeElement).toBe(opener);

    document.body.removeChild(opener);
  });

  it('elegir una categoría cierra el panel (no se queda abierto tapando el resto de la tienda)', async () => {
    await waitForPanel();
    act(() => { window.dispatchEvent(new Event('toggle-store-categories')); });

    const panel = document.getElementById('store-categories-panel')!;
    const categoryBtn = panel.querySelector('.fnav-it') as HTMLButtonElement;
    expect(categoryBtn).toBeTruthy();

    act(() => { fireEvent.click(categoryBtn); });
    expect(panel.className).not.toMatch(/open/);
  });
});
