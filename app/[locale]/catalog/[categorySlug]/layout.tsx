import type { Metadata } from 'next';
import { getPublicCategories } from '@/lib/repositories/serverCatalogRepository';
import type { Language } from '@/types';
import { routing } from '@/i18n/routing';

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

  const title =
    locale === 'uz'
      ? category.seo?.titleUz || category.titleUz
      : locale === 'en'
        ? category.seo?.titleEn || category.titleEn || category.titleRu
        : category.seo?.titleRu || category.titleRu;
  const description =
    locale === 'uz'
      ? category.seo?.descriptionUz || category.descriptionUz
      : locale === 'en'
        ? category.seo?.descriptionEn || category.descriptionEn || category.descriptionRu
        : category.seo?.descriptionRu || category.descriptionRu;
  const path = `/catalog/${category.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        ru: `/ru${path}`,
        uz: `/uz${path}`,
        en: `/en${path}`,
      },
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
