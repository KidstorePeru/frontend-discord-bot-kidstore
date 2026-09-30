import { describe, it, expect } from 'vitest';
import { formatReferencePrice, vbucksToKC, KC_PACKAGES } from './constants';
import type { ExchangeRates } from './useExchangeRates';

// Precios en divisas: solo existen al RECARGAR KidCoins (Recargar, Inicio). Los
// objetos de la tienda se cobran en KC (1 monedas V = 1 KC), nunca en divisas.

const rates: ExchangeRates = { USD: 0.27, EUR: 0.25, rates: { PEN: 1, USD: 0.27, EUR: 0.25 }, fetchedAt: 0 };

// Número que muestra un precio formateado, sin importar el separador decimal del locale.
function amountOf(formatted: string): number {
  const digits = formatted.replace(/[^\d.,]/g, '');
  return Number(digits.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.'));
}

describe('precio de los paquetes de KC en la divisa del cliente', () => {
  it('convierte el importe total del paquete y recién después redondea', () => {
    const starter = KC_PACKAGES[0]; // S/ 10.40
    expect(amountOf(formatReferencePrice(starter.price_pen, 'USD', rates))).toBeCloseTo(2.81, 2);
    expect(amountOf(formatReferencePrice(starter.price_pen, 'EUR', rates))).toBeCloseTo(2.6, 2);
    expect(formatReferencePrice(starter.price_pen, 'PEN', rates)).toContain('S/');
  });

  it('sin tasa para la divisa muestra el importe en soles con su propio símbolo', () => {
    const mxn = formatReferencePrice(10.4, 'MXN', rates);
    expect(mxn).toContain('S/');
    expect(mxn).not.toMatch(/MX\$|\$/);
  });
});

describe('precio de los objetos de la tienda', () => {
  it('se cobra en KidCoins: 1 monedas V = 1 KC', () => {
    expect(vbucksToKC(1500)).toBe(1500);
    expect(vbucksToKC(200)).toBe(200);
  });
});
