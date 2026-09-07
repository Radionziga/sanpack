import { getPublicCategories, getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import { getCategoryMetadata } from '@/lib/catalog/categoryMetadata';
import type { Language } from '@/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: Language; categorySlug: string }> }) {
  const { locale, categorySlug } = await params;
  const [categories, settings] = await Promise.all([getPublicCategories(), getPublicSettings()]);
  return getCategoryMetadata([categorySlug], locale, categories, settings);
}

export default function CategorySeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
