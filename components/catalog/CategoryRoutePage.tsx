import { notFound, permanentRedirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CatalogListing } from '@/components/catalog/CatalogListing';
import { getPublicAttributes, getPublicCategories, getPublicProducts } from '@/lib/repositories/serverCatalogRepository';
import { resolveCategoryRoute } from '@/lib/catalog/categoryHierarchy';
import { routing } from '@/i18n/routing';
import type { Language } from '@/types';

export async function CategoryRoutePage({ locale, segments }: { locale: string; segments: string[] }) {
  if (!routing.locales.includes(locale as Language)) notFound();
  const categories = await getPublicCategories();
  const resolved = resolveCategoryRoute(segments, categories);
  if (!resolved) notFound();
  // A former flat category URL remains useful after moving it below a Category.
  // Only the canonical nested URL renders content; invalid parent/child is 404.
  if (resolved.redirect) permanentRedirect(`/${locale}${resolved.path}`);
  const [products, attributes] = await Promise.all([getPublicProducts(), getPublicAttributes()]);
  return <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
    <Header initialCategories={categories} />
    <CatalogListing key={resolved.category.id} activeCategorySlug={resolved.category.slug}
      initialProducts={products} initialCategories={categories} initialAttributes={attributes} />
    <Footer />
  </div>;
}
