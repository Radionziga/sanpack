import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getCategoryPath, getVisibleCategories } from '@/lib/catalog/categoryHierarchy';
import {
  getPublicCategories,
  getPublicProducts,
} from '@/lib/repositories/serverCatalogRepository';

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
];

function languageAlternates(baseUrl: string, path: string) {
  return Object.fromEntries([
    ...routing.locales.map((locale) => [locale, `${baseUrl}/${locale}${path}`]),
    ['x-default', `${baseUrl}/ru${path}`],
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const [products, categories] = await Promise.all([
    getPublicProducts().catch(() => []),
    getPublicCategories().catch(() => []),
  ]);
  const localizedStatic = routing.locales.flatMap((locale) =>
    staticRoutes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route === '/catalog' ? 0.9 : 0.6,
      alternates: { languages: languageAlternates(baseUrl, route) },
    }))
  );
  const localizedCategories = routing.locales.flatMap((locale) =>
    getVisibleCategories(categories)
      .map((category) => ({
        url: `${baseUrl}/${locale}${getCategoryPath(category, categories)}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        alternates: {
          languages: languageAlternates(baseUrl, getCategoryPath(category, categories)),
        },
      }))
  );
  const localizedProducts = routing.locales.flatMap((locale) =>
    products
      .filter((product) => product.status === 'published')
      .map((product) => ({
        url: `${baseUrl}/${locale}/product/${product.slug}`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: {
          languages: languageAlternates(baseUrl, `/product/${product.slug}`),
        },
      }))
  );

  return [...localizedStatic, ...localizedCategories, ...localizedProducts];
}
