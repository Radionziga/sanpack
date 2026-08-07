'use client';

import { createContext, useContext } from 'react';
import type { SiteSettings } from '@/types';

const SiteSettingsContext = createContext<SiteSettings | null>(null);

export function SiteSettingsProvider({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: SiteSettings;
}) {
  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const settings = useContext(SiteSettingsContext);
  if (!settings) {
    throw new Error('useSiteSettings must be used inside SiteSettingsProvider.');
  }
  return settings;
}
