import { getPublicCategories } from '@/lib/repositories/serverCatalogRepository';
import { getCategoryMetadata } from '@/lib/catalog/categoryMetadata';
import type { Language } from '@/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: Language; categorySlug: string }> }) {
  const { locale, categorySlug } = await params;
  return getCategoryMetadata([categorySlug], locale, await getPublicCategories());
}

export default function CategorySeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
