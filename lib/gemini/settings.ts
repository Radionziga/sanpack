import 'server-only';

import type { GeminiPrivateSettings } from '@/types';
import { getAdminDb } from '@/lib/firebase/admin';

export const defaultGeminiSettings: GeminiPrivateSettings = {
  enabled: false,
  model: 'gemini-3.5-flash-lite',
  imageModel: 'gemini-3.1-flash-image',
};

function getGeminiSettingsDocumentId() {
  const configuredScope = process.env.GEMINI_SETTINGS_SCOPE?.trim();
  if (configuredScope) {
    const safeScope = configuredScope.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60);
    return safeScope === 'production' ? 'gemini' : `gemini-${safeScope}`;
  }

  // Development and production can share one Firebase project, but encrypted
  // values must never overwrite each other because their encryption keys differ.
  return process.env.NODE_ENV === 'production' ? 'gemini' : 'gemini-development';
}

function getGeminiSettingsDocument() {
  return getAdminDb().collection('privateSettings').doc(getGeminiSettingsDocumentId());
}

export async function getGeminiPrivateSettings(): Promise<GeminiPrivateSettings> {
  const document = await getGeminiSettingsDocument().get();
  if (!document.exists) return defaultGeminiSettings;
  return { ...defaultGeminiSettings, ...(document.data() as Partial<GeminiPrivateSettings>) };
}

export async function saveGeminiPrivateSettings(settings: GeminiPrivateSettings) {
  await getGeminiSettingsDocument().set(settings);
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
