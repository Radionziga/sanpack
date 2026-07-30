'use client';

import type { Language } from '@/types';
import { LanguageProvider } from '@/context/LanguageContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { RequestCartProvider } from '@/context/RequestCartContext';
import { ToastProvider } from '@/context/ToastContext';

export function PublicProviders({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Language;
}) {
  return (
    <LanguageProvider initialLanguage={locale}>
      <FavoritesProvider>
        <RequestCartProvider>
          <ToastProvider>{children}</ToastProvider>
        </RequestCartProvider>
      </FavoritesProvider>
    </LanguageProvider>
  );
}
