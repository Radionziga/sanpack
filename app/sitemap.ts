import type { MetadataRoute } from 'next';
import { initialCategories, initialProducts } from '@/lib/seedData';
import { routing } from '@/i18n/routing';

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

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const localizedStatic = routing.locales.flatMap((locale) =>
    staticRoutes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route === '/catalog' ? 0.9 : 0.6,
    }))
  );
  const categories = routing.locales.flatMap((locale) =>
    initialCategories
      .filter((category) => category.status === 'active')
      .map((category) => ({
        url: `${baseUrl}/${locale}/catalog/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  );
  const products = routing.locales.flatMap((locale) =>
    initialProducts
      .filter((product) => product.status === 'published')
      .map((product) => ({
        url: `${baseUrl}/${locale}/product/${product.slug}`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
  );

  return [...localizedStatic, ...categories, ...products];
}
