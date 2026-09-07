import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { detectGeo, supportedCurrencyFor } from '../services/geo';
import { useExchangeRates, FALLBACK_RATES, type ExchangeRates } from '../services/useExchangeRates';

interface CurrencyState {
  /** Código ISO 4217 de la divisa de referencia del cliente, ej. "PEN", "MXN", "USD". */
  currency: string;
  /** true si el cliente la eligió manualmente (no la detectada por IP). */
  currencyOverridden: boolean;
  setCurrency: (code: string) => void;
  rates: ExchangeRates;
  ratesLoading: boolean;
}

const CurrencyContext = createContext<CurrencyState | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => localStorage.getItem('kc_currency') || 'PEN');
  const [currencyOverridden, setCurrencyOverridden] = useState<boolean>(() => !!localStorage.getItem('kc_currency'));
  const { rates, loading: ratesLoading } = useExchangeRates();

  // Si el cliente nunca eligió divisa manualmente, la detectamos por su país.
  useEffect(() => {
    if (localStorage.getItem('kc_currency')) return;
    detectGeo().then(geo => {
      if (localStorage.getItem('kc_currency')) return; // pudo elegir mientras cargaba
      setCurrencyState(supportedCurrencyFor(geo.currencyCode));
    });
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    setCurrencyOverridden(true);
    localStorage.setItem('kc_currency', code);
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, currencyOverridden, setCurrency, rates: rates || FALLBACK_RATES, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be inside CurrencyProvider');
  return ctx;
}
