'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { Language } from '@/types';
import { trackAnalytics } from '@/lib/analytics/client';

export function AnalyticsProvider({ locale, children }: { locale: Language; children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPath = useRef('');
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname === lastPath.current) return;
    lastPath.current = pathname;
    trackAnalytics(locale, { name: 'page_view', pathname });
    if (/\/(?:ru|uz|en|zh)\/catalog(?:\/|$)/.test(pathname)) trackAnalytics(locale, { name: 'catalog_view', pathname });
  }, [locale, pathname]);
  return children;
}
