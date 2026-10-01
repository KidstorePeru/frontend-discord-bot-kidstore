import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import ReviewModal from './ReviewModal';

// Calificar un pedido entregado: exige elegir estrellas, envía la reseña y
// avisa si el pedido ya tenía una.

let status = 200;
let sentBody: unknown = null;

beforeEach(() => {
  status = 200;
  sentBody = null;
  vi.stubGlobal('fetch', vi.fn((_url: string, opts?: RequestInit) => {
    sentBody = opts?.body ? JSON.parse(String(opts.body)) : null;
    return Promise.resolve(new Response(JSON.stringify(status === 200 ? { success: true } : { success: false, error: 'x' }), { status }));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const order = { id: 'o-1', item_name: 'Lote Madison Beer', item_image: 'https://x/a.png' };

describe('ReviewModal', () => {
  it('pide elegir estrellas antes de enviar', () => {
    const onDone = vi.fn();
    const { getByText, getByRole } = render(<ReviewModal order={order} es onClose={vi.fn()} onDone={onDone} />);
    fireEvent.click(getByText('Enviar reseña'));
    expect(getByRole('alert').textContent).toBe('Elige de 1 a 5 estrellas.');
    expect(sentBody).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('envía estrellas y comentario y agradece', async () => {
    const onDone = vi.fn();
    const { getByLabelText, getByPlaceholderText, getByText, findByText } = render(
      <ReviewModal order={order} es onClose={vi.fn()} onDone={onDone} />,
    );
    fireEvent.click(getByLabelText('4 — Buena'));
    expect(getByLabelText('4 — Buena').getAttribute('aria-checked')).toBe('true');
    fireEvent.change(getByPlaceholderText(/Cuéntanos/), { target: { value: '  Llegó rápido  ' } });
    fireEvent.click(getByText('Enviar reseña'));
    await findByText('¡Gracias por tu reseña!');
    expect(sentBody).toEqual({ order_id: 'o-1', rating: 4, comment: 'Llegó rápido' });
    expect(onDone).toHaveBeenCalledWith('o-1');
  });

  it('avisa si el pedido ya tenía reseña', async () => {
    status = 409;
    const { getByLabelText, getByText, getByRole } = render(<ReviewModal order={order} es={false} onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(getByLabelText('5 — Excellent'));
    fireEvent.click(getByText('Send review'));
    await waitFor(() => expect(getByRole('alert').textContent).toBe('You already reviewed this order.'));
  });
});
