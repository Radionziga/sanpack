import 'server-only';

import type { GeminiPrivateSettings } from '@/types';
import { getAdminDb } from '@/lib/firebase/admin';

export const defaultGeminiSettings: GeminiPrivateSettings = {
  enabled: false,
  model: 'gemini-3.5-flash-lite',
  imageModel: 'gemini-3.1-flash-image',
};

export async function getGeminiPrivateSettings(): Promise<GeminiPrivateSettings> {
  const document = await getAdminDb().collection('privateSettings').doc('gemini').get();
  if (!document.exists) return defaultGeminiSettings;
  return { ...defaultGeminiSettings, ...(document.data() as Partial<GeminiPrivateSettings>) };
}

export function toPublicAdminGeminiSettings(settings: GeminiPrivateSettings) {
  return {
    enabled: settings.enabled,
    model: settings.model,
    imageModel: settings.imageModel || defaultGeminiSettings.imageModel,
    apiKeyConfigured: Boolean(settings.apiKeyEncrypted),
    apiKeyLast4: settings.apiKeyLast4 || '',
  };
}
