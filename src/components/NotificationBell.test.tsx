import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell';

// La campana: muestra el contador de avisos sin leer, al abrirla carga los
// recientes y los marca como leídos (el contador vuelve a 0).

let mockCustomer: { id: string } | null = { id: 'c1' };
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ customer: mockCustomer }) }));
vi.mock('../context/LangContext', () => ({ useLang: () => ({ lang: 'es' }) }));

let calls: { url: string; method: string }[] = [];

beforeEach(() => {
  mockCustomer = { id: 'c1' };
  calls = [];
  localStorage.setItem('kc_token', 't');
  vi.stubGlobal('fetch', vi.fn((url: string, opts?: RequestInit) => {
    calls.push({ url: String(url), method: opts?.method ?? 'GET' });
    const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    if (String(url).includes('/store/notifications/unread')) return json({ success: true, unread: 2 });
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
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

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

  it('sin sesión no se muestra ni consulta nada', () => {
    mockCustomer = null;
    const { container } = renderBell();
    expect(container.innerHTML).toBe('');
    expect(calls).toHaveLength(0);
  });
});
