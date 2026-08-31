import { CategoryRoutePage } from '@/components/catalog/CategoryRoutePage';

export default async function CategoryDetailPage({ params }: { params: Promise<{ locale: string; categorySlug: string }> }) {
  const { locale, categorySlug } = await params;
  return <CategoryRoutePage locale={locale} segments={[categorySlug]} />;
}
