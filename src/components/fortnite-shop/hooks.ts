import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { BASE } from '../../services/api';
import { isValidEntry, type ApiEntry } from './model';

/* ── Datos de la tienda ──────────────────────────────────────────────
   Se piden a nuestro proxy GET /store/shop (mismos datos que fortnite-api.com
   /v2/shop): si el proveedor cae, el proxy devuelve la última tienda buena
   marcada `_stale` en vez de un error. */

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { entries: ApiEntry[]; date: string; ts: number }>();

// La tienda rota todos los días a las 00:00 UTC.
export function nextShopReset(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

interface ShopState {
  status: 'loading' | 'ready' | 'error';
  entries: ApiEntry[] | null;
  date: string | null;
  stale: boolean;
  /** Idioma del catálogo que se está mostrando (puede ser el anterior si falló el cambio). */
  entriesLang: string | null;
}

export function useShopData(apiLang: string) {
  const [state, setState] = useState<ShopState>({ status: 'loading', entries: null, date: null, stale: false, entriesLang: null });
  const [reloadKey, setReloadKey] = useState(0);
  const forceRef = useRef(false);
  // Catálogo que se está mostrando (para decidir si una respuesta con entradas
  // rotas debe reemplazarlo o no).
  const shownRef = useRef<ApiEntry[] | null>(null);
  useEffect(() => { shownRef.current = state.entries; }, [state.entries]);

  useEffect(() => {
    const force = forceRef.current;
    forceRef.current = false;
    const hit = cache.get(apiLang);
    if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      setState({ status: 'ready', entries: hit.entries, date: hit.date, stale: false, entriesLang: apiLang });
      return undefined;
    }
    const ctrl = new AbortController();
    // La tienda anterior sigue visible mientras llega la nueva (cambio de idioma o recarga).
    setState((s) => ({ ...s, status: 'loading' }));
    fetch(`${BASE}/store/shop?lang=${encodeURIComponent(apiLang)}`, { signal: ctrl.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const raw: unknown = json?.data?.entries;
        // Un catálogo vacío o con otra forma no reemplaza el que ya se muestra:
        // cuenta como fallo de actualización (ver el aviso en Store.tsx).
        if (!Array.isArray(raw) || raw.length === 0) throw new Error('Respuesta inesperada de la tienda');
        const entries = raw.filter(isValidEntry);
        const malformed = raw.length - entries.length;
        if (entries.length === 0) throw new Error('Catálogo sin entradas válidas');
        if (malformed > 0) {
          // Datos malformados: si ya hay un catálogo válido en pantalla, se
          // conserva (fallo de actualización). Si es la primera carga, se muestra
          // lo que sí es válido, sin guardarlo en caché.
          if (shownRef.current?.length) throw new Error(`Catálogo con ${malformed} entradas malformadas`);
          console.warn(`useShopData: se descartaron ${malformed} entradas malformadas`);
        }
        const stale = Boolean(json._stale);
        if (!stale && malformed === 0) cache.set(apiLang, { entries, date: json.data.date, ts: Date.now() });
        setState({ status: 'ready', entries, date: json.data.date, stale, entriesLang: apiLang });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        // Se conservan los objetos que ya se mostraban (si los hay) y la página
        // avisa que no pudieron actualizarse, con "Reintentar". El detalle
        // técnico (HTTP 500, red caída…) queda en la consola para diagnosticar.
        console.warn('useShopData: no se pudo cargar la tienda', err);
        setState((s) => ({ ...s, status: 'error' }));
      });
    return () => ctrl.abort();
  }, [apiLang, reloadKey]);

  // Recarga automática ~90 s después de la rotación (00:00 UTC) — le da
  // margen a fortnite-api.com para que ya tenga el catálogo nuevo listo.
  useEffect(() => {
    const id = setTimeout(() => {
      forceRef.current = true;
      setReloadKey((k) => k + 1);
    }, nextShopReset() - Date.now() + 90_000);
    return () => clearTimeout(id);
  }, [reloadKey]);

  const reload = useCallback(() => {
    forceRef.current = true;
    setReloadKey((k) => k + 1);
  }, []);

  return { ...state, reload };
}

/* ── Lo más vendido de hoy ─────────────────────────────────────────
   Ids en orden (GET /store/shop/bestsellers: ventas reales de KidStorePeru).
   Se vuelve a pedir cuando cambia la tienda (shopDate). Si falla, simplemente
   no hay sección: nunca rompe la tienda. */

export function useBestSellers(shopDate: string | null): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    if (!shopDate) return undefined;
    const ctrl = new AbortController();
    fetch(`${BASE}/store/shop/bestsellers`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : { offer_ids: [] }))
      .then((json) => setIds(Array.isArray(json?.offer_ids) ? json.offer_ids : []))
      .catch(() => { if (!ctrl.signal.aborted) setIds([]); });
    return () => ctrl.abort();
  }, [shopDate]);
  return ids;
}

/* ── Reloj compartido: un solo intervalo para todos los contadores ── */

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let clock = Date.now();

function subscribeClock(fn: () => void) {
  listeners.add(fn);
  if (!timer) {
    clock = Date.now();
    timer = setInterval(() => {
      clock = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getClock = () => clock;
const noSubscribe = () => () => {};

// `enabled = false` deja de escuchar el reloj (tarjetas fuera de pantalla): no se vuelve a
// pintar cada segundo, y al activarse de nuevo se pone al día con la hora actual.
export function useNow(enabled = true): number {
  return useSyncExternalStore(enabled ? subscribeClock : noSubscribe, getClock, getClock);
}

// Tiempo que le queda a un objeto en la tienda como DD:HH:MM:SS ("06:13:28:05").
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const parts = [Math.floor(total / 86_400), Math.floor((total % 86_400) / 3600), Math.floor((total % 3600) / 60), total % 60];
  return parts.map((n) => String(n).padStart(2, '0')).join(':');
}

/* ── Visibilidad de tarjetas: un observador compartido ────────────── */

const inViewCallbacks = new WeakMap<Element, (v: boolean) => void>();
let inViewObserver: IntersectionObserver | null = null;

function getInViewObserver() {
  if (!inViewObserver) {
    inViewObserver = new IntersectionObserver(
      (records) => records.forEach((r) => inViewCallbacks.get(r.target)?.(r.isIntersecting)),
      { rootMargin: '200px 0px' },
    );
  }
  return inViewObserver;
}

export function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const obs = getInViewObserver();
    inViewCallbacks.set(el, setInView);
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      inViewCallbacks.delete(el);
    };
  }, [ref]);
  return inView;
}

/* ── Sección activa: la que cruza la franja central de la pantalla ── */

export function useActiveSection(sectionIds: string[]): string | null {
  const [active, setActive] = useState<string | null>(sectionIds[0] ?? null);
  const key = sectionIds.join('|');

  useEffect(() => {
    const ids = key ? key.split('|') : [];
    if (!ids.length) return undefined;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const r of records) visible.set(r.target.id, r.isIntersecting);
        const first = ids.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [key]);

  // Si cambian las secciones (filtros, idioma) y la activa ya no existe, vale la primera.
  return active && sectionIds.includes(active) ? active : (sectionIds[0] ?? null);
}
