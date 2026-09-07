import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const utilityPaths = ['search', 'favorites', 'request', 'orders', 'profile'];
  const utilityDisallows = ['ru', 'uz', 'en', 'zh'].flatMap((locale) => [
    ...utilityPaths.map((path) => `/${locale}/${path}`),
    `/${locale}/catalog/print`,
  ]);

  return {
    rules: {
      userAgent: '*',
      allow: ['/ru/', '/uz/', '/en/', '/zh/'],
      disallow: ['/admin/', '/api/', ...utilityDisallows],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
