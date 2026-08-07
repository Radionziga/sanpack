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

async function readCollection<T>(name: string, fallback: T[]): Promise<T[]> {
  if (isSeedFallbackEnabled()) return fallback;

  try {
    const snapshot = await getAdminDb().collection(name).get();
    if (!snapshot.empty) {
      return snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as T[];
    }
    if (!isSeedFallbackEnabled()) return [];
  } catch (error) {
    if (!isSeedFallbackEnabled()) throw error;
    console.warn(`Using read-only seed data for ${name}.`, error);
  }
  return fallback;
}

export const getPublicProducts = unstable_cache(
  () => readCollection<Product>('products', initialProducts),
  ['public-products-v1'],
  { revalidate: 300, tags: ['products'] }
);

export const getPublicCategories = unstable_cache(
  () => readCollection<Category>('categories', initialCategories),
  ['public-categories-v1'],
  { revalidate: 1800, tags: ['categories'] }
);

export const getPublicAttributes = unstable_cache(
  () => readCollection<Attribute>('attributes', initialAttributes),
  ['public-attributes-v1'],
  { revalidate: 1800, tags: ['attributes'] }
);

export const getPublicClients = unstable_cache(
  () => readCollection<ClientPartner>('clients', initialClients),
  ['public-clients-v1'],
  { revalidate: 3600, tags: ['clients'] }
);

export const getPublicBanners = unstable_cache(
  () => readCollection<Banner>('banners', initialBanners),
  ['public-banners-cta-v2'],
  { revalidate: 900, tags: ['banners'] }
);

export const getPublicSettings = unstable_cache(
  async () => {
    if (isSeedFallbackEnabled()) return initialSiteSettings;

    try {
      const snapshot = await getAdminDb().collection('settings').doc('global').get();
      if (snapshot.exists) {
        return mergeSiteSettings(initialSiteSettings, snapshot.data() as Partial<SiteSettings>);
      }
    } catch (error) {
      if (!isSeedFallbackEnabled()) throw error;
      console.warn('Using read-only seed settings.', error);
    }
    return initialSiteSettings;
  },
  ['public-settings-v1'],
  { revalidate: 1800, tags: ['settings'] }
);
