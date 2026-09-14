'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { Language } from '@/types';
import { trackAnalytics } from '@/lib/analytics/client';
import type { ExternalAnalyticsSettings } from '@/types';
import { configureExternalAnalytics } from '@/lib/analytics/external';
import { ExternalAnalyticsScripts } from '@/components/analytics/ExternalAnalyticsScripts';

export function AnalyticsProvider({ locale, externalAnalytics, children }: { locale: Language; externalAnalytics?: ExternalAnalyticsSettings; children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPath = useRef('');
  useLayoutEffect(() => {
    configureExternalAnalytics(externalAnalytics);
  }, [externalAnalytics]);
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname === lastPath.current) return;
    lastPath.current = pathname;
    trackAnalytics(locale, { name: 'page_view', pathname });
    if (/\/(?:ru|uz|en|zh)\/catalog(?:\/|$)/.test(pathname)) trackAnalytics(locale, { name: 'catalog_view', pathname });
  }, [locale, pathname]);
  return <><ExternalAnalyticsScripts settings={externalAnalytics} />{children}</>;
}
