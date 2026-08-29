import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CatalogHome } from '@/components/home/CatalogHome';
import {
  getPublicCategories,
  getPublicProducts,
  getPublicBanners,
  getPublicAttributes,
} from '@/lib/repositories/serverCatalogRepository';
import type { Attribute, Banner, Category, Language, Product } from '@/types';

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
  let attributes: Attribute[] = [];

  try {
    [products, categories, banners, attributes] = await Promise.all([
      getPublicProducts(),
      getPublicCategories(),
      getPublicBanners(),
      getPublicAttributes(),
    ]);
  } catch (error) {
    dataUnavailable = true;
    console.error('Home catalog data could not be loaded.', error);
  }

  const publishedProducts = products
    .filter((product) => product.status === 'published')
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.sortOrder - a.sortOrder);
  const activeCategories = categories
    .filter((category) => category.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryProductCounts = Object.fromEntries(activeCategories.map((category) => {
    const relatedCategories = [
      category,
      ...activeCategories.filter((candidate) => candidate.parentId === category.id),
    ];
    const childIds = new Set(relatedCategories.map((candidate) => candidate.id));
    const childSlugs = new Set(relatedCategories.map((candidate) => candidate.slug));
    return [category.id, publishedProducts.filter((product) => (
      childIds.has(product.categoryId)
      || childSlugs.has(product.categorySlug)
    )).length];
  }));
  const shelfCategories = activeCategories
    .filter((category) => category.parentId && categoryProductCounts[category.id] > 0)
    .slice(0, 10);
  const homeProductIds = new Set(shelfCategories.flatMap((category) => publishedProducts
    .filter((product) => product.categoryId === category.id || product.categorySlug === category.slug)
    .slice(0, 6)
    .map((product) => product.id)));
  const homeProducts = publishedProducts.filter((product) => homeProductIds.has(product.id));
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header
        initialCategories={activeCategories}
      />
      <main className="flex-1">
        <CatalogHome
          products={homeProducts}
          categories={activeCategories}
          categoryProductCounts={categoryProductCounts}
          banners={banners}
          attributes={attributes}
          locale={locale}
          catalogPdfUrl={process.env.NEXT_PUBLIC_CATALOG_PDF_URL}
          dataUnavailable={dataUnavailable}
        />
      </main>
      <Footer />
    </div>
  );
}
