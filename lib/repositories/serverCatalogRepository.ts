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
import {
  assertPublicDataReadAllowed,
  loadPublicData,
} from '@/lib/catalog/publicDataSource';
import { mergeSiteSettings } from '@/lib/settings/mergeSiteSettings';

function isSeedFallbackEnabled() {
  return process.env.SANPACK_USE_SEED_DATA === 'true';
}

function getPublicAdminDb() {
  return getAdminDb();
}

function assertPublicReadAllowed(resource: string) {
  assertPublicDataReadAllowed({
    resource,
    seedEnabled: isSeedFallbackEnabled(),
    phase: process.env.NEXT_PHASE,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  });
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

const getCachedPublicProducts = unstable_cache(
  async () => filterPublicProducts(
    await readCollection<Product>('products', initialProducts)
  ),
  ['public-products-v9-seed-images-2026-08-22'],
  { revalidate: 300, tags: ['products'] }
);

export async function getPublicProducts() {
  assertPublicReadAllowed('products');
  return getCachedPublicProducts();
}

const getCachedPublicCategories = unstable_cache(
  () => readCollection<Category>('categories', initialCategories),
  ['public-categories-v6-fail-honest-2026-08-22'],
  { revalidate: 1800, tags: ['categories'] }
);

export async function getPublicCategories() {
  assertPublicReadAllowed('categories');
  return getCachedPublicCategories();
}

const getCachedPublicAttributes = unstable_cache(
  () => readCollection<Attribute>('attributes', initialAttributes),
  ['public-attributes-v5-fail-honest-2026-08-22'],
  { revalidate: 1800, tags: ['attributes'] }
);

export async function getPublicAttributes() {
  assertPublicReadAllowed('attributes');
  return getCachedPublicAttributes();
}

const getCachedPublicClients = unstable_cache(
  () => readCollection<ClientPartner>('clients', initialClients),
  ['public-clients-v4-fail-honest-2026-08-22'],
  { revalidate: 3600, tags: ['clients'] }
);

export async function getPublicClients() {
  assertPublicReadAllowed('clients');
  return getCachedPublicClients();
}

const getCachedPublicBanners = unstable_cache(
  () => readCollection<Banner>('banners', initialBanners),
  ['public-banners-v6-fail-honest-2026-08-22'],
  { revalidate: 900, tags: ['banners'] }
);

export async function getPublicBanners() {
  assertPublicReadAllowed('banners');
  return getCachedPublicBanners();
}

const getCachedPublicSettings = unstable_cache(
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

export async function getPublicSettings() {
  assertPublicReadAllowed('settings');
  return getCachedPublicSettings();
}
