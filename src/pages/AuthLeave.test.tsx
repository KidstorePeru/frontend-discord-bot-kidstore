import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LangProvider } from '../context/LangContext';
import Login from './Login';
import ResetPassword from './ResetPassword';
import AuthCallback from './AuthCallback';
import VerifyEmail from './VerifyEmail';
import { beginNewSession, cancelAuthAttempts, login, isSessionChangedError } from '../services/api';
import type { Customer } from '../types';

// Regresión: salir de una pantalla de autenticación NO cancelaba el intento en
// vuelo — un login lento que respondía después de ir a "¿Olvidaste tu
// contraseña?" iniciaba sesión igual y sacaba al usuario de donde estaba.
// fetch es un doble controlable: ninguna prueba toca la red.

function customer(id: string): Customer {
  return {
    id, epic_username: 'alice', email: 'alice@example.com', kc_balance: 0, has_password: true,
    google_linked: false, discord_linked: false, is_verified: true, created_at: new Date().toISOString(),
  } as Customer;
}

interface Pending { url: string; init?: RequestInit; resolve: (r: Response) => void }
let pending: Pending[] = [];
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const callsTo = (fragment: string) => pending.filter(p => p.url.includes(fragment));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('kc_lang', 'es');
  beginNewSession();
  cancelAuthAttempts();
  pending = [];
  // jsdom no trae ResizeObserver (lo usa el selector Ingresar/Crear cuenta).
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) =>
    new Promise<Response>(resolve => { pending.push({ url: String(url), init, resolve }); })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderAt(path: string, strict = false) {
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <LangProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/login-page" element={<p>login-page</p>} />
            <Route path="/dashboard" element={<p>dashboard</p>} />
            <Route path="/store" element={<p>store</p>} />
          </Routes>
        </AuthProvider>
      </LangProvider>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

describe('salir de una pantalla de autenticación cancela el intento', () => {
  it('login pendiente + ir a recuperar contraseña: la respuesta tardía no inicia sesión ni navega', async () => {
    const { container } = renderAt('/login');
    fireEvent.change(container.querySelector('input[type="email"]')!, { target: { value: 'alice@example.com' } });
    fireEvent.change(container.querySelector('input[type="password"]')!, { target: { value: 'secreta123' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(callsTo('/store/login').length).toBe(1));
    const loginCall = callsTo('/store/login')[0];

    // El usuario se va a "¿Olvidaste tu contraseña?" mientras el login sigue en vuelo.
    fireEvent.click(screen.getByText('¿Olvidaste tu contraseña?'));
    await waitFor(() => expect(container.querySelector('input[type="password"]')).toBeNull());
    expect(loginCall.init?.signal?.aborted).toBe(true); // la petición se canceló

    // Aun así llega la respuesta (el servidor ya la había procesado).
    loginCall.resolve(json(200, { success: true, token: 'late', refresh_token: 'late-r', customer: customer('A') }));
    await new Promise(r => setTimeout(r, 20));
    expect(localStorage.getItem('kc_token')).toBeNull();
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
    expect(screen.queryByText('dashboard')).toBeNull(); // sigue en recuperar contraseña
  });

  it('api: un login con la señal abortada se descarta con SESSION_CHANGED', async () => {
    const ctrl = new AbortController();
    const p = login('a@example.com', 'x', ctrl.signal);
    ctrl.abort();
    callsTo('/store/login')[0].resolve(json(200, { success: true, token: 't', refresh_token: 'r', customer: customer('A') }));
    expect(isSessionChangedError(await p.catch(e => e))).toBe(true);
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
  });

  it('callback OAuth: con StrictMode canjea el código UNA sola vez', async () => {
    renderAt('/auth/callback?code=abc', true);
    await waitFor(() => expect(callsTo('/auth/exchange').length).toBe(1));
    await new Promise(r => setTimeout(r, 20));
    expect(callsTo('/auth/exchange').length).toBe(1);
  });

  it('callback OAuth: salir antes de la respuesta no guarda tokens ni navega', async () => {
    const { unmount } = renderAt('/auth/callback?code=abc');
    await waitFor(() => expect(callsTo('/auth/exchange').length).toBe(1));
    unmount();
    callsTo('/auth/exchange')[0].resolve(json(200, { success: true, token: 'oauth', refresh_token: 'oauth-r' }));
    await new Promise(r => setTimeout(r, 20));
    expect(localStorage.getItem('kc_token')).toBeNull();
    expect(localStorage.getItem('kc_refresh_token')).toBeNull();
  });

  it('verificación de correo: con StrictMode verifica una sola vez y salir la cancela', async () => {
    const { unmount } = renderAt('/verify-email?token=t1', true);
    await waitFor(() => expect(callsTo('/store/verify-email').length).toBe(1));
    await new Promise(r => setTimeout(r, 20));
    expect(callsTo('/store/verify-email').length).toBe(1);
    unmount();
    callsTo('/store/verify-email')[0].resolve(json(200, { success: true, token: 't', customer: customer('A') }));
    await new Promise(r => setTimeout(r, 20));
    expect(localStorage.getItem('kc_token')).toBeNull();
  });
});
