import { getPublicCategories, getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import { getCategoryMetadata } from '@/lib/catalog/categoryMetadata';
import { resolveCategoryRoute } from '@/lib/catalog/categoryHierarchy';
import type { Language } from '@/types';
import { notFound, permanentRedirect } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: Language; categorySlug: string }> }) {
  const { locale, categorySlug } = await params;
  const [categories, settings] = await Promise.all([getPublicCategories(), getPublicSettings()]);
  const resolved = resolveCategoryRoute([categorySlug], categories);
  if (!resolved) notFound();
  if (resolved.redirect) permanentRedirect(`/${locale}${resolved.path}`);
  return getCategoryMetadata([categorySlug], locale, categories, settings);
}

export default function CategorySeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
