'use client';

import { useSyncExternalStore } from 'react';
import Script from 'next/script';
import type { ExternalAnalyticsSettings } from '@/types';
import {
  canUseExternalAnalytics,
  normalizeExternalAnalyticsSettings,
} from '@/lib/analytics/external';

export function ExternalAnalyticsScripts({ settings }: { settings: ExternalAnalyticsSettings | undefined }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const normalized = normalizeExternalAnalyticsSettings(settings);
  // Provider scripts never load on localhost, in automated browsers, after
  // opt-out, with DNT/GPC, or outside the canonical production host.
  if (!mounted || !canUseExternalAnalytics()) return null;
  return (
    <>
      {normalized.googleAnalytics.enabled ? (
        <Script
          id="sanpack-google-analytics"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(normalized.googleAnalytics.measurementId)}`}
          strategy="afterInteractive"
        />
      ) : null}
      {normalized.yandexMetrica.enabled ? (
        <Script
          id="sanpack-yandex-metrica"
          src="https://mc.yandex.ru/metrika/tag.js"
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
