import { CategoryRoutePage } from '@/components/catalog/CategoryRoutePage';
import { getCategoryMetadata } from '@/lib/catalog/categoryMetadata';
import { getPublicCategories } from '@/lib/repositories/serverCatalogRepository';
import type { Language } from '@/types';

type Props = { params: Promise<{ locale: Language; categorySlug: string; subcategorySlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, categorySlug, subcategorySlug } = await params;
  return getCategoryMetadata([categorySlug, subcategorySlug], locale, await getPublicCategories());
}

export default async function SubcategoryPage({ params }: Props) {
  const { locale, categorySlug, subcategorySlug } = await params;
  return <CategoryRoutePage locale={locale} segments={[categorySlug, subcategorySlug]} />;
}
