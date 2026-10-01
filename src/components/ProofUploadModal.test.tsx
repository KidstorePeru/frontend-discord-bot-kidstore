import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import ProofUploadModal from './ProofUploadModal';
import { prepareProof, ProofPrepareError, MAX_PROOF_BYTES } from '../services/proofImage';

// Subir el comprobante de un pago manual: exige archivo y confirmación,
// manda los datos correctos y explica los errores del servidor.

let status = 200;
let sent: FormData | null = null;

beforeEach(() => {
  status = 200;
  sent = null;
  localStorage.setItem('kc_token', 't');
  vi.stubGlobal('fetch', vi.fn((_url: string, opts?: RequestInit) => {
    sent = opts?.body as FormData;
    const body = status === 200
      ? { success: true, request: { id: 'r1', status: 'pending', kc_amount: 2400, amount: 31.2, currency: 'PEN', method: 'yape' } }
      : { success: false, error: 'x' };
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

const summary = { packageId: 'gamer', packageName: 'Gamer', kc: 2400, amountLabel: 'S/ 31.20', methodId: 'yape', methodLabel: 'Yape' };
const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'foto.jpg', { type: 'image/jpeg' });

describe('ProofUploadModal', () => {
  it('pide el archivo y la confirmación antes de enviar', async () => {
    const { getByText, getByRole } = render(<ProofUploadModal summary={summary} es onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(getByText('Enviar comprobante'));
    expect(getByRole('alert').textContent).toBe('Sube la imagen o el PDF de tu comprobante.');

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [jpeg()] } });
    await waitFor(() => expect(getByText(/Cambiar archivo/)).toBeTruthy());
    fireEvent.click(getByText('Enviar comprobante'));
    expect(getByRole('alert').textContent).toBe('Confirma que ya realizaste el pago.');
    expect(sent).toBeNull();
  });

  it('envía el comprobante con el paquete y el método, y confirma la recepción', async () => {
    const onDone = vi.fn();
    const { getByText, getByPlaceholderText, getByRole, findByText } = render(<ProofUploadModal summary={summary} es onClose={vi.fn()} onDone={onDone} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [jpeg()] } });
    await waitFor(() => expect(getByText(/Cambiar archivo/)).toBeTruthy());
    fireEvent.change(getByPlaceholderText('Lo encuentras en tu comprobante'), { target: { value: ' 0123 4567 ' } });
    fireEvent.click(getByRole('checkbox'));
    fireEvent.click(getByText('Enviar comprobante'));
    await findByText('¡Comprobante recibido!');
    expect(sent).toBeInstanceOf(FormData);
    expect(sent!.get('package_id')).toBe('gamer');
    expect(sent!.get('method')).toBe('yape');
    expect(sent!.get('operation_number')).toBe('01234567');
    expect(sent!.get('confirm')).toBe('true');
    expect(sent!.get('proof')).toBeInstanceOf(Blob);
    expect(onDone).toHaveBeenCalled();
  });

  it('avisa si ya hay comprobantes en revisión', async () => {
    status = 409;
    const { getByText, getByRole } = render(<ProofUploadModal summary={summary} es onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [jpeg()] } });
    await waitFor(() => expect(getByText(/Cambiar archivo/)).toBeTruthy());
    fireEvent.click(getByRole('checkbox'));
    fireEvent.click(getByText('Enviar comprobante'));
    await waitFor(() => expect(getByRole('alert').textContent).toMatch(/Ya tienes comprobantes en revisión/));
  });

  it('rechaza archivos que no son imagen ni PDF', async () => {
    const { getByRole } = render(<ProofUploadModal summary={summary} es onClose={vi.fn()} onDone={vi.fn()} />);
    const txt = new File(['hola'], 'nota.txt', { type: 'text/plain' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [txt] } });
    await waitFor(() => expect(getByRole('alert').textContent).toBe('Sube una imagen (JPG, PNG o WebP) o un PDF.'));
  });
});

describe('prepareProof', () => {
  it('PDF pasa tal cual; uno de más de 5 MB se rechaza', async () => {
    const pdf = new File(['%PDF-1.4'], 'c.pdf', { type: 'application/pdf' });
    const out = await prepareProof(pdf);
    expect(out.isPdf).toBe(true);
    expect(out.blob).toBe(pdf);
    const big = new File([new Uint8Array(MAX_PROOF_BYTES + 1)], 'c.pdf', { type: 'application/pdf' });
    await expect(prepareProof(big)).rejects.toEqual(new ProofPrepareError('too_large'));
  });

  it('si el navegador no puede procesar la foto, la sube tal cual si es liviana', async () => {
    const out = await prepareProof(jpeg());
    expect(out.isPdf).toBe(false);
    expect(out.blob.size).toBeGreaterThan(0);
  });
});
