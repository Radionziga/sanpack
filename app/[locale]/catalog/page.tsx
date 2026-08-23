import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CatalogListing } from '@/components/catalog/CatalogListing';
import {
  getPublicAttributes,
  getPublicCategories,
  getPublicProducts,
} from '@/lib/repositories/serverCatalogRepository';

export default async function CatalogPage() {
  const initialCatalog = await Promise.all([
    getPublicProducts(),
    getPublicCategories(),
    getPublicAttributes(),
  ]).then(([products, categories, attributes]) => ({ products, categories, attributes }))
    .catch((error) => {
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.error('Catalog could not be preloaded.', error);
      }
      return null;
    });
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />
      <CatalogListing
        {...(initialCatalog ? {
          initialProducts: initialCatalog.products,
          initialCategories: initialCatalog.categories,
          initialAttributes: initialCatalog.attributes,
        } : {})}
      />
      <Footer />
    </div>
  );
}
