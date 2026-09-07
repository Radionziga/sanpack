'use client';

import React, { createContext, useContext } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Language } from '@/types';
import { translations, TranslationKeys } from '@/lib/i18n/translations';
import { fixPrepositions } from '@/lib/utils/formatText';
import { getPathLanguage } from '@/lib/i18n/pathLocale';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { buildLocalizedPath } from '@/lib/i18n/localeNavigation';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys) => string;
  getLocalizedText: (ru?: string, uz?: string, en?: string, zh?: string) => string;
  fixText: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage: Language;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = getPathLanguage(pathname, initialLanguage);

  const setLanguage = (lang: Language) => {
    const query = searchParams.toString();
    const hash = typeof window === 'undefined' ? '' : window.location.hash;
    router.push(buildLocalizedPath(pathname, lang, query, hash));
  };

  const t = (key: TranslationKeys): string => {
    const dictionary = translations[language] as Partial<
      Record<TranslationKeys, string>
    >;
    const raw = dictionary[key] || translations.ru[key] || key;
    return fixPrepositions(raw);
  };

  const getLocalizedText = (ru?: string, uz?: string, en?: string, zh?: string): string => {
    return fixPrepositions(resolveLocalizedText(language, { ru, uz, en, zh }).text);
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
