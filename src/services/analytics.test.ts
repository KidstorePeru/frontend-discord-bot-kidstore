import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { excludeThisBrowser, initAnalytics, track } from './analytics';

const script = () => document.querySelector<HTMLScriptElement>('script[src="https://cloud.umami.is/script.js"]');

beforeEach(() => { localStorage.clear(); script()?.remove(); delete window.umami; });
afterEach(() => { localStorage.clear(); script()?.remove(); delete window.umami; });

describe('initAnalytics', () => {
  it('no carga nada sin ID, en desarrollo o si el navegador está excluido', () => {
    expect(initAnalytics(undefined, 'www.kidstoreperu.net')).toBe(false);
    expect(initAnalytics('abc', 'localhost')).toBe(false);
    excludeThisBrowser();
    expect(initAnalytics('abc', 'www.kidstoreperu.net')).toBe(false);
    expect(script()).toBeNull();
  });

  it('en la web real carga Umami sin enviar parámetros de la URL (pueden traer tokens)', () => {
    expect(initAnalytics('abc-123', 'www.kidstoreperu.net')).toBe(true);
    const s = script();
    expect(s?.dataset.websiteId).toBe('abc-123');
    expect(s?.dataset.excludeSearch).toBe('true');
    expect(s?.dataset.excludeHash).toBe('true');
    expect(s?.dataset.domains).toBe('www.kidstoreperu.net,kidstoreperu.net');
    // Una segunda llamada no duplica el script.
    initAnalytics('abc-123', 'www.kidstoreperu.net');
    expect(document.querySelectorAll('script[src="https://cloud.umami.is/script.js"]')).toHaveLength(1);
  });
});

describe('track', () => {
  it('sin Umami cargado no hace nada (ni rompe)', () => {
    expect(() => track('carrito_agregar')).not.toThrow();
  });

  it('envía el evento, salvo en el navegador del dueño', () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    track('compra_exitosa', { objetos: 2, kc: 1800 });
    expect(spy).toHaveBeenCalledWith('compra_exitosa', { objetos: 2, kc: 1800 });
    excludeThisBrowser();
    track('compra_exitosa');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
