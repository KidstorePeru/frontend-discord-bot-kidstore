import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { LangProvider } from './LangContext';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  login, verify2FA, exchangeOAuthCode, completeOAuthRegistration, verifyEmail,
  beginNewSession, cancelAuthAttempts, isSessionChangedError,
} from '../services/api';
import type { Customer } from '../types';

// Regresiones del punto 4 de la auditoría:
//  - la respuesta de un login / 2FA / canje OAuth / registro OAuth / verificación
//    de correo que llega DESPUÉS de cerrar sesión, de cancelar o de un intento más
//    nuevo se descarta (SESSION_CHANGED) sin guardar tokens;
//  - un fallo TEMPORAL al comprobar la sesión en una ruta protegida no manda a
//    /login: se queda en la misma ruta con un estado recuperable (Reintentar).
// fetch es un doble controlable: ninguna prueba toca la red.

function customer(id: string, name: string): Customer {
  return {
    id, epic_username: name, email: `${name}@example.com`, kc_balance: 0, has_password: true,
    google_linked: false, discord_linked: false, is_verified: true, created_at: new Date().toISOString(),
  } as Customer;
}

interface Deferred { resolve: (r: Response) => void; reject: (e: unknown) => void; url: string }
let pending: Deferred[] = [];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
function installControlledFetch() {
  pending = [];
  vi.stubGlobal('fetch', vi.fn((url: string) =>
    new Promise<Response>((resolve, reject) => { pending.push({ resolve, reject, url: String(url) }); })));
}
function callsTo(fragment: string) { return pending.filter(p => p.url.includes(fragment)); }
async function waitForCall(fragment: string, index = 0) {
  await waitFor(() => expect(callsTo(fragment).length).toBeGreaterThan(index));
  return callsTo(fragment)[index];
}

beforeEach(() => {
  localStorage.clear();
  beginNewSession();
  cancelAuthAttempts();
  installControlledFetch();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('respuestas atrasadas de inicio de sesión (api.ts)', () => {
  it('un login que responde después de cerrar sesión NO guarda tokens', async () => {
    const p = login('a@example.com', 'secret');
    beginNewSession(); // cerró sesión mientras el login estaba en vuelo
    callsTo('/store/login')[0].resolve(json(200, { success: true, token: 'late', refresh_token: 'late-r', customer: customer('A', 'alice') }));
    const err = await p.catch(e => e);
    expect(isSessionChangedError(err)).toBe(true);
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
  });

  it('un login viejo que responde después de uno más nuevo no reemplaza la sesión nueva', async () => {
    const oldAttempt = login('a@example.com', 'secret');
    const newAttempt = login('b@example.com', 'secret');
    const [oldCall, newCall] = callsTo('/store/login');
    newCall.resolve(json(200, { success: true, token: 'B', refresh_token: 'B-r', customer: customer('B', 'bob') }));
    await expect(newAttempt).resolves.toMatchObject({ requires2FA: false, token: 'B' });
    oldCall.resolve(json(200, { success: true, token: 'A', refresh_token: 'A-r', customer: customer('A', 'alice') }));
    expect(isSessionChangedError(await oldAttempt.catch(e => e))).toBe(true);
    expect(localStorage.getItem('kc_refresh_token')).toBe('B-r');
  });

  it('un 2FA que responde después de cancelar el paso NO inicia sesión', async () => {
    const p = verify2FA('temp', '123456');
    cancelAuthAttempts(); // "Volver" en el paso de 2FA
    callsTo('/store/login/2fa')[0].resolve(json(200, { success: true, token: 't', refresh_token: 'r', customer: customer('A', 'alice') }));
    expect(isSessionChangedError(await p.catch(e => e))).toBe(true);
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
  });

  it('un canje OAuth atrasado NO restaura la sesión cerrada', async () => {
    const p = exchangeOAuthCode('one-time-code');
    beginNewSession();
    callsTo('/auth/exchange')[0].resolve(json(200, { success: true, token: 'oauth', refresh_token: 'oauth-r' }));
    expect(isSessionChangedError(await p.catch(e => e))).toBe(true);
    expect(localStorage.getItem('kc_token')).toBeNull();
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
  });

  it('un canje OAuth vigente guarda los tokens', async () => {
    const p = exchangeOAuthCode('one-time-code');
    callsTo('/auth/exchange')[0].resolve(json(200, { success: true, token: 'oauth', refresh_token: 'oauth-r' }));
    await expect(p).resolves.toMatchObject({ requires2FA: false, token: 'oauth' });
    expect(localStorage.getItem('kc_token')).toBe('oauth');
    expect(localStorage.getItem('kc_refresh_token')).toBe('oauth-r');
  });

  it('registro OAuth y verificación de correo atrasados también se descartan', async () => {
    const reg = completeOAuthRegistration('pending', 'alice');
    const ver = verifyEmail('verify-token');
    beginNewSession();
    callsTo('/auth/complete-registration')[0].resolve(json(200, { success: true, token: 't', refresh_token: 'r', customer: customer('A', 'alice') }));
    callsTo('/store/verify-email')[0].resolve(json(200, { success: true, token: 't', customer: customer('A', 'alice') }));
    expect(isSessionChangedError(await reg.catch(e => e))).toBe(true);
    expect(isSessionChangedError(await ver.catch(e => e))).toBe(true);
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
  });
});

function LoginProbe() {
  const location = useLocation();
  return <p>login-page from={(location.state as { from?: string } | null)?.from ?? '-'}</p>;
}

function renderProtected(path: string) {
  // StrictMode como en main.tsx: el doble montaje lanza dos comprobaciones de
  // sesión y la primera, reemplazada, no debe decidir el estado de la ruta.
  return render(
    <StrictMode>
    <MemoryRouter initialEntries={[path]}>
      <LangProvider>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard/:tab" element={<ProtectedRoute><p>contenido protegido</p></ProtectedRoute>} />
            <Route path="/login" element={<LoginProbe />} />
          </Routes>
        </AuthProvider>
      </LangProvider>
    </MemoryRouter>
    </StrictMode>,
  );
}

describe('ProtectedRoute ante fallos al comprobar la sesión', () => {
  beforeEach(() => { localStorage.setItem('kc_lang', 'es'); });

  it('un fallo temporal NO manda a /login: estado recuperable en la misma ruta y Reintentar funciona', async () => {
    localStorage.setItem('kc_token', 'access');
    localStorage.setItem('kc_refresh_token', 'refresh');
    renderProtected('/dashboard/orders');
    await waitForCall('/store/me');
    const initial = callsTo('/store/me');
    // La comprobación reemplazada responde primero: no debe mandar a /login.
    initial[0].resolve(json(503, { error: 'mantenimiento' }));
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByText(/login-page/)).toBeNull();
    initial.slice(1).forEach(c => c.resolve(json(503, { error: 'mantenimiento' })));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('No pudimos verificar tu sesión');
    expect(screen.queryByText(/login-page/)).toBeNull();
    expect(localStorage.getItem('kc_token')).toBe('access'); // no se cerró sesión

    const before = callsTo('/store/me').length;
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    (await waitForCall('/store/me', before)).resolve(json(200, { success: true, customer: customer('A', 'alice') }));
    expect(await screen.findByText('contenido protegido')).toBeTruthy();
  });

  it('sin sesión manda a /login recordando la ruta original', async () => {
    renderProtected('/dashboard/orders?page=2');
    expect((await screen.findByText(/login-page/)).textContent).toContain('from=/dashboard/orders?page=2');
  });
});
