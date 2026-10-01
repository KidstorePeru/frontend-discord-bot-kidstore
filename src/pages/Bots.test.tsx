import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LangProvider } from '../context/LangContext';
import Bots from './Bots';

// Cada cuenta bot muestra cuántos amigos tiene en Epic (máximo 1000): una
// cuenta llena no ofrece "Copiar ID" (ya no puede aceptar solicitudes) y va
// al final de las cuentas conectadas.

const account = (id: string, name: string, friends: number | null) => ({
  id, display_name: name, remaining_gifts: 5, vbucks: 1000, is_active: true, created_at: '2026-01-01',
  friends_count: friends, friends_limit: 1000,
});

beforeEach(() => {
  localStorage.setItem('kc_lang', 'es');
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
    success: true, in_schedule: true, reason: '', current_time: '20:00',
    schedule: { enabled: true, start_hour: 0, end_hour: 23, timezone: 'America/Lima' },
    accounts: [account('b1', 'BotLleno', 1000), account('b2', 'BotNormal', 873), account('b3', 'BotCasiLleno', 990), account('b4', 'BotSinDato', null)],
  }), { status: 200 }))));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('Bots — amigos de cada cuenta', () => {
  it('muestra la cantidad de amigos y marca la cuenta llena', async () => {
    const { container, getByText } = render(<MemoryRouter><LangProvider><Bots /></LangProvider></MemoryRouter>);
    await waitFor(() => expect(getByText('BotLleno')).toBeTruthy());

    const cards = [...container.querySelectorAll('.bot-card')].slice(0, 4);
    const names = cards.map((c) => c.querySelector('.bot-name')?.textContent);
    expect(names).toEqual(['BotNormal', 'BotCasiLleno', 'BotSinDato', 'BotLleno']);

    const [normal, almost, unknown, full] = cards;
    expect(normal.textContent).toMatch(/873 \/ 1[.,]?000/);
    expect(normal.textContent).toContain('Acepta solicitudes');
    expect(almost.textContent).toContain('Quedan 10 cupos');
    expect(unknown.querySelector('.bot-friends')).toBeNull();
    expect(unknown.querySelector('button.bot-copy')).toBeTruthy();
    expect(full.textContent).toContain('No acepta más amigos');
    expect(full.textContent).toContain('Llena · agrega otra');
    expect(full.querySelector('button.bot-copy')).toBeNull();
  });
});
