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
import { filterPublicProducts } from '@/lib/catalog/publicProducts';
import { withGeneratedProductImage } from '@/lib/catalog/productImages';
import { getSeedProductTranslation, localizeSeedVariantLabel } from '@/lib/catalog/seedProductLocalization';
import {
  assertPublicDataReadAllowed,
  loadPublicData,
} from '@/lib/catalog/publicDataSource';
import { mergeSiteSettings } from '@/lib/settings/mergeSiteSettings';

function isSeedFallbackEnabled() {
  return process.env.SANPACK_USE_SEED_DATA === 'true';
}

function optimizedLocalAsset(value?: string) {
  if (!value) return value;
  return /^\/(?:catalog\/categories|promo)\/.+\.png$/i.test(value)
    ? value.replace(/\.png$/i, '.webp')
    : value;
}

function withOptimizedProductAssets(product: Product): Product {
  return {
    ...product,
    mainImage: optimizedLocalAsset(product.mainImage) || product.mainImage,
    images: product.images.map((image) => optimizedLocalAsset(image) || image),
  };
}

function withOptimizedCategoryAssets(category: Category): Category {
  return {
    ...category,
    image: optimizedLocalAsset(category.image),
    navigationImage: optimizedLocalAsset(category.navigationImage),
    cardImage: optimizedLocalAsset(category.cardImage),
    banner: optimizedLocalAsset(category.banner),
  };
}

function assertPublicReadAllowed(resource: string) {
  assertPublicDataReadAllowed({
    resource,
    seedEnabled: isSeedFallbackEnabled(),
    phase: process.env.NEXT_PHASE,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  });
}

function withSeedChineseLocalization(product: Product): Product {
  if (product.titleZh?.trim()) return product;
  const code = product.sku?.replace(/^SP-/i, '');
  const translation = code ? getSeedProductTranslation(code) : undefined;
  if (!translation?.zh) return product;
  return {
    ...product,
    titleZh: translation.zh,
    shortDescriptionZh: product.shortDescriptionZh || `${translation.zh}。价格按所示销售单位计算。`,
    descriptionZh: product.descriptionZh || '此商品来自 SANPACK 当前价格目录。库存和配送条件请向经理确认。',
    variants: product.variants?.map((variant) => ({
      ...variant,
      titleZh: variant.titleZh || localizeSeedVariantLabel(variant.titleEn || variant.titleRu, 'zh'),
    })),
  };
}

function withSeedBannerChineseLocalization(banner: Banner): Banner {
  const seed = initialBanners.find((candidate) => candidate.id === banner.id);
  const optimized = {
    ...banner,
    imageDesktop: optimizedLocalAsset(banner.imageDesktop) || banner.imageDesktop,
    imageMobile: optimizedLocalAsset(banner.imageMobile) || banner.imageMobile,
  };
  if (!seed) return optimized;
  return {
    ...optimized,
    titleZh: banner.titleZh?.trim() || seed.titleZh,
    subtitleZh: banner.subtitleZh?.trim() || seed.subtitleZh,
    buttonTextZh: banner.buttonTextZh?.trim() || seed.buttonTextZh,
  };
}

type FirestoreRestValue = {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  geoPointValue?: { latitude: number; longitude: number };
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
};

type FirestoreRestDocument = {
  name: string;
  fields?: Record<string, FirestoreRestValue>;
};

function decodeFirestoreRestValue(value: FirestoreRestValue): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) {
    return (value.arrayValue?.values || []).map(decodeFirestoreRestValue);
  }
  if ('mapValue' in value) {
    return decodeFirestoreRestFields(value.mapValue?.fields || {});
  }
  return undefined;
}

function decodeFirestoreRestFields(fields: Record<string, FirestoreRestValue>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreRestValue(value)])
  );
}

function getPublicFirestoreRestUrl(pathname: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) {
    throw new Error('Firebase public project configuration is incomplete.');
  }

  const root = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  return `${root}/${pathname}${pathname.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
}

async function fetchPublicFirestoreJson<T>(pathname: string): Promise<T> {
  const response = await fetch(getPublicFirestoreRestUrl(pathname), {
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Firestore public read failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

async function readPublicCollection<T>(name: string): Promise<T[]> {
  const result: T[] = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({ pageSize: '300' });
    if (pageToken) params.set('pageToken', pageToken);
    const payload = await fetchPublicFirestoreJson<{
      documents?: FirestoreRestDocument[];
      nextPageToken?: string;
    }>(`${encodeURIComponent(name)}?${params.toString()}`);

    for (const document of payload.documents || []) {
      result.push({
        id: document.name.split('/').at(-1) || '',
        ...decodeFirestoreRestFields(document.fields || {}),
      } as T);
    }
    pageToken = payload.nextPageToken || '';
  } while (pageToken);

  return result;
}

async function readPublicDocument<T>(path: string): Promise<T | null> {
  const response = await fetch(getPublicFirestoreRestUrl(path), {
    next: { revalidate: 300 },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore public read failed with status ${response.status}.`);
  }
  const document = await response.json() as FirestoreRestDocument;
  return decodeFirestoreRestFields(document.fields || {}) as T;
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
    load: () => readPublicCollection<T>(name),
  });
}

const getCachedPublicProducts = unstable_cache(
  async () => filterPublicProducts(
    await readCollection<Product>('products', initialProducts)
  ).map(withSeedChineseLocalization).map(withGeneratedProductImage).map(withOptimizedProductAssets),
  ['public-products-v12-local-webp-2026-08-27'],
  { revalidate: 300, tags: ['products'] }
);

export async function getPublicProducts() {
  assertPublicReadAllowed('products');
  return getCachedPublicProducts();
}

const getCachedPublicCategories = unstable_cache(
  async () => (await readCollection<Category>('categories', initialCategories)).map(withOptimizedCategoryAssets),
  ['public-categories-v7-local-webp-2026-08-27'],
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
  async () => (await readCollection<Banner>('banners', initialBanners))
    .map(withSeedBannerChineseLocalization),
  ['public-banners-v8-local-webp-2026-08-27'],
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
      const settings = await readPublicDocument<Partial<SiteSettings>>('settings/global');
      if (settings) {
        return mergeSiteSettings(
          initialSiteSettings,
          serializeFirestoreData<Partial<SiteSettings>>(settings)
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
