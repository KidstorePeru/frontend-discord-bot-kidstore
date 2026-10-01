import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { addWishlistItem, getWishlist, removeWishlistItem, type WishlistItem } from '../services/api';

export interface WishTarget { itemId: string; name: string; type: string; image: string }

export type WishToggleResult = 'added' | 'removed' | 'login' | 'full' | 'error';

interface WishlistContextValue {
  /** Objetos de la lista (null mientras carga o sin sesión). */
  items: WishlistItem[] | null;
  limit: number;
  has: (itemId: string) => boolean;
  /** Agrega o quita. Sin sesión devuelve 'login' sin hacer nada. */
  toggle: (target: WishTarget) => Promise<WishToggleResult>;
  remove: (itemId: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

// Lista de deseos («Avísame cuando vuelva»): se carga una vez al iniciar
// sesión y la comparten la campana de cada tarjeta de la tienda y la página
// de la lista. Los cambios se ven al instante y se revierten si el servidor
// los rechaza.
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const customerId = customer?.id ?? null;
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [limit, setLimit] = useState(30);
  const pending = useRef(new Set<string>());

  const reload = useCallback(async () => {
    if (!customerId) { setItems(null); return; }
    try {
      const res = await getWishlist();
      setItems(res.items);
      setLimit(res.limit);
    } catch {
      setItems((prev) => prev ?? []);
    }
  }, [customerId]);

  useEffect(() => { void reload(); }, [reload]);

  const ids = useMemo(() => new Set((items ?? []).map((i) => i.item_id)), [items]);
  const has = useCallback((itemId: string) => ids.has(itemId), [ids]);

  const remove = useCallback(async (itemId: string) => {
    const before = items;
    setItems((prev) => (prev ?? []).filter((i) => i.item_id !== itemId));
    try {
      await removeWishlistItem(itemId);
      return true;
    } catch {
      setItems(before);
      return false;
    }
  }, [items]);

  const toggle = useCallback(async (target: WishTarget): Promise<WishToggleResult> => {
    if (!customerId) return 'login';
    if (pending.current.has(target.itemId)) return ids.has(target.itemId) ? 'added' : 'removed';
    pending.current.add(target.itemId);
    try {
      if (ids.has(target.itemId)) {
        return (await remove(target.itemId)) ? 'removed' : 'error';
      }
      if ((items?.length ?? 0) >= limit) return 'full';
      const optimistic: WishlistItem = {
        item_id: target.itemId, name: target.name, item_type: target.type, image: target.image,
        created_at: new Date().toISOString(), in_shop: false,
      };
      setItems((prev) => [optimistic, ...(prev ?? [])]);
      try {
        await addWishlistItem({ item_id: target.itemId, name: target.name, item_type: target.type, image: target.image });
        return 'added';
      } catch (err) {
        setItems((prev) => (prev ?? []).filter((i) => i.item_id !== target.itemId));
        return (err as { status?: number }).status === 409 ? 'full' : 'error';
      }
    } finally {
      pending.current.delete(target.itemId);
    }
  }, [customerId, ids, items, limit, remove]);

  const value = useMemo(() => ({ items, limit, has, toggle, remove, reload }), [items, limit, has, toggle, remove, reload]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist debe usarse dentro de WishlistProvider');
  return ctx;
}
