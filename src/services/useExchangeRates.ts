// frontend/src/services/useExchangeRates.ts
import { useState, useEffect } from 'react';
import { getExchangeRates } from './api';

const CACHE_KEY = 'ksp_exchange_rates';
const TTL_MS    = 24 * 60 * 60 * 1000; // 24 horas

export interface ExchangeRates {
  USD:       number; // 1 PEN = X USD
  EUR:       number; // 1 PEN = X EUR
  fetchedAt: number;
}

// Fallback si la API falla
export const FALLBACK_RATES: ExchangeRates = {
  USD: 0.27,
  EUR: 0.25,
  fetchedAt: 0,
};

function loadCached(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: ExchangeRates = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt < TTL_MS) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveCache(rates: ExchangeRates): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(rates)); } catch {}
}

export async function fetchRates(): Promise<ExchangeRates> {
  const cached = loadCached();
  if (cached) return cached;

  try {
    const data = await getExchangeRates();
    const rates: ExchangeRates = {
      USD:       data.USD,
      EUR:       data.EUR,
      fetchedAt: data.fetchedAt || Date.now(),
    };
    saveCache(rates);
    return rates;
  } catch {
    return FALLBACK_RATES;
  }
}

/** Hook React — carga los tipos de cambio al montar el componente */
export function useExchangeRates() {
  const [rates,   setRates]   = useState<ExchangeRates>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRates().then(r => {
      setRates(r);
      setLoading(false);
    });
  }, []);

  return { rates, loading };
}
