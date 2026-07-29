'use client';

import React, { createContext, useContext, useState } from 'react';
import { Language } from '@/types';
import { translations, TranslationKeys } from '@/lib/i18n/translations';
import { fixPrepositions } from '@/lib/utils/formatText';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys) => string;
  getLocalizedText: (ru?: string, uz?: string) => string;
  fixText: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'ru';
    try {
      const saved = localStorage.getItem('sanpack_language') as Language;
      return saved === 'ru' || saved === 'uz' ? saved : 'ru';
    } catch {
      return 'ru';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sanpack_language', lang);
    }
  };

  const t = (key: TranslationKeys): string => {
    const raw = translations[language][key] || translations['ru'][key] || key;
    return fixPrepositions(raw);
  };

  const getLocalizedText = (ru?: string, uz?: string): string => {
    if (language === 'uz' && uz) return fixPrepositions(uz);
    if (ru) return fixPrepositions(ru);
    return fixPrepositions(uz || '');
  };

  const fixText = (text: string): string => {
    return fixPrepositions(text);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getLocalizedText, fixText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
