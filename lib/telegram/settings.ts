import 'server-only';

import type { TelegramPrivateSettings } from '@/types';
import { getAdminDb } from '@/lib/firebase/admin';

export const defaultTelegramSettings: TelegramPrivateSettings = {
  login: { enabled: false, requestPhone: false, allowBotMessages: false },
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
    login: { ...defaultTelegramSettings.login, ...stored.login },
    storefront: { ...defaultTelegramSettings.storefront, ...stored.storefront },
    notifications: { ...defaultTelegramSettings.notifications, ...stored.notifications },
  };
}

export function toPublicAdminTelegramSettings(settings: TelegramPrivateSettings) {
  return {
    login: {
      enabled: settings.login.enabled,
      clientId: settings.login.clientId || '',
      redirectUri: settings.login.redirectUri || '',
      requestPhone: Boolean(settings.login.requestPhone),
      allowBotMessages: Boolean(settings.login.allowBotMessages),
      clientSecretConfigured: Boolean(settings.login.clientSecretEncrypted),
      clientSecretLast4: settings.login.clientSecretLast4 || '',
    },
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
