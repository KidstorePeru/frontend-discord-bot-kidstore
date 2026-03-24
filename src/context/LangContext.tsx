import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Lang } from '../services/i18n';
import { t as translate, type TranslationKey } from '../services/i18n';

interface LangState {
  lang: Lang;
  storeLang: Lang;
  storeOverridden: boolean;
  setLang: (l: Lang) => void;
  setStoreLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangState | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('kc_lang');
    return (saved === 'en' ? 'en' : 'es') as Lang;
  });
  const [storeLang, setStoreLangState] = useState<Lang>(lang);
  const [storeOverridden, setStoreOverridden] = useState(false);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('kc_lang', l);
    setStoreOverridden(false);
    setStoreLangState(l);
  }, []);

  const setStoreLang = useCallback((l: Lang) => {
    setStoreLangState(l);
    setStoreOverridden(l !== lang);
  }, [lang]);

  const t = useCallback((key: TranslationKey) => translate(key, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, storeLang, storeOverridden, setLang, setStoreLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
}
