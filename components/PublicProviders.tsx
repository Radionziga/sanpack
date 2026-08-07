'use client';

import type { Language, SiteSettings } from '@/types';
import { LanguageProvider } from '@/context/LanguageContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { RequestCartProvider } from '@/context/RequestCartContext';
import { ToastProvider } from '@/context/ToastContext';
import { SiteSettingsProvider } from '@/context/SiteSettingsContext';

export function PublicProviders({
  children,
  locale,
  settings,
}: {
  children: React.ReactNode;
  locale: Language;
  settings: SiteSettings;
}) {
  return (
    <SiteSettingsProvider settings={settings}>
      <LanguageProvider initialLanguage={locale}>
        <FavoritesProvider>
          <RequestCartProvider>
            <ToastProvider>{children}</ToastProvider>
          </RequestCartProvider>
        </FavoritesProvider>
      </LanguageProvider>
    </SiteSettingsProvider>
  );
}
