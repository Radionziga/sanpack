import {
  getPublicProducts,
  getPublicCategories,
  getPublicSettings,
  getPublicClients,
} from '@/lib/repositories/serverCatalogRepository';
import { CatalogPrintDocument } from '@/components/catalog/CatalogPrintDocument';
import type { Language } from '@/types';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CatalogPrintPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const locale = (resolvedParams.locale || 'ru') as Language;
  const withPrices = resolvedSearchParams.prices !== '0';
  const selectedCategory = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : '';
  const langParam = (
    typeof resolvedSearchParams.lang === 'string' && ['ru', 'uz', 'en'].includes(resolvedSearchParams.lang)
      ? resolvedSearchParams.lang
      : locale
  ) as Language;

  const densityParam = Number(resolvedSearchParams.density);
  const density = (densityParam === 4 || densityParam === 8 ? densityParam : 6) as 4 | 6 | 8;

  const [products, categories, settings, clients] = await Promise.all([
    getPublicProducts(),
    getPublicCategories(),
    getPublicSettings(),
    getPublicClients(),
  ]);

  return (
    <CatalogPrintDocument
      initialProducts={products}
      initialCategories={categories}
      settings={settings}
      clients={clients}
      initialOptions={{
        withPrices,
        language: langParam,
        categoryId: selectedCategory,
        density,
      }}
    />
  );
}
