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
import { mergeSiteSettings } from '@/lib/settings/mergeSiteSettings';

function isSeedFallbackEnabled() {
  return process.env.SANPACK_USE_SEED_DATA === 'true';
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
  if (isSeedFallbackEnabled()) return fallback;

  try {
    const snapshot = await getAdminDb().collection(name).get();
    if (!snapshot.empty) {
      return snapshot.docs.map((document) =>
        serializeFirestoreData<T>({
          id: document.id,
          ...document.data(),
        })
      );
    }
    return fallback;
  } catch (error) {
    console.warn(`Using fallback seed data for ${name}.`, (error as Error)?.message || error);
    return fallback;
  }
}

export const getPublicProducts = unstable_cache(
  () => readCollection<Product>('products', initialProducts),
  ['public-products-v6-serialized-2026-08-16'],
  { revalidate: 300, tags: ['products'] }
);

export const getPublicCategories = unstable_cache(
  () => readCollection<Category>('categories', initialCategories),
  ['public-categories-v5-serialized-2026-08-16'],
  { revalidate: 1800, tags: ['categories'] }
);

export const getPublicAttributes = unstable_cache(
  () => readCollection<Attribute>('attributes', initialAttributes),
  ['public-attributes-v4-serialized-2026-08-16'],
  { revalidate: 1800, tags: ['attributes'] }
);

export const getPublicClients = unstable_cache(
  () => readCollection<ClientPartner>('clients', initialClients),
  ['public-clients-v3-serialized-2026-08-16'],
  { revalidate: 3600, tags: ['clients'] }
);

export const getPublicBanners = unstable_cache(
  () => readCollection<Banner>('banners', initialBanners),
  ['public-banners-v5-serialized-2026-08-16'],
  { revalidate: 900, tags: ['banners'] }
);

export const getPublicSettings = unstable_cache(
  async () => {
    if (isSeedFallbackEnabled()) return initialSiteSettings;

    try {
      const snapshot = await getAdminDb().collection('settings').doc('global').get();
      if (snapshot.exists) {
        return mergeSiteSettings(
          initialSiteSettings,
          serializeFirestoreData<Partial<SiteSettings>>(snapshot.data() as Partial<SiteSettings>)
        );
      }
    } catch (error) {
      console.warn('Using fallback seed settings.', (error as Error)?.message || error);
    }
    return initialSiteSettings;
  },
  ['public-settings-v3-serialized-2026-08-16'],
  { revalidate: 1800, tags: ['settings'] }
);
