import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProducts } from '@/lib/repositories/serverCatalogRepository';
import { routing } from '@/i18n/routing';
import type { Language } from '@/types';

function localized(
  locale: Language,
  ru: string,
  uz: string,
  en?: string
) {
  if (locale === 'uz') return uz || ru;
  if (locale === 'en') return en || ru;
  return ru;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; productSlug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, productSlug } = await params;
  const locale: Language = routing.locales.includes(rawLocale as Language)
    ? (rawLocale as Language)
    : 'ru';
  const product = (await getPublicProducts()).find(
    (candidate) => candidate.slug === productSlug && candidate.status === 'published'
  );
  if (!product) return {};

  const title = localized(
    locale,
    product.seo?.titleRu || product.titleRu,
    product.seo?.titleUz || product.titleUz,
    product.seo?.titleEn || product.titleEn
  );
  const description = localized(
    locale,
    product.seo?.descriptionRu || product.shortDescriptionRu,
    product.seo?.descriptionUz || product.shortDescriptionUz,
    product.seo?.descriptionEn || product.shortDescriptionEn
  );
  const pathname = `/product/${product.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${pathname}`,
      languages: Object.fromEntries(
        routing.locales.map((language) => [language, `/${language}${pathname}`])
      ),
    },
    openGraph: {
      type: 'website',
      title,
      description,
      images: product.mainImage ? [{ url: product.mainImage, alt: title }] : [],
    },
  };
}

export default async function ProductSeoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; productSlug: string }>;
}) {
  const { locale: rawLocale, productSlug } = await params;
  const locale: Language = routing.locales.includes(rawLocale as Language)
    ? (rawLocale as Language)
    : 'ru';
  const product = (await getPublicProducts()).find(
    (candidate) => candidate.slug === productSlug && candidate.status === 'published'
  );
  if (!product) notFound();

  const name = localized(locale, product.titleRu, product.titleUz, product.titleEn);
  const description = localized(
    locale,
    product.shortDescriptionRu,
    product.shortDescriptionUz,
    product.shortDescriptionEn
  );
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: product.images,
    sku: product.sku,
    brand: product.brandName
      ? {
          '@type': 'Brand',
          name: product.brandName,
        }
      : undefined,
    offers: product.showPrice && product.price
      ? {
          '@type': 'Offer',
          priceCurrency: product.currency === 'сум' ? 'UZS' : product.currency,
          price: product.price,
          availability:
            product.stockStatus === 'in_stock'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/PreOrder',
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      {children}
    </>
  );
}
