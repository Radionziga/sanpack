import type { Metadata } from 'next';
import type { Category, Language } from '@/types';
import { routing } from '@/i18n/routing';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { resolveCategoryRoute } from './categoryHierarchy';

export function getCategoryMetadata(segments: string[], locale: Language, categories: Category[]): Metadata {
  const resolved = resolveCategoryRoute(segments, categories);
  if (!resolved) return { robots: { index: false, follow: false } };
  const { category, path } = resolved;
  const title = resolveLocalizedText(locale, {
    ru: category.seo?.titleRu || category.titleRu, uz: category.seo?.titleUz || category.titleUz,
    en: category.seo?.titleEn || category.titleEn, zh: category.seo?.titleZh || category.titleZh,
  }).text;
  const description = resolveLocalizedText(locale, {
    ru: category.seo?.descriptionRu || category.descriptionRu, uz: category.seo?.descriptionUz || category.descriptionUz,
    en: category.seo?.descriptionEn || category.descriptionEn, zh: category.seo?.descriptionZh || category.descriptionZh,
  }).text;
  return {
    title, description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries([
        ...routing.locales.map((language) => [language, `/${language}${path}`]), ['x-default', `/ru${path}`],
      ]),
    },
  };
}
