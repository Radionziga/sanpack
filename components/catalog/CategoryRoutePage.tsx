import { notFound, permanentRedirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CatalogListing } from '@/components/catalog/CatalogListing';
import { getPublicAttributes, getPublicCategories, getPublicProducts } from '@/lib/repositories/serverCatalogRepository';
import { getCategoryBreadcrumbs, resolveCategoryRoute } from '@/lib/catalog/categoryHierarchy';
import { routing } from '@/i18n/routing';
import type { Language } from '@/types';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { buildBreadcrumbStructuredData } from '@/lib/seo/metadata';

export async function CategoryRoutePage({ locale, segments }: { locale: string; segments: string[] }) {
  if (!routing.locales.includes(locale as Language)) notFound();
  const categories = await getPublicCategories();
  const resolved = resolveCategoryRoute(segments, categories);
  if (!resolved) notFound();
  // A former flat category URL remains useful after moving it below a Category.
  // Only the canonical nested URL renders content; invalid parent/child is 404.
  if (resolved.redirect) permanentRedirect(`/${locale}${resolved.path}`);
  const [products, attributes] = await Promise.all([getPublicProducts(), getPublicAttributes()]);
  const language = locale as Language;
  const localize = (ru: string, uz: string, en?: string, zh?: string) => resolveLocalizedText(language, { ru, uz, en, zh }).text;
  const breadcrumbs = buildBreadcrumbStructuredData([
    { name: localize('Главная', 'Bosh sahifa', 'Home', '首页'), path: `/${locale}` },
    { name: localize('Каталог', 'Katalog', 'Catalog', '目录'), path: `/${locale}/catalog` },
    ...getCategoryBreadcrumbs(resolved.category, categories).map(({ category, href }) => ({
      name: localize(category.titleRu, category.titleUz, category.titleEn, category.titleZh),
      path: `/${locale}${href}`,
    })),
  ]);
  return <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, '\\u003c') }} />
    <Header initialCategories={categories} />
    <CatalogListing key={resolved.category.id} activeCategorySlug={resolved.category.slug}
      initialProducts={products} initialCategories={categories} initialAttributes={attributes} />
    <Footer />
  </div>;
}
