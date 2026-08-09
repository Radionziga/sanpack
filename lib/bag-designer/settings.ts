import 'server-only';

import { getAdminDb } from '@/lib/firebase/admin';
import { defaultBagDesignerSettings } from './defaults';
import type { BagDesignerSettings } from './types';

export async function getBagDesignerSettings(): Promise<BagDesignerSettings> {
  const snapshot = await getAdminDb().collection('moduleSettings').doc('bagDesigner').get();
  if (!snapshot.exists) return defaultBagDesignerSettings;
  const stored = snapshot.data() as Partial<BagDesignerSettings>;
  return {
    ...defaultBagDesignerSettings,
    ...stored,
    sizePresets: stored.sizePresets?.length ? stored.sizePresets : defaultBagDesignerSettings.sizePresets,
    colors: stored.colors?.length ? stored.colors : defaultBagDesignerSettings.colors,
  };
}
