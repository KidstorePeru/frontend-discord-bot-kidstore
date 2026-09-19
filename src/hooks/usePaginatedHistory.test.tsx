import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { usePaginatedHistory, type PageResult } from './usePaginatedHistory';

// Pruebas de regresión del bug real reportado: si la consulta VISIBLE tarda
// más que el intervalo de refresco (20s), el refresco en segundo plano
// disparaba, incrementaba el identificador de la consulta e invalidaba la
// consulta inicial — como solo las consultas "en primer plano" apagan el
// loading, el historial se quedaba en "Cargando…" para siempre. Cada test
// de acá abajo corresponde a un punto explícito del pedido de corrección.

interface Item { id: number }

// deferred(): promesa controlada a mano desde el test — simula una consulta
// "lenta" sin depender de temporizadores reales para el propio fetch (los
// temporizadores falsos de vitest solo gobiernan el intervalo de refresco,
// nunca cuánto tarda la promesa en resolver/rechazar).
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// flush(): deja correr los microtasks pendientes (los .then/.catch/.finally
// que se encadenan sobre la promesa que el mock de fetchPage devuelve) sin
// avanzar el reloj — vi.advanceTimersByTimeAsync(0) hace exactamente eso.
async function flush() {
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('usePaginatedHistory', () => {
  it('una consulta que tarda 25s termina bien y omite el refresco periódico mientras está pendiente', async () => {
    const first = deferred<PageResult<Item>>();
    const fetchPage = vi.fn().mockReturnValueOnce(first.promise);

    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    expect(result.current.loading).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(1);

    // El refresco cae a los 20s, mientras la consulta inicial sigue sin
    // resolver — debe omitirse por completo (ni un segundo fetchPage, ni
    // tocar el loading).
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    // A los 25s (5s más) se resuelve.
    await act(async () => {
      first.resolve({ items: [{ id: 1 }], total: 1, page: 1 });
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.items).toEqual([{ id: 1 }]);
    expect(result.current.total).toBe(1);
  });

  it('una consulta que tarda 25s y falla también termina el loading, con error y sin datos inventados', async () => {
    const first = deferred<PageResult<Item>>();
    const fetchPage = vi.fn().mockReturnValueOnce(first.promise);

    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    expect(result.current.loading).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(fetchPage).toHaveBeenCalledTimes(1); // el refresco tampoco se disparó acá

    await act(async () => {
      first.reject(new Error('network error simulado'));
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  it('varios intervalos de refresco mientras la consulta sigue pendiente no disparan fetchPage adicionales', async () => {
    const first = deferred<PageResult<Item>>();
    const second = deferred<PageResult<Item>>();
    const fetchPage = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    expect(fetchPage).toHaveBeenCalledTimes(1);

    // Tres intervalos completos (60s) sin que la consulta inicial resuelva.
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(fetchPage).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve({ items: [{ id: 9 }], total: 1, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);

    // Ya resuelta, el SIGUIENTE tick de refresco sí debe generar una
    // consulta nueva (en segundo plano).
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('reintentar después de un error vuelve a mostrar carga y luego los datos', async () => {
    const first = deferred<PageResult<Item>>();
    const second = deferred<PageResult<Item>>();
    const fetchPage = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));

    await act(async () => { first.reject(new Error('falló')); await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.error).toBe(true);
    expect(result.current.loading).toBe(false);

    act(() => { result.current.retry(); });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(false); // se limpia el error apenas arranca el reintento

    await act(async () => {
      second.resolve({ items: [{ id: 2 }], total: 1, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.items).toEqual([{ id: 2 }]);
  });

  it('un refresco en segundo plano que falla conserva los datos ya mostrados, sin marcar error', async () => {
    const first = deferred<PageResult<Item>>();
    const second = deferred<PageResult<Item>>();
    const fetchPage = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    await act(async () => {
      first.resolve({ items: [{ id: 1 }, { id: 2 }], total: 2, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.loading).toBe(false);

    // Refresco en segundo plano a los 20s — falla.
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(fetchPage).toHaveBeenCalledTimes(2);
    await act(async () => {
      second.reject(new Error('fallo transitorio de red'));
      await vi.advanceTimersByTimeAsync(0);
    });

    // Los datos siguen siendo los mismos, sin error visible ni loading.
    expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('una respuesta vieja que llega tarde al cambiar de página nunca pisa la página nueva (ni su finally)', async () => {
    const pageOne = deferred<PageResult<Item>>();
    const pageTwo = deferred<PageResult<Item>>();
    const fetchPage = vi.fn()
      .mockImplementationOnce(() => pageOne.promise)
      .mockImplementationOnce(() => pageTwo.promise);

    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    expect(fetchPage).toHaveBeenCalledTimes(1);

    // Antes de que la página 1 resuelva, el cliente cambia a la página 2.
    act(() => { result.current.setPage(2); });
    await flush();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(true); // la nueva consulta (página 2) sigue en curso

    // La página 2 responde primero. total:11 mantiene la página 2 dentro de
    // rango (con limit:10 hay 2 páginas) — un total menor activaría, a
    // propósito, la corrección automática de página que cubre otro test.
    await act(async () => {
      pageTwo.resolve({ items: [{ id: 200 }], total: 11, page: 2 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([{ id: 200 }]);

    // La respuesta de la página 1, obsoleta, llega tarde — no debe alterar
    // nada (ni los items, ni el loading, ni el error), incluido su finally.
    await act(async () => {
      pageOne.resolve({ items: [{ id: 100 }], total: 11, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.items).toEqual([{ id: 200 }]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('desmontar mientras hay una consulta pendiente no genera actualizaciones de estado ni errores, y remontar vuelve a funcionar (StrictMode)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const first = deferred<PageResult<Item>>();
    const fetchPage = vi.fn().mockReturnValueOnce(first.promise);

    const { unmount } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    unmount();

    // La consulta resuelve DESPUÉS de desmontar — no debe intentar tocar
    // estado de un componente ya desmontado.
    await act(async () => {
      first.resolve({ items: [{ id: 1 }], total: 1, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(consoleError).not.toHaveBeenCalled();

    // "Remontar" (como hace React.StrictMode una vez en desarrollo) debe
    // arrancar una consulta nueva y funcionar con normalidad.
    const second = deferred<PageResult<Item>>();
    const fetchPage2 = vi.fn().mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage2, 10));
    expect(result.current.loading).toBe(true);

    await act(async () => {
      second.resolve({ items: [{ id: 2 }], total: 1, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([{ id: 2 }]);

    consoleError.mockRestore();
  });

  it('si el historial baja de 11 a 10 operaciones estando en la página 2, navega sola a la página 1 y carga sus datos', async () => {
    const initial = deferred<PageResult<Item>>();
    const pageTwo = deferred<PageResult<Item>>();
    const pageTwoShrunk = deferred<PageResult<Item>>();
    const correctedPageOne = deferred<PageResult<Item>>();
    const fetchPage = vi.fn()
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => pageTwo.promise)
      .mockImplementationOnce(() => pageTwoShrunk.promise)
      .mockImplementationOnce(() => correctedPageOne.promise);

    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    const tenItems = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    await act(async () => {
      initial.resolve({ items: tenItems, total: 11, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.total).toBe(11);

    act(() => { result.current.setPage(2); });
    await act(async () => {
      pageTwo.resolve({ items: [{ id: 11 }], total: 11, page: 2 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.page).toBe(2);
    expect(result.current.items).toEqual([{ id: 11 }]);
    expect(result.current.loading).toBe(false);

    // Se elimina la operación #11 (11 → 10) — la página 2 ya no existe
    // (10 operaciones a 10 por página son exactamente 1 página). El
    // siguiente reintento/refresco de la página 2 lo descubre.
    act(() => { result.current.retry(); });
    await act(async () => {
      pageTwoShrunk.resolve({ items: [], total: 10, page: 2 });
      await vi.advanceTimersByTimeAsync(0);
    });
    // Debe haber navegado sola a la página 1 — y seguir "cargando" esa
    // página corregida en vez de mostrar la 2 vacía o apagar el loading a
    // mitad de camino.
    expect(result.current.page).toBe(1);
    expect(result.current.total).toBe(10);
    expect(result.current.loading).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(4);
    expect(fetchPage).toHaveBeenNthCalledWith(4, 1, 10, expect.anything());

    await act(async () => {
      correctedPageOne.resolve({ items: tenItems, total: 10, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.items).toEqual(tenItems);
    expect(result.current.total).toBe(10);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('si el historial queda completamente vacío, se queda en la página 1 sin loading colgado ni corrección en bucle', async () => {
    const initial = deferred<PageResult<Item>>();
    const emptied = deferred<PageResult<Item>>();
    const fetchPage = vi.fn().mockImplementationOnce(() => initial.promise).mockImplementationOnce(() => emptied.promise);

    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    await act(async () => {
      initial.resolve({ items: [{ id: 1 }], total: 1, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.items).toEqual([{ id: 1 }]);

    // Se elimina la única operación — el refresco periódico en segundo
    // plano lo descubre.
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(fetchPage).toHaveBeenCalledTimes(2);
    await act(async () => {
      emptied.resolve({ items: [], total: 0, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    // Ya estaba en la única página válida (1) — no debe haber disparado
    // ninguna consulta de corrección extra.
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('si queda vacío estando en una página más alta, corrige a la página 1 en vez de quedarse en una página inexistente', async () => {
    // El montaje inicial ya pide la página 1 antes de que el test alcance a
    // cambiar a la página 3 — esa primera consulta queda deliberadamente
    // sin resolver (se cancela/invalida sola al cambiar de página) y no
    // participa del resto del test.
    const mountLoad = deferred<PageResult<Item>>();
    const pageThree = deferred<PageResult<Item>>();
    const correctedPageOne = deferred<PageResult<Item>>();
    const fetchPage = vi.fn()
      .mockImplementationOnce(() => mountLoad.promise)
      .mockImplementationOnce(() => pageThree.promise)
      .mockImplementationOnce(() => correctedPageOne.promise);

    const { result } = renderHook(() => usePaginatedHistory<Item>(fetchPage, 10));
    act(() => { result.current.setPage(3); });
    await act(async () => {
      pageThree.resolve({ items: [], total: 0, page: 3 });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      correctedPageOne.resolve({ items: [], total: 0, page: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });
});
