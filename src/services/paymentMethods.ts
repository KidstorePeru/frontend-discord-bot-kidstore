// Nombre legible de cada método o pasarela de pago (el backend guarda el
// identificador interno: "mercadopago", "nowpayments", "manual"…).
const LABELS: Record<string, string> = {
  mercadopago: 'MercadoPago',
  paypal: 'PayPal',
  nowpayments: 'Cripto (NOWPayments)',
  dlocalgo: 'dLocal Go',
  yape: 'Yape',
  plin: 'Plin',
  bcp: 'BCP',
  interbank: 'Interbank',
  bbva: 'BBVA',
  bizum: 'Bizum',
};

export function paymentMethodLabel(value: string | null | undefined, es: boolean): string {
  const key = (value ?? '').trim().toLowerCase();
  if (!key) return es ? 'Sin método' : 'No method';
  if (key === 'manual' || key === 'admin' || key === 'admin-panel') return es ? 'Recarga manual' : 'Manual recharge';
  return LABELS[key] ?? value!.trim();
}
