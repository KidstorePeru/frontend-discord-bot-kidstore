import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ManualPaymentsList, { manualSupportCode } from './ManualPaymentsList';
import type { ManualPaymentRequest } from '../services/api';

// Un comprobante rechazado le dice al cliente cómo reclamar si fue un error.

afterEach(cleanup);

const base = {
  package_id: 'starter', package_name: 'Starter', kc_amount: 800, amount: 10.4, currency: 'PEN',
  method: 'yape', operation_number: '', proof_content_type: 'image/jpeg', proof_deleted: false,
  created_at: '2026-10-01T18:00:00Z',
};

describe('ManualPaymentsList', () => {
  it('rechazado: muestra el motivo y el contacto con soporte con el código', () => {
    const r = { ...base, id: 'a1b2c3d4-0000-4000-8000-000000000001', status: 'rejected', reject_reason: 'No encontramos el pago.' } as ManualPaymentRequest;
    const { getByText, getByRole } = render(<ManualPaymentsList requests={[r]} es />);
    expect(getByText('Rechazado: No encontramos el pago.')).toBeTruthy();
    expect(getByText(/¿Crees que es un error\? Contacta a soporte/)).toBeTruthy();
    expect(getByText('A1B2C3D4')).toBeTruthy();
    const wa = getByRole('link', { name: 'WhatsApp' }).getAttribute('href')!;
    expect(wa.startsWith('https://wa.me/51983454837?text=')).toBe(true);
    expect(decodeURIComponent(wa.split('text=')[1])).toBe('Hola, mi comprobante de pago A1B2C3D4 fue rechazado y creo que es un error.');
    expect(getByRole('link', { name: 'Discord' }).getAttribute('href')).toBe('https://discord.gg/kidstore');
  });

  it('en revisión o aprobado no muestra el contacto de reclamo', () => {
    const reqs = [
      { ...base, id: 'b0000000-0000-4000-8000-000000000001', status: 'pending' },
      { ...base, id: 'c0000000-0000-4000-8000-000000000001', status: 'approved' },
    ] as ManualPaymentRequest[];
    const { queryByText } = render(<ManualPaymentsList requests={reqs} es={false} />);
    expect(queryByText(/Think this is a mistake/)).toBeNull();
  });

  it('el código coincide con el que ve soporte en el panel', () => {
    expect(manualSupportCode('a1b2c3d4-0000-4000-8000-000000000001')).toBe('A1B2C3D4');
  });
});
