import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { CartProvider, useCart, type CartItem } from './CartContext';
import type { Customer } from '../types';

// Pruebas de regresión del punto 2 del pedido de correcciones: addToCart (y
// validateAgainstShop, que tenía el mismo patrón) decidían su valor de
// retorno leyendo una variable que solo quedaba asignada DENTRO del updater
// que se le pasa a setCart — algo que React no garantiza ejecutar de forma
// síncrona ni una sola vez (StrictMode invoca los updaters dos veces
// justamente para detectar esto). El resultado real: agregar un ítem nuevo
// podía mostrar "Ya está en el carrito" en vez de confirmarlo, y no abrir el
// carrito como se esperaba.

const mockCustomer: Customer = {
  id: 1,
  epic_username: 'tester',
  email: 'tester@example.com',
  kc_balance: 0,
  has_password: true,
  google_linked: false,
  discord_linked: false,
  created_at: new Date().toISOString(),
};

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ customer: mockCustomer }),
}));

function item(offerId: string): CartItem {
  return {
    offerId,
    name: offerId,
    featuredImg: '',
    albumArt: '',
    renderImg: '',
    rarityText: '',
    finalPrice: 100,
    regularPrice: 100,
    price_kc: 100,
    span: 1,
    sectionName: 's',
    sectionRank: 1,
    colors: { color1: '#000', color2: '#000', color3: '#000', textBg: '#000' },
    hasDiscount: false,
    isBundle: false,
    isBigBundle: false,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); });

describe('CartContext addToCart / validateAgainstShop', () => {
  it('agregar un ítem nuevo devuelve "added", nunca "already_in_cart"', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    let outcome: string | undefined;
    act(() => { outcome = result.current.addToCart(item('a')); });
    expect(outcome).toBe('added');
    expect(result.current.cart.map(i => i.offerId)).toEqual(['a']);
  });

  it('agregar el mismo ítem dos veces (clics separados) devuelve "already_in_cart" la segunda vez', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(item('a')); });

    let outcome: string | undefined;
    act(() => { outcome = result.current.addToCart(item('a')); });
    expect(outcome).toBe('already_in_cart');
    expect(result.current.cart).toHaveLength(1);
  });

  it('dos clics rápidos sobre dos ítems distintos, sin esperar a que React repinte, agregan ambos correctamente', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    let firstOutcome: string | undefined;
    let secondOutcome: string | undefined;
    act(() => {
      firstOutcome = result.current.addToCart(item('a'));
      secondOutcome = result.current.addToCart(item('b'));
    });

    expect(firstOutcome).toBe('added');
    expect(secondOutcome).toBe('added');
    expect(result.current.cart.map(i => i.offerId).sort()).toEqual(['a', 'b']);
  });

  it('un clic rápido duplicado sobre el mismo ítem, en el mismo lote de actualización, solo agrega una vez', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    let firstOutcome: string | undefined;
    let secondOutcome: string | undefined;
    act(() => {
      firstOutcome = result.current.addToCart(item('a'));
      secondOutcome = result.current.addToCart(item('a'));
    });

    expect(firstOutcome).toBe('added');
    expect(secondOutcome).toBe('already_in_cart');
    expect(result.current.cart).toHaveLength(1);
  });

  it('funciona igual bajo StrictMode (doble invocación de efectos y updaters)', () => {
    function strictWrapper({ children }: { children: ReactNode }) {
      return (
        <StrictMode>
          <CartProvider>{children}</CartProvider>
        </StrictMode>
      );
    }
    const { result } = renderHook(() => useCart(), { wrapper: strictWrapper });

    let outcome: string | undefined;
    act(() => { outcome = result.current.addToCart(item('a')); });
    expect(outcome).toBe('added');
    expect(result.current.cart).toHaveLength(1);

    let repeat: string | undefined;
    act(() => { repeat = result.current.addToCart(item('a')); });
    expect(repeat).toBe('already_in_cart');
    expect(result.current.cart).toHaveLength(1);
  });

  it('validateAgainstShop calcula el número de eliminados de forma síncrona, no vía updater diferido', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart(item('a'));
      result.current.addToCart(item('b'));
      result.current.addToCart(item('c'));
    });
    expect(result.current.cart).toHaveLength(3);

    let removed: number | undefined;
    act(() => { removed = result.current.validateAgainstShop(new Set(['a', 'c'])); });
    expect(removed).toBe(1);
    expect(result.current.cart.map(i => i.offerId).sort()).toEqual(['a', 'c']);
  });

  it('validateAgainstShop devuelve 0 y no toca el carrito cuando todos los ítems siguen vigentes', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => { result.current.addToCart(item('a')); });

    let removed: number | undefined;
    act(() => { removed = result.current.validateAgainstShop(new Set(['a'])); });
    expect(removed).toBe(0);
    expect(result.current.cart).toHaveLength(1);
  });
});
