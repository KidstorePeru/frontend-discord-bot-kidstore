import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, cleanup, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { refreshSession, tryRefreshToken, beginNewSession, getMe, isSessionChangedError, isTransientSessionError } from '../services/api';
import type { Customer } from '../types';

// Regresiones de respuestas atrasadas y errores temporales de sesión:
//  - tras cerrar sesión o cambiar de cuenta, una consulta del perfil o una
//    renovación pendiente NO restaura usuarios, NO guarda tokens y NO pisa la
//    sesión nueva;
//  - un 503/red caída NO es una sesión inválida: no se cierra sesión, no se
//    borran tokens y se puede reintentar.
// fetch es un doble controlable: ninguna prueba toca la red.

function customer(id: string, name: string): Customer {
  return {
    id, epic_username: name, email: `${name}@example.com`, kc_balance: 0, has_password: true,
    google_linked: false, discord_linked: false, is_verified: true, created_at: new Date().toISOString(),
  } as Customer;
}

interface Deferred { resolve: (r: Response) => void; reject: (e: unknown) => void; url: string; init?: RequestInit }
let pending: Deferred[] = [];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// fetch que NO responde hasta que la prueba lo decide.
function installControlledFetch() {
  pending = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => { pending.push({ resolve, reject, url: String(url), init }); })));
}
function callsTo(fragment: string) { return pending.filter(p => p.url.includes(fragment)); }

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  localStorage.clear();
  beginNewSession(); // aísla el estado entre pruebas
  installControlledFetch();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

describe('renovación de tokens (api.ts)', () => {
  it('una renovación atrasada tras cerrar sesión NO guarda tokens', async () => {
    localStorage.setItem('kc_token', 'old-access');
    localStorage.setItem('kc_refresh_token', 'old-refresh');
    const p = refreshSession();
    // el usuario cierra sesión mientras la renovación está en vuelo
    beginNewSession();
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_refresh_token');
    callsTo('refresh-token')[0].resolve(json(200, { token: 'late-access', refresh_token: 'late-refresh' }));
    expect(await p).toBe('stale');
    expect(localStorage.getItem('kc_token')).toBeNull();
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
  });

  it('una renovación atrasada de la cuenta A NO sobrescribe la sesión de la cuenta B', async () => {
    localStorage.setItem('kc_token', 'A-access');
    localStorage.setItem('kc_refresh_token', 'A-refresh');
    const p = refreshSession();
    // cambio de cuenta: la sesión B queda guardada
    beginNewSession();
    localStorage.setItem('kc_token', 'B-access');
    localStorage.setItem('kc_refresh_token', 'B-refresh');
    callsTo('refresh-token')[0].resolve(json(200, { token: 'A-new-access', refresh_token: 'A-new-refresh' }));
    expect(await p).toBe('stale');
    expect(localStorage.getItem('kc_token')).toBe('B-access');
    expect(localStorage.getItem('kc_refresh_token')).toBe('B-refresh');
  });

  it('un rechazo atrasado (401) de la sesión anterior NO borra los tokens de la sesión nueva', async () => {
    localStorage.setItem('kc_token', 'A-access');
    localStorage.setItem('kc_refresh_token', 'A-refresh');
    const p = refreshSession();
    beginNewSession();
    localStorage.setItem('kc_token', 'B-access');
    localStorage.setItem('kc_refresh_token', 'B-refresh');
    callsTo('refresh-token')[0].resolve(json(401, { code: 'INVALID_REFRESH_TOKEN' }));
    expect(await p).toBe('stale');
    expect(localStorage.getItem('kc_token')).toBe('B-access');
    expect(localStorage.getItem('kc_refresh_token')).toBe('B-refresh');
  });

  it('una renovación normal guarda los tokens y varias llamadas comparten UNA sola petición', async () => {
    localStorage.setItem('kc_token', 'old');
    localStorage.setItem('kc_refresh_token', 'r1');
    const a = refreshSession();
    const b = refreshSession();
    expect(callsTo('refresh-token')).toHaveLength(1);
    callsTo('refresh-token')[0].resolve(json(200, { token: 'new', refresh_token: 'r2' }));
    expect(await a).toBe('ok');
    expect(await b).toBe('ok');
    expect(localStorage.getItem('kc_token')).toBe('new');
    expect(localStorage.getItem('kc_refresh_token')).toBe('r2');
  });

  it.each([[503], [500], [429], [408]])('un %i es TEMPORAL: conserva los tokens y permite reintentar', async (status) => {
    localStorage.setItem('kc_token', 'old');
    localStorage.setItem('kc_refresh_token', 'r1');
    const p = refreshSession();
    callsTo('refresh-token')[0].resolve(json(status, { code: 'TEMPORARY_ERROR' }));
    expect(await p).toBe('transient');
    expect(localStorage.getItem('kc_token')).toBe('old');
    expect(localStorage.getItem('kc_refresh_token')).toBe('r1');
    // reintento: ahora sí funciona
    const retry = refreshSession();
    callsTo('refresh-token')[1].resolve(json(200, { token: 'new', refresh_token: 'r2' }));
    expect(await retry).toBe('ok');
  });

  it('un error de red es TEMPORAL: conserva los tokens', async () => {
    localStorage.setItem('kc_token', 'old');
    localStorage.setItem('kc_refresh_token', 'r1');
    const p = refreshSession();
    callsTo('refresh-token')[0].reject(new TypeError('Failed to fetch'));
    expect(await p).toBe('transient');
    expect(localStorage.getItem('kc_refresh_token')).toBe('r1');
  });

  it('un 401 real (refresh inválido) borra los tokens', async () => {
    localStorage.setItem('kc_token', 'old');
    localStorage.setItem('kc_refresh_token', 'r1');
    const p = tryRefreshToken();
    callsTo('refresh-token')[0].resolve(json(401, { code: 'INVALID_REFRESH_TOKEN' }));
    expect(await p).toBe(false);
    expect(localStorage.getItem('kc_token')).toBeNull();
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
  });

  it('una respuesta 200 sin refresh_token no guarda "undefined": es temporal', async () => {
    localStorage.setItem('kc_token', 'old');
    localStorage.setItem('kc_refresh_token', 'r1');
    const p = refreshSession();
    callsTo('refresh-token')[0].resolve(json(200, { token: 'new' }));
    expect(await p).toBe('transient');
    expect(localStorage.getItem('kc_refresh_token')).toBe('r1');
  });
});

describe('peticiones autenticadas (request)', () => {
  it('la respuesta de una consulta de la sesión anterior se descarta con SESSION_CHANGED', async () => {
    localStorage.setItem('kc_token', 'A-access');
    const p = getMe();
    beginNewSession(); // cerró sesión / cambió de cuenta
    callsTo('/store/me')[0].resolve(json(200, { success: true, customer: customer('A', 'alice') }));
    const err = await p.catch(e => e);
    expect(isSessionChangedError(err)).toBe(true);
  });

  it('401 + renovación temporal fallida lanza un error temporal y NO borra la sesión', async () => {
    localStorage.setItem('kc_token', 'old');
    localStorage.setItem('kc_refresh_token', 'r1');
    const p = getMe();
    callsTo('/store/me')[0].resolve(json(401, { code: 'TOKEN_EXPIRED' }));
    await waitFor(() => expect(callsTo('refresh-token')).toHaveLength(1));
    callsTo('refresh-token')[0].resolve(json(503, { code: 'TEMPORARY_ERROR' }));
    const err = await p.catch(e => e);
    expect(isTransientSessionError(err)).toBe(true);
    expect(localStorage.getItem('kc_token')).toBe('old');
    expect(localStorage.getItem('kc_refresh_token')).toBe('r1');
  });

  it('401 + renovación rechazada lanza TOKEN_EXPIRED (sesión realmente inválida)', async () => {
    localStorage.setItem('kc_token', 'old');
    localStorage.setItem('kc_refresh_token', 'r1');
    const p = getMe();
    callsTo('/store/me')[0].resolve(json(401, { code: 'TOKEN_EXPIRED' }));
    await waitFor(() => expect(callsTo('refresh-token')).toHaveLength(1));
    callsTo('refresh-token')[0].resolve(json(401, { code: 'INVALID_REFRESH_TOKEN' }));
    const err = await p.catch(e => e);
    expect((err as { code?: string }).code).toBe('TOKEN_EXPIRED');
  });
});

describe('AuthContext', () => {
  it('una consulta del perfil que vuelve DESPUÉS de cerrar sesión no restaura al usuario', async () => {
    localStorage.setItem('kc_token', 'A-access');
    localStorage.setItem('kc_refresh_token', 'A-refresh');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(callsTo('/store/me')).toHaveLength(1));

    act(() => result.current.logout());
    await act(async () => {
      callsTo('/store/me')[0].resolve(json(200, { success: true, customer: customer('A', 'alice') }));
    });
    expect(result.current.customer).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('kc_token')).toBeNull();
  });

  it('una consulta de la cuenta A que vuelve tras cambiar a la cuenta B no pisa a B', async () => {
    localStorage.setItem('kc_token', 'A-access');
    localStorage.setItem('kc_refresh_token', 'A-refresh');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(callsTo('/store/me')).toHaveLength(1));

    localStorage.setItem('kc_refresh_token', 'B-refresh');
    act(() => result.current.setAuth('B-access', customer('B', 'bob')));
    await act(async () => {
      callsTo('/store/me')[0].resolve(json(200, { success: true, customer: customer('A', 'alice') }));
    });
    expect(result.current.customer?.id).toBe('B');
    expect(localStorage.getItem('kc_token')).toBe('B-access');
    expect(localStorage.getItem('kc_refresh_token')).toBe('B-refresh');
  });

  it('un 401 atrasado de la cuenta A NO cierra la sesión de la cuenta B', async () => {
    localStorage.setItem('kc_token', 'A-access');
    localStorage.setItem('kc_refresh_token', 'A-refresh');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(callsTo('/store/me')).toHaveLength(1));

    localStorage.setItem('kc_refresh_token', 'B-refresh');
    act(() => result.current.setAuth('B-access', customer('B', 'bob')));
    await act(async () => {
      callsTo('/store/me')[0].resolve(json(401, { code: 'UNAUTHORIZED' }));
    });
    expect(result.current.customer?.id).toBe('B');
    expect(result.current.token).toBe('B-access');
    expect(localStorage.getItem('kc_refresh_token')).toBe('B-refresh');
  });

  it('un 503 al comprobar la sesión NO cierra sesión y se reintenta hasta recuperarse', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem('kc_token', 'access');
    localStorage.setItem('kc_refresh_token', 'refresh');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(callsTo('/store/me')).toHaveLength(1));

    // /me → 401 (token vencido), la renovación devuelve 503: error temporal
    await act(async () => { callsTo('/store/me')[0].resolve(json(401, { code: 'TOKEN_EXPIRED' })); });
    await waitFor(() => expect(callsTo('refresh-token')).toHaveLength(1));
    await act(async () => { callsTo('refresh-token')[0].resolve(json(503, { code: 'TEMPORARY_ERROR' })); });

    await waitFor(() => expect(result.current.sessionUnavailable).toBe(true));
    expect(result.current.token).toBe('access');
    expect(localStorage.getItem('kc_refresh_token')).toBe('refresh');

    // el reintento automático llega y ahora todo funciona
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    await waitFor(() => expect(callsTo('/store/me')).toHaveLength(2));
    await act(async () => { callsTo('/store/me')[1].resolve(json(200, { success: true, customer: customer('A', 'alice') })); });
    await waitFor(() => expect(result.current.customer?.id).toBe('A'));
    expect(result.current.sessionUnavailable).toBe(false);
  });

  it('un error de red al comprobar la sesión conserva la sesión y permite reintentar manualmente', async () => {
    localStorage.setItem('kc_token', 'access');
    localStorage.setItem('kc_refresh_token', 'refresh');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(callsTo('/store/me')).toHaveLength(1));
    await act(async () => { callsTo('/store/me')[0].reject(new TypeError('Failed to fetch')); });
    await waitFor(() => expect(result.current.sessionUnavailable).toBe(true));
    expect(result.current.token).toBe('access');

    let retry!: Promise<void>;
    act(() => { retry = result.current.refresh(); });
    await waitFor(() => expect(callsTo('/store/me').length).toBeGreaterThanOrEqual(2));
    await act(async () => {
      callsTo('/store/me')[callsTo('/store/me').length - 1].resolve(json(200, { success: true, customer: customer('A', 'alice') }));
      await retry;
    });
    expect(result.current.customer?.id).toBe('A');
    expect(result.current.sessionUnavailable).toBe(false);
  });

  it('una sesión realmente inválida (renovación rechazada) sí cierra sesión', async () => {
    localStorage.setItem('kc_token', 'access');
    localStorage.setItem('kc_refresh_token', 'refresh');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(callsTo('/store/me')).toHaveLength(1));
    await act(async () => { callsTo('/store/me')[0].resolve(json(401, { code: 'TOKEN_EXPIRED' })); });
    await waitFor(() => expect(callsTo('refresh-token')).toHaveLength(1));
    await act(async () => { callsTo('refresh-token')[0].resolve(json(401, { code: 'INVALID_REFRESH_TOKEN' })); });
    await waitFor(() => expect(result.current.token).toBeNull());
    expect(result.current.customer).toBeNull();
    expect(localStorage.getItem('kc_token')).toBeNull();
  });
});
