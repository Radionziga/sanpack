import 'server-only';

import type { TelegramPrivateSettings } from '@/types';
import { getAdminDb } from '@/lib/firebase/admin';

export const defaultTelegramSettings: TelegramPrivateSettings = {
  storefront: { enabled: false },
  notifications: { enabled: false },
};

export async function getTelegramPrivateSettings(): Promise<TelegramPrivateSettings> {
  const document = await getAdminDb().collection('privateSettings').doc('telegram').get();
  if (!document.exists) return defaultTelegramSettings;
  const stored = document.data() as Partial<TelegramPrivateSettings>;
  return {
    ...defaultTelegramSettings,
    ...stored,
    storefront: { ...defaultTelegramSettings.storefront, ...stored.storefront },
    notifications: { ...defaultTelegramSettings.notifications, ...stored.notifications },
  };
}

export function toPublicAdminTelegramSettings(settings: TelegramPrivateSettings) {
  return {
    storefront: {
      enabled: settings.storefront.enabled,
      botUsername: settings.storefront.botUsername || '',
      webAppUrl: settings.storefront.webAppUrl || '',
      tokenConfigured: Boolean(settings.storefront.tokenEncrypted),
      tokenLast4: settings.storefront.tokenLast4 || '',
    },
    notifications: {
      enabled: settings.notifications.enabled,
      chatId: settings.notifications.chatId || '',
      tokenConfigured: Boolean(settings.notifications.tokenEncrypted),
      tokenLast4: settings.notifications.tokenLast4 || '',
    },
  };
}

