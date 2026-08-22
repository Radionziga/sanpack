import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CatalogHome } from '@/components/home/CatalogHome';
import {
  getPublicCategories,
  getPublicProducts,
  getPublicBanners,
} from '@/lib/repositories/serverCatalogRepository';
import type { Banner, Category, Language, Product } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Language }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let dataUnavailable = false;
  let products: Product[] = [];
  let categories: Category[] = [];
  let banners: Banner[] = [];

  try {
    [products, categories, banners] = await Promise.all([
      getPublicProducts(),
      getPublicCategories(),
      getPublicBanners(),
    ]);
  } catch (error) {
    dataUnavailable = true;
    console.error('Home catalog data could not be loaded.', error);
  }

  const publishedProducts = products
    .filter((product) => product.status === 'published')
    .sort((a, b) => b.sortOrder - a.sortOrder);
  const activeCategories = categories
    .filter((category) => category.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header
        initialCategories={activeCategories}
        initialProducts={publishedProducts}
      />
      <main className="flex-1">
        <CatalogHome
          products={publishedProducts}
          categories={activeCategories}
          banners={banners}
          locale={locale}
          catalogPdfUrl={process.env.NEXT_PUBLIC_CATALOG_PDF_URL}
          dataUnavailable={dataUnavailable}
        />
      </main>
      <Footer />
    </div>
  );
}
