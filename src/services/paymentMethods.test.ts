import { describe, it, expect } from 'vitest';
import { paymentMethodLabel } from './paymentMethods';

// El historial y los comprobantes mostraban el identificador interno
// ("mercadopago", "nowpayments", "manual") en vez del nombre del método.
describe('paymentMethodLabel', () => {
  it('nombres legibles de pasarelas y métodos manuales', () => {
    expect(paymentMethodLabel('mercadopago', true)).toBe('MercadoPago');
    expect(paymentMethodLabel('paypal', true)).toBe('PayPal');
    expect(paymentMethodLabel('nowpayments', true)).toBe('Cripto (NOWPayments)');
    expect(paymentMethodLabel('dlocalgo', true)).toBe('dLocal Go');
    expect(paymentMethodLabel('YAPE', true)).toBe('Yape');
  });
  it('recargas manuales y valores desconocidos o vacíos', () => {
    expect(paymentMethodLabel('manual', true)).toBe('Recarga manual');
    expect(paymentMethodLabel('manual', false)).toBe('Manual recharge');
    expect(paymentMethodLabel('otro-metodo', true)).toBe('otro-metodo');
    expect(paymentMethodLabel('', true)).toBe('Sin método');
    expect(paymentMethodLabel(undefined, false)).toBe('No method');
  });
});
