import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Customer } from '../types';
import { getMe } from '../services/api';

interface AuthState {
  customer: Customer | null;
  token: string | null;
  loading: boolean;
  setAuth: (token: string, customer: Customer) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kc_token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('kc_token'));

  const logout = useCallback(() => {
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_refresh_token');
    setToken(null);
    setCustomer(null);
  }, []);

  const setAuth = useCallback((t: string, c: Customer) => {
    localStorage.setItem('kc_token', t);
    setToken(t);
    setCustomer(c);
  }, []);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('kc_token')) return;
    try {
      const me = await getMe();
      setCustomer(me);
    } catch (err: unknown) {
      // Si el token expiró o es inválido, hacer logout automático
      const code = (err as Error & { code?: string })?.code;
      if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED') {
        logout();
      } else {
        // Otro tipo de error (ej: red caída) — no cerrar sesión, solo loguear
        // Session refresh failed (network error, etc.) — don't logout
      }
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      refresh().finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar — refresh y token se estabilizan con useCallback/useState

  return (
    <AuthContext.Provider value={{ customer, token, loading, setAuth, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
