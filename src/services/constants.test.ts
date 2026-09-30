import { describe, it, expect } from 'vitest';
import { vbucksReferencePrice, PEN_PER_KC } from './constants';
import type { ExchangeRates } from './useExchangeRates';

// Regresión: el precio de referencia de la tienda convertía primero la tasa por
// V-Buck (0,013 PEN) y la redondeaba a céntimos — en USD/EUR eso daba 0,00, así
// que TODOS los precios salían "$0.00" / "€0.00". Además, sin tasa para la
// divisa, mostraba el importe en soles con el símbolo de otra moneda.

const rates: ExchangeRates = { USD: 0.27, EUR: 0.25, rates: { PEN: 1, USD: 0.27, EUR: 0.25 }, fetchedAt: 0 };

// Número que muestra un precio formateado, sin importar el separador decimal del locale.
function amountOf(formatted: string): number {
  const digits = formatted.replace(/[^\d.,]/g, '');
  return Number(digits.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.'));
}

describe('vbucksReferencePrice', () => {
  it('convierte el importe TOTAL y recién después redondea (nunca $0.00)', () => {
    const usd = vbucksReferencePrice(1500, 'USD', rates); // 1500 × 0,013 = 19,50 PEN × 0,27 = 5,265
    expect(amountOf(usd)).toBeCloseTo(5.27, 2);
    expect(usd).toContain('$');
    const eur = vbucksReferencePrice(500, 'EUR', rates); // 6,50 PEN × 0,25 = 1,625
    expect(amountOf(eur)).toBeCloseTo(1.63, 2);
    expect(eur).toContain('€');
  });

  it('incluso el objeto más barato tiene un precio distinto de cero', () => {
    for (const code of ['USD', 'EUR']) {
      expect(amountOf(vbucksReferencePrice(200, code, rates))).toBeGreaterThan(0);
    }
  });

  it('en soles es exactamente V-Bucks × precio del KC', () => {
    expect(amountOf(vbucksReferencePrice(800, 'PEN', rates))).toBeCloseTo(800 * PEN_PER_KC, 2);
    expect(vbucksReferencePrice(800, 'PEN', rates)).toContain('S/');
  });

  it('sin tasa para la divisa muestra el importe en soles con su propio símbolo', () => {
    const mxn = vbucksReferencePrice(1000, 'MXN', rates); // no hay tasa MXN
    expect(mxn).toContain('S/');
    expect(amountOf(mxn)).toBeCloseTo(13, 2);
    expect(mxn).not.toMatch(/MX\$|\$/);
  });
});
