import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicCategories, getPublicProducts, getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import { routing } from '@/i18n/routing';
import type { Language } from '@/types';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { buildBreadcrumbStructuredData } from '@/lib/seo/metadata';
import { buildProductStructuredData } from '@/lib/seo/productStructuredData';
import { buildProductMetadata, getEffectiveProductSeo } from '@/lib/seo/policy';
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
  const [products, categories, settings] = await Promise.all([
    getPublicProducts(), getPublicCategories(), getPublicSettings(),
  ]);
  const product = products.find(
    (candidate) => candidate.slug === productSlug && candidate.status === 'published'
  );
  if (!product) return {};

  return buildProductMetadata(product, locale, settings, categories);
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
  const [products, categories, settings] = await Promise.all([
    getPublicProducts(), getPublicCategories(), getPublicSettings(),
  ]);
  const product = products.find(
    (candidate) => candidate.slug === productSlug && candidate.status === 'published'
  );
  if (!product) notFound();

  const name = localized(locale, product.titleRu, product.titleUz, product.titleEn, product.titleZh);
  const effectiveSeo = getEffectiveProductSeo(product, locale, settings, categories);
  const visibleDescription = localized(
    locale,
    product.shortDescriptionRu || product.descriptionRu,
    product.shortDescriptionUz || product.descriptionUz,
    product.shortDescriptionEn || product.descriptionEn,
    product.shortDescriptionZh || product.descriptionZh,
  ) || effectiveSeo.description;
  const structuredData = buildProductStructuredData(product, {
    name,
    description: visibleDescription,
    url: effectiveSeo.absoluteCanonical,
  });
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
