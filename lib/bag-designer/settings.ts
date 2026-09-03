import 'server-only';

import { getAdminDb } from '@/lib/firebase/admin';
import { logError } from '@/lib/observability/logger';
import { defaultBagDesignerSettings } from './defaults';
import type { BagDesignerSettings } from './types';

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Bag designer settings request timed out.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getBagDesignerSettings(
  options: { fallbackOnError?: boolean } = {},
): Promise<BagDesignerSettings> {
  if (process.env.SANPACK_USE_SEED_DATA === 'true') {
    return defaultBagDesignerSettings;
  }
  try {
    const request = getAdminDb().collection('moduleSettings').doc('bagDesigner').get();
    const snapshot = options.fallbackOnError
      ? await withTimeout(request, 2_000)
      : await request;
    if (!snapshot.exists) return defaultBagDesignerSettings;
    const stored = snapshot.data() as Partial<BagDesignerSettings>;
    return {
      ...defaultBagDesignerSettings,
      ...stored,
      sizePresets: stored.sizePresets?.length ? stored.sizePresets : defaultBagDesignerSettings.sizePresets,
      colors: stored.colors?.length ? stored.colors : defaultBagDesignerSettings.colors,
    };
  } catch (error) {
    if (!options.fallbackOnError) throw error;
    logError('bag_designer.settings_fallback', error);
    return defaultBagDesignerSettings;
  }
}
