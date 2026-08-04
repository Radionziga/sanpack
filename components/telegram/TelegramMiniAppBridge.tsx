'use client';

import { useEffect } from 'react';

export function TelegramMiniAppBridge() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;
    webApp.ready();
    webApp.expand();
  }, []);

  return null;
}
