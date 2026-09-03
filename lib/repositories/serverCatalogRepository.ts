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
import {
  projectPublicProducts, projectPublicCategories, projectPublicAttributes,
  projectPublicClients, projectPublicBanners, projectPublicSettings,
} from '@/lib/catalog/publicProjection';
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

// Existing repository, now trusted server reads. No user/admin cookie is needed
// for storefront reads. Rules deny direct browser access; projection below is
// the public BFF boundary. Keep SDK initialization lazy for credentialless builds.
async function readPublicCollection<T>(name: string): Promise<T[]> {
  const snapshot = await getAdminDb().collection(name).get();
  return snapshot.docs.map((document) => serializeFirestoreData<T>({
    ...document.data(), id: document.id,
  }));
}

async function readPublicDocument<T>(path: string): Promise<T | null> {
  const snapshot = await getAdminDb().doc(path).get();
  return snapshot.exists ? serializeFirestoreData<T>(snapshot.data()) : null;
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
  async () => projectPublicProducts(
    await readCollection<Product>('products', initialProducts)
  ).map(withSeedChineseLocalization).map(withGeneratedProductImage).map(withOptimizedProductAssets),
  ['trusted-projection-v1-products-v13-produce-request-pricing-2026-08-29', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'local', process.env.SANPACK_USE_SEED_DATA || 'false'],
  { revalidate: 300, tags: ['products'] }
);

export async function getPublicProducts() {
  assertPublicReadAllowed('products');
  return getCachedPublicProducts();
}

const getCachedPublicCategories = unstable_cache(
  async () => projectPublicCategories(await readCollection<Category>('categories', initialCategories)).map(withOptimizedCategoryAssets),
  ['trusted-projection-v1-categories-v7-local-webp-2026-08-27', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'local', process.env.SANPACK_USE_SEED_DATA || 'false'],
  { revalidate: 1800, tags: ['categories'] }
);

export async function getPublicCategories() {
  assertPublicReadAllowed('categories');
  return getCachedPublicCategories();
}

const getCachedPublicAttributes = unstable_cache(
  async () => projectPublicAttributes(await readCollection<Attribute>('attributes', initialAttributes)),
  ['trusted-projection-v1-attributes-v5-fail-honest-2026-08-22', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'local', process.env.SANPACK_USE_SEED_DATA || 'false'],
  { revalidate: 1800, tags: ['attributes'] }
);

export async function getPublicAttributes() {
  assertPublicReadAllowed('attributes');
  return getCachedPublicAttributes();
}

const getCachedPublicClients = unstable_cache(
  async () => projectPublicClients(await readCollection<ClientPartner>('clients', initialClients)),
  ['trusted-projection-v1-clients-v4-fail-honest-2026-08-22', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'local', process.env.SANPACK_USE_SEED_DATA || 'false'],
  { revalidate: 3600, tags: ['clients'] }
);

export async function getPublicClients() {
  assertPublicReadAllowed('clients');
  return getCachedPublicClients();
}

const getCachedPublicBanners = unstable_cache(
  async () => projectPublicBanners(await readCollection<Banner>('banners', initialBanners))
    .map(withSeedBannerChineseLocalization),
  ['trusted-projection-v1-banners-v8-local-webp-2026-08-27', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'local', process.env.SANPACK_USE_SEED_DATA || 'false'],
  { revalidate: 900, tags: ['banners'] }
);

export async function getPublicBanners() {
  assertPublicReadAllowed('banners');
  return getCachedPublicBanners();
}

const getCachedPublicSettings = unstable_cache(
  async () => projectPublicSettings(await loadPublicData({
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
  })),
  ['trusted-projection-v1-settings-v4-fail-honest-2026-08-22', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'local', process.env.SANPACK_USE_SEED_DATA || 'false'],
  { revalidate: 1800, tags: ['settings'] }
);

export async function getPublicSettings() {
  assertPublicReadAllowed('settings');
  return getCachedPublicSettings();
}
