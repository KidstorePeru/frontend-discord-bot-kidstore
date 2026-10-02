import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { requestAccountCheck } from '../services/accountEvents';

// La campana: muestra el contador de avisos sin leer, al abrirla carga los
// recientes y los marca como leídos (el contador vuelve a 0). Su consulta
// también trae el saldo: si cambió, actualiza la cuenta sin recargar la página.

let mockCustomer: { id: string; kc_balance: number } | null = { id: 'c1', kc_balance: 100 };
const mockRefresh = vi.fn(() => Promise.resolve());
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ customer: mockCustomer, refresh: mockRefresh }) }));
vi.mock('../context/LangContext', () => ({ useLang: () => ({ lang: 'es' }) }));

let calls: { url: string; method: string }[] = [];
let pulse = { unread: 2, kc_balance: 100, pending_manual: 0 };

beforeEach(() => {
  mockCustomer = { id: 'c1', kc_balance: 100 };
  mockRefresh.mockClear();
  pulse = { unread: 2, kc_balance: 100, pending_manual: 0 };
  calls = [];
  localStorage.setItem('kc_token', 't');
  vi.stubGlobal('fetch', vi.fn((url: string, opts?: RequestInit) => {
    calls.push({ url: String(url), method: opts?.method ?? 'GET' });
    const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    if (String(url).includes('/store/notifications/unread')) return json({ success: true, ...pulse });
    if (String(url).includes('/store/notifications/read')) return json({ success: true });
    return json({
      success: true, unread: 2,
      notifications: [
        { id: 'a', kind: 'wishlist_back', data: { name: 'Rata radiactiva', price_kc: 1200, image: 'https://x/a.png' }, read: false, created_at: new Date().toISOString() },
        { id: 'b', kind: 'order_sent', data: { item_name: 'Lote Madison Beer' }, read: false, created_at: new Date().toISOString() },
      ],
    });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });

const pulses = () => calls.filter((c) => c.url.includes('/store/notifications/unread')).length;

const renderBell = () => render(<MemoryRouter><NotificationBell /></MemoryRouter>);

describe('NotificationBell', () => {
  it('muestra el contador, abre los avisos y los marca como leídos', async () => {
    const { findByText, getByRole, getByText, queryByText } = renderBell();
    await findByText('2');
    fireEvent.click(getByRole('button', { name: /Notificaciones \(2 sin leer\)/ }));
    await findByText('Volvió a la tienda: Rata radiactiva');
    expect(getByText('Pedido entregado: Lote Madison Beer').closest('a')?.getAttribute('href')).toBe('/dashboard/orders');
    await waitFor(() => expect(calls.some((c) => c.url.includes('/store/notifications/read') && c.method === 'POST')).toBe(true));
    await waitFor(() => expect(queryByText('2')).toBeNull());
    expect(getByText('Ver todas').getAttribute('href')).toBe('/notifications');
    expect(getByText('Mi lista de deseos').getAttribute('href')).toBe('/wishlist');
  });

  it('se cierra con Escape', async () => {
    const { getByRole, findByRole, queryByRole } = renderBell();
    fireEvent.click(getByRole('button', { name: /^Notificaciones/ }));
    await findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryByRole('dialog')).toBeNull();
  });

  it('si el saldo cambió (p. ej. se aprobó un comprobante), actualiza la cuenta y avisa a la página', async () => {
    const changed = vi.fn();
    window.addEventListener('kc:account-changed', changed);
    renderBell();
    await waitFor(() => expect(pulses()).toBe(1));
    expect(mockRefresh).not.toHaveBeenCalled(); // mismo saldo que el mostrado

    pulse = { unread: 3, kc_balance: 900, pending_manual: 0 };
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(changed).toHaveBeenCalledTimes(1);
    window.removeEventListener('kc:account-changed', changed);
  });

  it('con un comprobante en revisión consulta cada 5 s; si no, cada 30 s', async () => {
    vi.useFakeTimers();
    pulse = { unread: 0, kc_balance: 100, pending_manual: 1 };
    renderBell();
    await vi.advanceTimersByTimeAsync(0);
    expect(pulses()).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(pulses()).toBe(2);

    pulse = { unread: 1, kc_balance: 2500, pending_manual: 0 }; // aprobado
    await vi.advanceTimersByTimeAsync(5_000);
    expect(pulses()).toBe(3);
    expect(mockRefresh).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(pulses()).toBe(3); // ya no hay nada en revisión
    await vi.advanceTimersByTimeAsync(25_000);
    expect(pulses()).toBe(4);
  });

  it('si la página avisa que envió un comprobante, consulta ya y pasa a cada 5 s sin esperar los 30 s', async () => {
    vi.useFakeTimers();
    pulse = { unread: 0, kc_balance: 100, pending_manual: 0 };
    renderBell();
    await vi.advanceTimersByTimeAsync(0);
    expect(pulses()).toBe(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pulses()).toBe(1); // nada en revisión: cada 30 s

    pulse = { unread: 0, kc_balance: 100, pending_manual: 1 };
    requestAccountCheck();
    await vi.advanceTimersByTimeAsync(0);
    expect(pulses()).toBe(2);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(pulses()).toBe(3);
  });

  it('sin sesión no se muestra ni consulta nada', () => {
    mockCustomer = null;
    const { container } = renderBell();
    expect(container.innerHTML).toBe('');
    expect(calls).toHaveLength(0);
  });
});
