import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicCategories, getPublicProducts, getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import { routing } from '@/i18n/routing';
import type { Language } from '@/types';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { getMinimumSalePrice } from '@/lib/commerce/productOffer';
import { buildBreadcrumbStructuredData, buildSeoMetadata } from '@/lib/seo/metadata';
import { getCategoryBreadcrumbs, resolveProductCategory } from '@/lib/catalog/categoryHierarchy';

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
  const [products, settings] = await Promise.all([getPublicProducts(), getPublicSettings()]);
  const product = products.find(
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

  const explicitTitle = locale === 'ru' ? product.seo?.titleRu
    : locale === 'uz' ? product.seo?.titleUz
      : locale === 'en' ? product.seo?.titleEn
        : product.seo?.titleZh;
  return buildSeoMetadata({ locale, path: pathname, title, description, settings, image: product.mainImage, titleIsExplicit: Boolean(explicitTitle?.trim()) });
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
  const [products, categories] = await Promise.all([getPublicProducts(), getPublicCategories()]);
  const product = products.find(
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
    image: [...new Set([product.mainImage, ...(product.images || [])].filter(Boolean))],
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
  const category = resolveProductCategory(product, categories);
  const breadcrumbData = buildBreadcrumbStructuredData([
    { name: localized(locale, 'Главная', 'Bosh sahifa', 'Home', '首页'), path: `/${locale}` },
    { name: localized(locale, 'Каталог', 'Katalog', 'Catalog', '目录'), path: `/${locale}/catalog` },
    ...(category ? getCategoryBreadcrumbs(category, categories).map(({ category: node, href }) => ({
      name: localized(locale, node.titleRu, node.titleUz, node.titleEn, node.titleZh),
      path: `/${locale}${href}`,
    })) : []),
    { name, path: `/${locale}/product/${product.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData).replace(/</g, '\\u003c') }}
      />
      {children}
    </>
  );
}
