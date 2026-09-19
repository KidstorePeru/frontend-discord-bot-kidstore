import { useCallback, useEffect, useRef, useState } from 'react';

export interface PageResult<T> { items: T[]; total: number; page: number }
export type FetchPage<T> = (page: number, limit: number, signal: AbortSignal) => Promise<PageResult<T>>;

// usePaginatedHistory maneja un historial paginado del lado del servidor con
// refresco periódico en segundo plano, sin los bugs que tuvo el historial de
// recargas del panel antes de esto:
//
//   1. Si la consulta VISIBLE (cambio de página o reintento) tarda más que
//      el intervalo de refresco, el refresco en segundo plano se OMITE por
//      completo mientras esa consulta siga pendiente — nunca incrementa el
//      identificador de la consulta en vuelo ni la invalida. Sin esto, un
//      refresco que arrancaba y terminaba (con éxito o con error) mientras
//      la consulta inicial todavía esperaba respuesta invalidaba esa
//      consulta inicial — y como solo las consultas "en primer plano" apagan
//      el estado de carga, el historial se quedaba en "Cargando…" para
//      siempre, con la paginación bloqueada y sin ninguna forma de
//      reintentar.
//   2. Al terminar la consulta visible (éxito o error) SIEMPRE se apaga su
//      estado de carga — nunca queda un `loading` colgado.
//   3. Un refresco en segundo plano que falla NUNCA pisa los datos ya
//      mostrados ni activa el estado de error visible — sigue siendo
//      background, no una interacción del cliente.
//   4. Cambiar de página o reintentar cancela (AbortController) e invalida
//      (un identificador de consulta creciente) la consulta anterior — su
//      resolución tardía, incluido su `finally`, nunca puede alterar el
//      estado de la consulta nueva.
//   5. Se limpia el intervalo y se aborta la consulta en vuelo al
//      desmontar, y el estado de "montado" se restablece en el CUERPO del
//      efecto (no solo en el useRef inicial) para seguir funcionando bajo
//      React.StrictMode, que monta/desmonta/vuelve a montar cada componente
//      una vez en desarrollo.
//   6. Si la página actual queda fuera de rango (se eliminó una operación y
//      el total de páginas bajó — p. ej. estar en la página 2 de 11
//      resultados y que uno se borre, dejando solo 10, una sola página) el
//      hook navega solo a la última página válida y carga sus datos, en vez
//      de quedarse mostrando una página vacía indefinidamente. Puede
//      dispararlo tanto un cambio de página explícito como un refresco en
//      segundo plano — cualquiera puede descubrir que el total bajó.
export function usePaginatedHistory<T>(fetchPage: FetchPage<T>, limit: number, refreshMs = 20000) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  // fetchPageRef evita que una identidad nueva de `fetchPage` en cada
  // render (algo común si el llamador pasa una función inline) dispare el
  // efecto de más abajo — solo `page`/`retryTick`/`limit`/`refreshMs` deben
  // hacerlo.
  const fetchPageRef = useRef(fetchPage);
  useEffect(() => { fetchPageRef.current = fetchPage; });

  const reqIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let pending = false;
    let controller: AbortController | null = null;

    function load(isForeground: boolean) {
      if (pending) return; // consulta anterior todavía en vuelo — se omite este refresco entero
      pending = true;
      controller = new AbortController();
      const reqId = ++reqIdRef.current;
      if (isForeground) { setLoading(true); setError(false); }
      // correctingPage: se activa si esta respuesta descubre que `page` ya
      // no existe — el finally de más abajo NO debe apagar el loading en
      // ese caso, porque setPage(maxPage) dispara de inmediato un nuevo
      // ciclo del efecto (con isForeground=true) para cargar la página
      // corregida; apagarlo acá solo produciría un parpadeo del estado
      // "vacío" entre una carga y la otra.
      let correctingPage = false;

      fetchPageRef.current(page, limit, controller.signal)
        .then(r => {
          if (!mountedRef.current || reqId !== reqIdRef.current) return; // desmontado, o ya hay una consulta más nueva
          setTotal(r.total);
          const maxPage = Math.max(1, Math.ceil(r.total / limit));
          if (page > maxPage) {
            correctingPage = true;
            setError(false);
            setPage(maxPage);
            return; // no pisar items con la respuesta de una página que ya no existe
          }
          setItems(r.items);
          setError(false);
        })
        .catch(() => {
          if (!mountedRef.current || reqId !== reqIdRef.current) return;
          // Un refresco en segundo plano que falla conserva los datos ya
          // mostrados tal cual — solo una consulta en primer plano (cambio
          // de página o reintento explícito) puede mostrar el error.
          if (isForeground) setError(true);
        })
        .finally(() => {
          pending = false;
          if (!mountedRef.current || reqId !== reqIdRef.current) return;
          if (isForeground && !correctingPage) setLoading(false);
        });
    }

    load(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, refreshMs);

    return () => {
      clearInterval(interval);
      controller?.abort();
    };
  }, [page, retryTick, limit, refreshMs]);

  const retry = useCallback(() => setRetryTick(t => t + 1), []);

  return { items, total, page, setPage, loading, error, retry };
}
