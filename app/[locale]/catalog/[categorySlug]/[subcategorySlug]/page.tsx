import { CategoryRoutePage } from '@/components/catalog/CategoryRoutePage';
import { getCategoryMetadata } from '@/lib/catalog/categoryMetadata';
import { getPublicCategories, getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import type { Language } from '@/types';

type Props = { params: Promise<{ locale: Language; categorySlug: string; subcategorySlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, categorySlug, subcategorySlug } = await params;
  const [categories, settings] = await Promise.all([getPublicCategories(), getPublicSettings()]);
  return getCategoryMetadata([categorySlug, subcategorySlug], locale, categories, settings);
}

export default async function SubcategoryPage({ params }: Props) {
  const { locale, categorySlug, subcategorySlug } = await params;
  return <CategoryRoutePage locale={locale} segments={[categorySlug, subcategorySlug]} />;
}
