// Aviso dentro de la página de que cambió algo de la cuenta (saldo o
// comprobantes en revisión). Lo dispara la campana al detectarlo en su consulta
// periódica; las páginas que muestran esos datos lo escuchan y se recargan.

const ACCOUNT_CHANGED = 'kc:account-changed';

export function emitAccountChanged(): void {
  window.dispatchEvent(new Event(ACCOUNT_CHANGED));
}

export function onAccountChanged(cb: () => void): () => void {
  window.addEventListener(ACCOUNT_CHANGED, cb);
  return () => window.removeEventListener(ACCOUNT_CHANGED, cb);
}

// En sentido contrario: la página pide una consulta inmediata (p. ej. recién
// envió un comprobante, así la campana pasa enseguida a consultar cada 5 s).
const ACCOUNT_CHECK = 'kc:account-check';

export function requestAccountCheck(): void {
  window.dispatchEvent(new Event(ACCOUNT_CHECK));
}

export function onAccountCheck(cb: () => void): () => void {
  window.addEventListener(ACCOUNT_CHECK, cb);
  return () => window.removeEventListener(ACCOUNT_CHECK, cb);
}
