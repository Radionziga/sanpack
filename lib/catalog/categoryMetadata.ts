import type { Metadata } from 'next';
import type { Category, Language, SiteSettings } from '@/types';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { resolveCategoryRoute } from './categoryHierarchy';

export function getCategoryMetadata(segments: string[], locale: Language, categories: Category[], settings: SiteSettings): Metadata {
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
  const explicitTitle = locale === 'ru' ? category.seo?.titleRu
    : locale === 'uz' ? category.seo?.titleUz
      : locale === 'en' ? category.seo?.titleEn
        : category.seo?.titleZh;
  return buildSeoMetadata({
    locale, path, title, description, settings,
    image: category.cardImage || category.navigationImage || category.image,
    titleIsExplicit: Boolean(explicitTitle?.trim()),
  });
}
