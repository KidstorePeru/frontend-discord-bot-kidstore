// Comisiones a cargo del cliente (misma fórmula que backend/src/store/fees.go):
// la tienda siempre recibe el precio exacto del paquete. El backend calcula
// el cobro real; acá solo se muestra el desglose antes de pagar.

export interface GatewayFee {
  percent: number; // % de la pasarela sobre el total cobrado
  fixed: number;   // cargo fijo por operación (S/ en Mercado Pago, US$ en PayPal y cripto)
  tax: number;     // % de impuesto sobre la comisión (IGV)
  margin: number;  // % extra de seguridad
  // Tramo por volumen (Mercado Pago): si en el mes se cobra más que
  // volume_threshold, la comisión pasa a volume_percent. El servidor ya manda
  // la comisión vigente en `percent`; estos dos campos son para el panel.
  volume_threshold?: number;
  volume_percent?: number;
}

export interface RemittanceFee {
  percent: number;   // % que cobra la remesa
  fixed: number;     // cargo fijo por envío (€)
  fx_margin: number; // cuánto peor es el cambio de la remesa que el de mercado (%)
}

export interface PaymentFees {
  mercadopago: GatewayFee;
  paypal: GatewayFee;
  nowpayments: GatewayFee; // extra opcional: la comisión de NOWPayments y de la red ya la paga el cliente
  bizum: RemittanceFee;
}

// Las mismas que usa el backend si el admin no guardó otras.
export const DEFAULT_PAYMENT_FEES: PaymentFees = {
  mercadopago: { percent: 3.49, fixed: 1, tax: 18, margin: 0, volume_threshold: 25000, volume_percent: 3.99 },
  paypal: { percent: 6.9, fixed: 0.3, tax: 0, margin: 0 },
  nowpayments: { percent: 0, fixed: 0, tax: 0, margin: 0 },
  bizum: { percent: 1.5, fixed: 0, fx_margin: 0 },
};

// Hacia arriba al céntimo (nunca se cobra de menos).
const ceilCents = (x: number) => Math.ceil(x * 100 - 1e-6) / 100;
const roundCents = (x: number) => Math.round(x * 100) / 100;

/** Total que paga el cliente con la pasarela para que a la tienda le quede `price`. */
export function gatewayTotal(price: number, f: GatewayFee): { total: number; fee: number } {
  const tax = 1 + f.tax / 100;
  const pct = (f.percent / 100) * tax + f.margin / 100;
  const total = ceilCents((price + f.fixed * tax) / (1 - pct));
  return { total, fee: roundCents(total - price) };
}

/** Euros que paga el cliente por Bizum para que, tras la remesa, lleguen `pricePEN` soles. */
export function bizumTotal(pricePEN: number, eurPerPEN: number, f: RemittanceFee): { total: number; fee: number } {
  const baseEUR = pricePEN * eurPerPEN;
  const needed = baseEUR / (1 - f.fx_margin / 100);
  const total = ceilCents((needed + f.fixed) / (1 - f.percent / 100));
  return { total, fee: roundCents(total - roundCents(baseEUR)) };
}

/** Precio en dólares (PayPal y cripto), igual que lo convierte el servidor. */
export function priceUSD(pricePEN: number, usdPerPEN: number): number {
  return roundCents(pricePEN * usdPerPEN);
}
