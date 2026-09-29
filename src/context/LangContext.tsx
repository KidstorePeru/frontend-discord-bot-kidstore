import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Lang } from '../services/i18n';
import { t as translate, type TranslationKey } from '../services/i18n';
import { detectGeo, isLatam } from '../services/geo';

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangState | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('kc_lang');
    return (saved === 'en' ? 'en' : 'es') as Lang;
  });

  // Si el visitante nunca eligió idioma manualmente, lo detectamos por su
  // país (geolocalización por IP): Latinoamérica → español, cualquier otro
  // país → inglés. Nunca pisa una elección ya guardada.
  useEffect(() => {
    if (localStorage.getItem('kc_lang')) return;
    detectGeo().then(geo => {
      if (localStorage.getItem('kc_lang')) return; // pudo elegir mientras cargaba
      const detected: Lang = isLatam(geo.countryCode) ? 'es' : 'en';
      setLangState(detected);
      localStorage.setItem('kc_lang', detected);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un solo idioma para todo el sitio, incluida la tienda de Fortnite (antes
  // la tienda tenía su propio idioma independiente, ver storeLang/setStoreLang
  // — se unificó a pedido explícito).
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('kc_lang', l);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(key, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
}
