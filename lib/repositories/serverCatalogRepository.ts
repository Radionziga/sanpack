import 'server-only';

import { unstable_cache } from 'next/cache';
import type {
  Attribute,
  Banner,
  Category,
  ClientPartner,
  Product,
  SiteSettings,
} from '@/types';
import {
  initialAttributes,
  initialBanners,
  initialCategories,
  initialClients,
  initialProducts,
  initialSiteSettings,
} from '@/lib/seedData';
import { getAdminDb } from '@/lib/firebase/admin';
import { filterPublicProducts } from '@/lib/catalog/publicProducts';
import { loadPublicData } from '@/lib/catalog/publicDataSource';
import { mergeSiteSettings } from '@/lib/settings/mergeSiteSettings';

function isSeedFallbackEnabled() {
  return process.env.SANPACK_USE_SEED_DATA === 'true';
}

function getPublicAdminDb() {
  const isCredentiallessBuild = process.env.NEXT_PHASE === 'phase-production-build'
    && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (isCredentiallessBuild) {
    throw new Error('Remote public data reads are disabled for a credentialless production build.');
  }
  return getAdminDb();
}

function serializeFirestoreData<T>(value: unknown): T {
  if (value === null || value === undefined) {
    return value as T;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString() as unknown as T;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    '_seconds' in value &&
    typeof (value as { _seconds: unknown })._seconds === 'number'
  ) {
    const seconds = (value as { _seconds: number; _nanoseconds?: number })._seconds;
    return new Date(seconds * 1000).toISOString() as unknown as T;
  }
  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreData(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = serializeFirestoreData(val);
    }
    return result as T;
  }
  return value as T;
}

async function readCollection<T>(name: string, fallback: T[]): Promise<T[]> {
  return loadPublicData({
    resource: name,
    seedEnabled: isSeedFallbackEnabled(),
    seed: fallback,
    load: async () => {
      const snapshot = await getPublicAdminDb().collection(name).get();
      return snapshot.docs.map((document) =>
        serializeFirestoreData<T>({
          id: document.id,
          ...document.data(),
        })
      );
    },
  });
}

export const getPublicProducts = unstable_cache(
  async () => filterPublicProducts(
    await readCollection<Product>('products', initialProducts)
  ),
  ['public-products-v8-fail-honest-2026-08-22'],
  { revalidate: 300, tags: ['products'] }
);

export const getPublicCategories = unstable_cache(
  () => readCollection<Category>('categories', initialCategories),
  ['public-categories-v6-fail-honest-2026-08-22'],
  { revalidate: 1800, tags: ['categories'] }
);

export const getPublicAttributes = unstable_cache(
  () => readCollection<Attribute>('attributes', initialAttributes),
  ['public-attributes-v5-fail-honest-2026-08-22'],
  { revalidate: 1800, tags: ['attributes'] }
);

export const getPublicClients = unstable_cache(
  () => readCollection<ClientPartner>('clients', initialClients),
  ['public-clients-v4-fail-honest-2026-08-22'],
  { revalidate: 3600, tags: ['clients'] }
);

export const getPublicBanners = unstable_cache(
  () => readCollection<Banner>('banners', initialBanners),
  ['public-banners-v6-fail-honest-2026-08-22'],
  { revalidate: 900, tags: ['banners'] }
);

export const getPublicSettings = unstable_cache(
  () => loadPublicData({
    resource: 'settings',
    seedEnabled: isSeedFallbackEnabled(),
    seed: initialSiteSettings,
    load: async () => {
      const snapshot = await getPublicAdminDb().collection('settings').doc('global').get();
      if (snapshot.exists) {
        return mergeSiteSettings(
          initialSiteSettings,
          serializeFirestoreData<Partial<SiteSettings>>(snapshot.data() as Partial<SiteSettings>)
        );
      }
      throw new Error('The global settings document does not exist.');
    },
  }),
  ['public-settings-v4-fail-honest-2026-08-22'],
  { revalidate: 1800, tags: ['settings'] }
);
