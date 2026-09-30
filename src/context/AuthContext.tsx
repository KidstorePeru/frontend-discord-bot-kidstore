import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Customer } from '../types';
import { getMe, logoutRequest, beginNewSession, isSessionChangedError } from '../services/api';

interface AuthState {
  customer: Customer | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  setAuth: (token: string, customer: Customer) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  // true cuando la última comprobación de la sesión falló por algo TEMPORAL
  // (red, 503): la sesión no se cerró y se reintenta sola.
  sessionUnavailable: boolean;
}

// Reintentos automáticos tras un fallo temporal al comprobar la sesión.
const RETRY_DELAYS_MS = [2000, 5000, 15000, 30000];

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kc_token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('kc_token'));
  const [sessionUnavailable, setSessionUnavailable] = useState(false);

  // Cada logout, cambio de cuenta o nueva consulta del perfil avanza este número;
  // una respuesta que vuelve con un número distinto al que tenía al salir es
  // atrasada y se descarta (no restaura el usuario ni cierra la sesión nueva).
  const seqRef = useRef(0);
  const customerIdRef = useRef<string | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);

  const clearRetry = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    retryAttempt.current = 0;
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('kc_refresh_token');
    seqRef.current++;
    beginNewSession(); // invalida consultas y renovaciones pendientes de esta sesión
    clearRetry();
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_refresh_token');
    customerIdRef.current = null;
    setToken(null);
    setCustomer(null);
    setSessionUnavailable(false);
    setLoading(false);
    // Revocar la sesión del lado del servidor también — sin esto, el
    // refresh token seguía siendo válido hasta 7 días después de "cerrar
    // sesión". No hace falta esperar la respuesta, la sesión local ya se
    // limpió igual.
    void logoutRequest(refreshToken);
    // Defensa adicional: pedirle al service worker que borre todo su cache
    // — el propio worker ya no cachea respuestas de la API (solo recursos
    // estáticos), pero esto cubre el caso de una pestaña que todavía tenga
    // corriendo una versión anterior mientras se actualiza.
    navigator.serviceWorker?.controller?.postMessage('CLEAR_CACHES');
  }, [clearRetry]);

  const setAuth = useCallback((t: string, c: Customer) => {
    // Cambiar de cuenta (o iniciar sesión desde cero) descarta lo que estaba en vuelo.
    if (customerIdRef.current !== c.id) {
      seqRef.current++;
      beginNewSession();
      clearRetry();
    }
    customerIdRef.current = c.id;
    localStorage.setItem('kc_token', t);
    setToken(t);
    setCustomer(c);
    setSessionUnavailable(false);
    setLoading(false);
  }, [clearRetry]);

  const refresh = useCallback(async () => {
    const stored = localStorage.getItem('kc_token');
    if (!stored) return;
    // Tokens guardados fuera de setAuth (canje OAuth en AuthCallback): el estado
    // tiene que reflejarlos para que ProtectedRoute sepa que HAY una sesión que
    // comprobar aunque la comprobación falle por algo temporal.
    setToken(stored);
    const seq = ++seqRef.current;
    try {
      const me = await getMe();
      if (seq !== seqRef.current) return; // atrasada: cerró sesión, cambió de cuenta o hay una consulta más nueva
      customerIdRef.current = me.id;
      setCustomer(me);
      setSessionUnavailable(false);
      clearRetry();
    } catch (err: unknown) {
      if (seq !== seqRef.current || isSessionChangedError(err)) return; // idem: no toca la sesión actual
      const code = (err as Error & { code?: string })?.code;
      if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED') {
        // Sesión realmente inválida (el servidor rechazó el token y el refresh).
        logout();
      } else {
        // Error temporal (red caída, 503, renovación no disponible): NO se cierra
        // la sesión ni se borran tokens; se marca como no disponible y se reintenta
        // con espera creciente (y al volver la conexión, ver el efecto de abajo).
        setSessionUnavailable(true);
        if (!retryTimer.current && retryAttempt.current < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[retryAttempt.current++];
          retryTimer.current = setTimeout(() => { retryTimer.current = null; void refresh(); }, delay);
        }
      }
    } finally {
      // Solo la comprobación MÁS NUEVA termina la carga: si una anterior (ya
      // reemplazada, p. ej. el doble montaje de React StrictMode) la terminaba,
      // ProtectedRoute veía "sin cliente y sin fallo temporal" durante un
      // instante y mandaba a /login perdiendo la ruta.
      if (seq === seqRef.current) setLoading(false);
    }
  }, [logout, clearRetry]);

  useEffect(() => {
    if (token) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar — refresh y token se estabilizan con useCallback/useState

  // Al recuperar la conexión, reintenta de inmediato si la sesión quedó sin comprobar.
  useEffect(() => {
    const onOnline = () => {
      if (sessionUnavailable && localStorage.getItem('kc_token')) { clearRetry(); void refresh(); }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sessionUnavailable, refresh, clearRetry]);

  useEffect(() => clearRetry, [clearRetry]);

  return (
    <AuthContext.Provider value={{ customer, token, loading, isAdmin: customer?.is_admin ?? false, setAuth, logout, refresh, sessionUnavailable }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
