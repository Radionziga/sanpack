import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getCategoryPath, getVisibleCategories } from '@/lib/catalog/categoryHierarchy';
import {
  getPublicCategories,
  getPublicProducts,
  getPublicSettings,
} from '@/lib/repositories/serverCatalogRepository';
import { logError } from '@/lib/observability/logger';
import { isProductSeoIndexable, safeSitemapLastModified } from '@/lib/seo/policy';
import { localeAlternates, siteBaseUrl } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

const staticRoutes = [
  '',
  '/catalog',
  '/about',
  '/clients',
  '/delivery',
  '/branding',
  '/bag-designer',
  '/contacts',
  '/privacy',
  '/terms',
  '/links',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteBaseUrl();
  const [products, categories, settings] = await Promise.all([
    getPublicProducts().catch((error) => {
      logError('sitemap.products_failed', error);
      return [];
    }),
    getPublicCategories().catch((error) => {
      logError('sitemap.categories_failed', error);
      return [];
    }),
    getPublicSettings().catch((error) => {
      logError('sitemap.settings_failed', error);
      return null;
    }),
  ]);
  const visibleStaticRoutes = staticRoutes.filter((route) => route !== '/links' || settings?.linkHub?.enabled);
  const localizedStatic = routing.locales.flatMap((locale) =>
    visibleStaticRoutes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route === '/catalog' ? 0.9 : 0.6,
      alternates: { languages: localeAlternates(route) },
    }))
  );
  const localizedCategories = routing.locales.flatMap((locale) =>
    getVisibleCategories(categories)
      .map((category) => ({
        url: `${baseUrl}/${locale}${getCategoryPath(category, categories)}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        alternates: {
          languages: localeAlternates(getCategoryPath(category, categories)),
        },
      }))
  );
  const localizedProducts = routing.locales.flatMap((locale) =>
    products
      .filter((product) => isProductSeoIndexable(product, categories))
      .map((product) => ({
        url: `${baseUrl}/${locale}/product/${product.slug}`,
        lastModified: safeSitemapLastModified(product.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: {
          languages: localeAlternates(`/product/${product.slug}`),
        },
      }))
  );

  return [...localizedStatic, ...localizedCategories, ...localizedProducts];
}
