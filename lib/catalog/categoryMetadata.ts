import type { Metadata } from 'next';
import type { Category, Language, SiteSettings } from '@/types';
import { buildCategoryMetadata } from '@/lib/seo/policy';
import { resolveCategoryRoute } from './categoryHierarchy';

export function getCategoryMetadata(segments: string[], locale: Language, categories: Category[], settings: SiteSettings): Metadata {
  const resolved = resolveCategoryRoute(segments, categories);
  if (!resolved) return { robots: { index: false, follow: false } };
  return buildCategoryMetadata(resolved.category, locale, settings, categories);
}
