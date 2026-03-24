import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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

  // Cargar carrito cuando el cliente está disponible
  useEffect(() => {
    if (!customer?.id) {
      setCart([]);
      setCartLoaded(false);
      return;
    }
    try {
      const raw = localStorage.getItem(cartKey(customer.id));
      setCart(raw ? (JSON.parse(raw) as CartItem[]) : []);
    } catch {
      setCart([]);
    }
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
    let isNew = false;
    setCart(prev => {
      if (prev.find(i => i.offerId === item.offerId)) return prev;
      isNew = true;
      return [...prev, item];
    });
    if (!isNew) return 'already_in_cart';
    return 'added';
  }, [customer]);

  const removeFromCart = useCallback((offerId: string) => {
    setCart(prev => prev.filter(i => i.offerId !== offerId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Valida el carrito contra los items actuales de la tienda
  const validateAgainstShop = useCallback((shopOfferIds: Set<string>): number => {
    let removed = 0;
    setCart(prev => {
      const valid = prev.filter(i => shopOfferIds.has(i.offerId));
      removed = prev.length - valid.length;
      return valid;
    });
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
