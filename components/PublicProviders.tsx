'use client';

import type { Language, SiteSettings } from '@/types';
import { LanguageProvider } from '@/context/LanguageContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { RequestCartProvider } from '@/context/RequestCartContext';
import { ToastProvider } from '@/context/ToastContext';
import { SiteSettingsProvider } from '@/context/SiteSettingsContext';
import { MobileStorefrontChrome } from '@/components/layout/MobileStorefrontChrome';
import { FloatingContactMenu } from '@/components/layout/FloatingContactMenu';

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
            <ToastProvider>
              <MobileStorefrontChrome>
                {children}
              </MobileStorefrontChrome>
              <FloatingContactMenu />
            </ToastProvider>
          </RequestCartProvider>
        </FavoritesProvider>
      </LanguageProvider>
    </SiteSettingsProvider>
  );
}
