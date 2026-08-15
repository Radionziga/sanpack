'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

export function TelegramMiniAppBridge() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    try {
      webApp.ready();
      webApp.expand();

      // Check if user is at root home page
      const isHome = pathname === '/' || pathname === '';

      if (!isHome && webApp.BackButton) {
        webApp.BackButton.show();
        const handleBack = () => {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();
          } else {
            router.push('/');
          }
        };
        webApp.BackButton.onClick(handleBack);
        return () => {
          webApp.BackButton?.offClick(handleBack);
        };
      } else if (webApp.BackButton) {
        webApp.BackButton.hide();
      }
    } catch (err) {
      console.warn('Telegram WebApp BackButton init error:', err);
    }
  }, [pathname, router]);

  return null;
}
