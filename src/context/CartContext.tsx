import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  offerId: string;
  name: string;
  featuredImg: string;
  albumArt: string;
  renderImg: string;
  rarityText: string;
  finalPrice: number;
  regularPrice: number;
  price_kc: number;
  span: number;
  sectionName: string;
  sectionRank: number;
  colors: { color1: string; color2: string; color3: string; textBg: string };
  banner?: { value: string; backendValue: string };
  hasDiscount: boolean;
  isBundle: boolean;
  isBigBundle: boolean;
  outDate?: string;
}

interface CartContextValue {
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: CartItem) => 'added' | 'already_in_cart' | 'not_logged_in';
  removeFromCart: (offerId: string) => void;
  clearCart: () => void;
  validateAgainstShop: (shopOfferIds: Set<string>) => number; // retorna cuántos se eliminaron
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartKey(customerId: string | number) {
  return `kc_cart_${customerId}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);

  // cartRef siempre tiene el contenido REAL del carrito, escrito de forma
  // síncrona por cada función de este archivo — nunca se lee dentro de un
  // updater de setState (`setCart(prev => ...)`). Antes, addToCart y
  // validateAgainstShop decidían su valor de retorno con una variable (`isNew`,
  // `removed`) que solo quedaba asignada cuando React ejecutaba ese updater,
  // algo que NO pasa de forma síncrona ni garantizada en el mismo tick: bajo
  // StrictMode (que invoca los updaters dos veces para detectar efectos
  // impuros), o con dos clics muy seguidos antes de que React repinte, la
  // función podía devolver 'already_in_cart' para un ítem que en realidad
  // se acababa de agregar (o viceversa). Con cartRef, la decisión de si un
  // ítem ya está en el carrito se toma leyendo el estado real en el momento
  // exacto de la llamada, sin depender de cuándo React decida re-renderizar.
  const cartRef = useRef<CartItem[]>([]);

  // Cargar carrito cuando el cliente está disponible
  useEffect(() => {
    if (!customer?.id) {
      cartRef.current = [];
      setCart([]);
      setCartLoaded(false);
      return;
    }
    let loaded: CartItem[] = [];
    try {
      const raw = localStorage.getItem(cartKey(customer.id));
      loaded = raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      loaded = [];
    }
    cartRef.current = loaded;
    setCart(loaded);
    setCartLoaded(true);
  }, [customer?.id]);

  // Guardar carrito en localStorage cuando cambia
  useEffect(() => {
    if (!customer?.id || !cartLoaded) return;
    try {
      localStorage.setItem(cartKey(customer.id), JSON.stringify(cart));
    } catch {}
  }, [cart, customer?.id, cartLoaded]);

  const addToCart = useCallback((item: CartItem): 'added' | 'already_in_cart' | 'not_logged_in' => {
    if (!customer) return 'not_logged_in';
    if (cartRef.current.some(i => i.offerId === item.offerId)) {
      return 'already_in_cart';
    }
    cartRef.current = [...cartRef.current, item];
    setCart(cartRef.current);
    return 'added';
  }, [customer]);

  const removeFromCart = useCallback((offerId: string) => {
    cartRef.current = cartRef.current.filter(i => i.offerId !== offerId);
    setCart(cartRef.current);
  }, []);

  const clearCart = useCallback(() => {
    cartRef.current = [];
    setCart([]);
  }, []);

  // Valida el carrito contra los items actuales de la tienda — mismo patrón
  // que addToCart: el número de eliminados se calcula síncronamente contra
  // cartRef, nunca dentro del updater de setCart.
  const validateAgainstShop = useCallback((shopOfferIds: Set<string>): number => {
    const valid = cartRef.current.filter(i => shopOfferIds.has(i.offerId));
    const removed = cartRef.current.length - valid.length;
    if (removed > 0) {
      cartRef.current = valid;
      setCart(valid);
    }
    return removed;
  }, []);

  const cartTotal = cart.reduce((s, i) => s + i.price_kc, 0);
  const cartCount = cart.length;

  return (
    <CartContext.Provider value={{
      cart, cartOpen, setCartOpen,
      addToCart, removeFromCart, clearCart, validateAgainstShop,
      cartTotal, cartCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
