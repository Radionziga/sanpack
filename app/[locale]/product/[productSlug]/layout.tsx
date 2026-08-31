import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProducts } from '@/lib/repositories/serverCatalogRepository';
import { routing } from '@/i18n/routing';
import type { Language } from '@/types';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { getMinimumSalePrice } from '@/lib/commerce/productOffer';

function localized(
  locale: Language,
  ru: string,
  uz: string,
  en?: string,
  zh?: string,
) {
  return resolveLocalizedText(locale, { ru, uz, en, zh }).text;
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
    product.seo?.titleEn || product.titleEn,
    product.seo?.titleZh || product.titleZh,
  );
  const description = localized(
    locale,
    product.seo?.descriptionRu || product.shortDescriptionRu,
    product.seo?.descriptionUz || product.shortDescriptionUz,
    product.seo?.descriptionEn || product.shortDescriptionEn,
    product.seo?.descriptionZh || product.shortDescriptionZh,
  );
  const pathname = `/product/${product.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${pathname}`,
      languages: Object.fromEntries(
        [
          ...routing.locales.map((language) => [language, `/${language}${pathname}`]),
          ['x-default', `/ru${pathname}`],
        ]
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

  const name = localized(locale, product.titleRu, product.titleUz, product.titleEn, product.titleZh);
  const description = localized(
    locale,
    product.shortDescriptionRu,
    product.shortDescriptionUz,
    product.shortDescriptionEn,
    product.shortDescriptionZh,
  );
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const productUrl = `${baseUrl}/${locale}/product/${product.slug}`;
  const availability = product.stockStatus === 'in_stock'
    ? 'https://schema.org/InStock'
    : product.stockStatus === 'out_of_stock'
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/PreOrder';
  const minimumSalePrice = getMinimumSalePrice(product);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: product.images,
    sku: product.sku,
    url: productUrl,
    brand: product.brandName
      ? {
          '@type': 'Brand',
          name: product.brandName,
        }
      : undefined,
    offers: minimumSalePrice
      ? {
          '@type': 'Offer',
          priceCurrency: product.currency === 'сум' ? 'UZS' : product.currency,
          price: minimumSalePrice.amount,
          availability,
          url: productUrl,
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
