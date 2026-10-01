import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

// Regresión: "location.pathname === '/store'" solo cubría esa variante
// EXACTA para marcar el link "Tienda" del menú como activo — React Router
// hace MATCH igual para "/store/" (barra final), mayúsculas ("/STORE") o un
// pathname porcentaje-codificado, así que se normaliza antes de comparar.
// (El botón de acceso a categorías que antes vivía acá se retiró: el nuevo
// panel de categorías de la tienda — StorePage — es su propio menú lateral
// sticky (≥1024 px) / barra móvil, sin necesitar un disparador externo.)

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

describe('Navbar — normalización de ruta para el link activo', () => {
  it('el link "Tienda" queda activo en /store', () => {
    const { getByText } = renderAt('/store');
    expect(getByText('nav.store').className).toMatch(/active/);
  });

  it('el link "Tienda" también queda activo en /store/ (barra final)', () => {
    const { getByText } = renderAt('/store/');
    expect(getByText('nav.store').className).toMatch(/active/);
  });

  it('el link "Tienda" también queda activo en /STORE (mayúsculas)', () => {
    const { getByText } = renderAt('/STORE');
    expect(getByText('nav.store').className).toMatch(/active/);
  });

  it('el link "Tienda" NO queda activo fuera de la tienda', () => {
    const { getByText } = renderAt('/dashboard');
    expect(getByText('nav.store').className).not.toMatch(/active/);
  });
});

describe('Navbar — sin sesión', () => {
  it('muestra "Crear cuenta" a la vista, junto a "Ingresar"', () => {
    const { getByText } = renderAt('/');
    expect(getByText('nav.login').closest('a')?.getAttribute('href')).toBe('/login');
    const register = getByText('nav.register').closest('a');
    expect(register?.getAttribute('href')).toBe('/register');
    expect(register?.className).toMatch(/nav-cta/);
  });

  it('sin sesión no hay campana de notificaciones', () => {
    const { queryByLabelText } = renderAt('/');
    expect(queryByLabelText(/^Notificaciones/)).toBeNull();
  });
});
