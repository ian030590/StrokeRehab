import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { zh } from './zh';
import type { ReactNode } from 'react';
import type { TranslationKey } from './zh';
import { en } from './en';

type Language = 'zh' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'stroke_trainer_language';
const LEGACY_LANGUAGE_KEY = 'vision_trainer_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY) ?? localStorage.getItem(LEGACY_LANGUAGE_KEY);
    return (saved === 'en' || saved === 'zh') ? saved : 'zh';
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  }, [lang]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(LANGUAGE_KEY, newLang);
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const dictionary = lang === 'en' ? en : zh;
    let text = dictionary[key];

    // Fallback to key if not found
    if (!text) return key;

    // Replace parameters if provided e.g., {name} -> 'John'
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
      });
    }

    return text;
  }, [lang]);

  const contextValue = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useT = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useT must be used within a LanguageProvider');
  }
  return context;
};
