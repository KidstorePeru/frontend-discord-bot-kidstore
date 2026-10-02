import { describe, it, expect } from 'vitest';
import { DEFAULT_PAYMENT_FEES, gatewayTotal, bizumTotal, type GatewayFee, type RemittanceFee } from './fees';

// Mismos ejemplos que backend/src/store/fees_test.go: la web debe mostrar
// exactamente lo que cobrará el servidor.

const netAfterGateway = (total: number, f: GatewayFee) => total - (f.percent / 100 * total + f.fixed) * (1 + f.tax / 100);
const penAfterRemittance = (total: number, eurPerPEN: number, f: RemittanceFee) =>
  (total * (1 - f.percent / 100) - f.fixed) * (1 - f.fx_margin / 100) / eurPerPEN;

describe('comisión de Mercado Pago', () => {
  it('Gamer S/31.20 con la tarifa por defecto: el cliente paga S/33.78 (comisión S/2.58)', () => {
    expect(gatewayTotal(31.20, DEFAULT_PAYMENT_FEES.mercadopago)).toEqual({ total: 33.78, fee: 2.58 });
  });

  it('PayPal Gamer: US$8.42 con 6.9% + US$0.30 → el cliente paga US$9.37 (comisión US$0.95)', () => {
    expect(gatewayTotal(8.42, DEFAULT_PAYMENT_FEES.paypal)).toEqual({ total: 9.37, fee: 0.95 });
  });

  it('cripto: sin extra configurado no se suma nada (NOWPayments cobra al cliente)', () => {
    expect(gatewayTotal(8.42, DEFAULT_PAYMENT_FEES.nowpayments)).toEqual({ total: 8.42, fee: 0 });
  });

  it('a la tienda siempre le queda al menos el precio, sin cobrar de más', () => {
    const tarifas: GatewayFee[] = [
      DEFAULT_PAYMENT_FEES.mercadopago,
      DEFAULT_PAYMENT_FEES.paypal,
      { percent: 4.99, fixed: 1, tax: 18, margin: 0 },
      { percent: 3.99, fixed: 0, tax: 18, margin: 0 },
      { percent: 3.49, fixed: 1, tax: 18, margin: 0.5 },
    ];
    for (const f of tarifas) {
      for (let cents = 130; cents <= 1_000_000; cents = Math.floor(cents * 1.5) + 7) {
        const price = cents / 100;
        const { total, fee } = gatewayTotal(price, f);
        const net = netAfterGateway(total, f);
        expect(net + 1e-9).toBeGreaterThanOrEqual(price);
        expect(net - price).toBeLessThanOrEqual(0.02 + f.margin / 100 * total);
        expect(Math.abs(total - price - fee)).toBeLessThan(0.001);
      }
    }
  });
});

describe('recargo de Bizum', () => {
  it('con 1.5% da lo mismo que antes: S/10.40 a 0.25 €/S/ → €2.64', () => {
    expect(bizumTotal(10.40, 0.25, { percent: 1.5, fixed: 0, fx_margin: 0 })).toEqual({ total: 2.64, fee: 0.04 });
  });

  it('cubre la comisión de la remesa, su cargo fijo y el tipo de cambio', () => {
    const f: RemittanceFee = { percent: 2, fixed: 1.99, fx_margin: 1.5 };
    for (const rate of [0.2312, 0.25, 0.2777]) {
      for (let cents = 130; cents <= 500_000; cents = Math.floor(cents * 1.5) + 11) {
        const price = cents / 100;
        const { total } = bizumTotal(price, rate, f);
        const got = penAfterRemittance(total, rate, f);
        expect(got + 1e-9).toBeGreaterThanOrEqual(price);
        expect(got - price).toBeLessThanOrEqual(0.05);
      }
    }
  });
});
