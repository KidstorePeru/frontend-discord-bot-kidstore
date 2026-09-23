import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

// Pruebas de regresión de la última revisión de correcciones al acceso a
// categorías de la tienda:
//
// (1) "location.pathname === '/store'" solo cubría esa variante EXACTA —
//     React Router monta StorePage igual para "/store/" (y cualquier
//     cantidad de barras finales), pero el botón de categorías desaparecía
//     ahí aunque la tienda SÍ estuviera montada. Ahora se normaliza la
//     barra final antes de comparar.
// (2) El botón vive en Navbar.tsx (un componente hermano de Store.tsx, sin
//     estado compartido) y necesita reflejar el estado REAL del panel via
//     "aria-expanded" — sincronizado por el evento 'store-categories-state'
//     que Store.tsx retransmite en cada cambio. Si ese puente se rompe,
//     aria-expanded queda mintiendo sobre si el panel está abierto o no.

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ customer: null, logout: vi.fn(), isAdmin: false }),
}));
vi.mock('../context/LangContext', () => ({
  useLang: () => ({ lang: 'es', setLang: vi.fn(), t: (k: string) => k }),
}));
vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ toggleTheme: vi.fn(), isDark: false }),
}));
vi.mock('../context/CartContext', () => ({
  useCart: () => ({ cartCount: 0, setCartOpen: vi.fn() }),
}));
vi.mock('./CurrencySelector', () => ({ default: () => null }));
vi.mock('../hooks/useCountUp', () => ({ useCountUp: (v: number) => v }));

afterEach(() => cleanup());

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar — acceso a categorías de la tienda', () => {
  it('aparece en /store', () => {
    const { getByLabelText } = renderAt('/store');
    expect(getByLabelText('store.nav')).toBeTruthy();
  });

  it('aparece en /store/ (barra final) — variante que React Router también monta como StorePage', () => {
    const { getByLabelText } = renderAt('/store/');
    expect(getByLabelText('store.nav')).toBeTruthy();
  });

  it('aparece en /store// (varias barras finales)', () => {
    const { getByLabelText } = renderAt('/store//');
    expect(getByLabelText('store.nav')).toBeTruthy();
  });

  it('NO aparece fuera de la tienda', () => {
    const { queryByLabelText } = renderAt('/dashboard');
    expect(queryByLabelText('store.nav')).toBeNull();
  });

  it('declara aria-controls apuntando al panel real de categorías', () => {
    const { getByLabelText } = renderAt('/store');
    expect(getByLabelText('store.nav').getAttribute('aria-controls')).toBe('store-categories-panel');
  });

  it('aria-expanded arranca en false y sigue el estado real retransmitido por Store.tsx', () => {
    const { getByLabelText } = renderAt('/store');
    const btn = getByLabelText('store.nav');
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      window.dispatchEvent(new CustomEvent('store-categories-state', { detail: true }));
    });
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      window.dispatchEvent(new CustomEvent('store-categories-state', { detail: false }));
    });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('al hacer click despacha toggle-store-categories para que Store.tsx abra/cierre el panel', () => {
    const { getByLabelText } = renderAt('/store');
    const handler = vi.fn();
    window.addEventListener('toggle-store-categories', handler);
    fireEvent.click(getByLabelText('store.nav'));
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('toggle-store-categories', handler);
  });

  it('el link "Tienda" del menú también queda activo en /store/ (misma normalización)', () => {
    const { getByText } = renderAt('/store/');
    expect(getByText('nav.store').className).toMatch(/active/);
  });
});
