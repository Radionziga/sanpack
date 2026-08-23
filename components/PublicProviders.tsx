'use client';

import type { Language, Product, SiteSettings } from '@/types';
import { LanguageProvider } from '@/context/LanguageContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { RequestCartProvider } from '@/context/RequestCartContext';
import { ToastProvider } from '@/context/ToastContext';
import { SiteSettingsProvider } from '@/context/SiteSettingsContext';
import { MobileStorefrontChrome } from '@/components/layout/MobileStorefrontChrome';

export function PublicProviders({
  children,
  locale,
  settings,
  initialProducts,
}: {
  children: React.ReactNode;
  locale: Language;
  settings: SiteSettings;
  initialProducts: Product[];
}) {
  return (
    <SiteSettingsProvider settings={settings}>
      <LanguageProvider initialLanguage={locale}>
        <FavoritesProvider>
          <RequestCartProvider>
            <ToastProvider>
              <MobileStorefrontChrome
                initialProducts={initialProducts}
              >
                {children}
              </MobileStorefrontChrome>
            </ToastProvider>
          </RequestCartProvider>
        </FavoritesProvider>
      </LanguageProvider>
    </SiteSettingsProvider>
  );
}
