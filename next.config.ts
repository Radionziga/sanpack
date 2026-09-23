import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholders.
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 86, 88],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      ...[
        '/catalog/generated-products/:path*',
        '/catalog/category-icons-v3/:path*',
        '/catalog/popular-categories/:path*',
        '/catalog/categories/:path*',
        '/promo/:path*',
      ].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }],
      })),
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
      {
        source: '/:locale(ru|uz|en|zh)/:page(request|orders|profile|search|favorites)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/:locale(ru|uz|en|zh)/catalog/print',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  output: 'standalone',
  outputFileTracingExcludes: {
    '/*': ['./.agents/**/*', './playwright-report/**/*', './test-results/**/*'],
  },
  async redirects() {
    return [
      {
        source: '/:locale(ru|uz|en|zh)/catalog/branding-polygraphy',
        destination: '/:locale/branding',
        permanent: true,
      },
      {
        source: '/catalog/branding-polygraphy',
        destination: '/ru/branding',
        permanent: true,
      },
      {
        source: '/:locale(ru|uz|en|zh)/catalog/svezhaya-zelen-novagreen',
        destination: '/:locale/catalog/ovoshchi-frukty-zelen/svezhaya-zelen',
        permanent: true,
      },
      {
        source: '/catalog/svezhaya-zelen-novagreen',
        destination: '/ru/catalog/ovoshchi-frukty-zelen/svezhaya-zelen',
        permanent: true,
      },
    ];
  },
  transpilePackages: ['motion'],
  turbopack: {
    root: process.cwd(),
  },
};

export default withNextIntl(nextConfig);
