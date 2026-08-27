import type { Metadata } from 'next';
import { getPublicCategories } from '@/lib/repositories/serverCatalogRepository';
import type { Language } from '@/types';
import { routing } from '@/i18n/routing';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, categorySlug } = await params;
  const locale: Language = routing.locales.includes(rawLocale as Language)
    ? (rawLocale as Language)
    : 'ru';
  const category = (await getPublicCategories()).find(
    (candidate) => candidate.slug === categorySlug && candidate.status === 'active'
  );
  if (!category) return {};

  const title = resolveLocalizedText(locale, {
    ru: category.seo?.titleRu || category.titleRu,
    uz: category.seo?.titleUz || category.titleUz,
    en: category.seo?.titleEn || category.titleEn,
    zh: category.seo?.titleZh || category.titleZh,
  }).text;
  const description = resolveLocalizedText(locale, {
    ru: category.seo?.descriptionRu || category.descriptionRu,
    uz: category.seo?.descriptionUz || category.descriptionUz,
    en: category.seo?.descriptionEn || category.descriptionEn,
    zh: category.seo?.descriptionZh || category.descriptionZh,
  }).text;
  const path = `/catalog/${category.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries([
        ...routing.locales.map((language) => [language, `/${language}${path}`]),
        ['x-default', `/ru${path}`],
      ]),
    },
  };
}

export default function CategorySeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
