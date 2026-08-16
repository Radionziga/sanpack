'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Download,
  FileText,
  PackageSearch,
  PhoneCall,
  Send,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import type { Banner, Category, Language, Product } from '@/types';
import { PromoCarousel } from '@/components/home/PromoCarousel';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref } from '@/lib/settings/contacts';

interface CatalogHomeProps {
  products: Product[];
  categories: Category[];
  banners: Banner[];
  locale: Language;
  catalogPdfUrl?: string;
  dataUnavailable?: boolean;
}

export function CatalogHome({
  products,
  categories,
  banners,
  locale,
  catalogPdfUrl,
  dataUnavailable = false,
}: CatalogHomeProps) {
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const t = useTranslations('homeCatalog');
  const { getLocalizedText } = useLanguage();
  const { contacts } = useSiteSettings();

  const categoryCards = useMemo(() => {
    return categories
      .map((category) => {
        const subcategories = categories.filter((c) => c.parentId === category.id);
        const childCategoryIds = new Set([category.id, ...subcategories.map((c) => c.id)]);
        const categoryProducts = products.filter(
          (product) =>
            childCategoryIds.has(product.categoryId) ||
            childCategoryIds.has(product.categorySlug) ||
            product.categoryId === category.id ||
            product.categorySlug === category.slug
        );

        return {
          category,
          count: categoryProducts.length,
          image: category.image || categoryProducts[0]?.mainImage,
        };
      })
      .filter((item) => item.count > 0 || !item.category.parentId)
      .sort((a, b) => (a.category.sortOrder ?? 99) - (b.category.sortOrder ?? 99));
  }, [categories, products]);

  // Top level categories for filtering the main catalog section
  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parentId && c.slug !== 'branding-polygraphy'),
    [categories]
  );

  // Filtered products for main catalog section (concise 8-item preview grid)
  const displayedCatalogProducts = useMemo(() => {
    if (selectedCategorySlug === 'all') {
      return products.slice(0, 8);
    }
    const cat = categories.find((c) => c.slug === selectedCategorySlug);
    if (!cat) return products.slice(0, 8);

    const subcategoryIds = new Set(
      categories.filter((c) => c.parentId === cat.id).map((c) => c.id)
    );
    subcategoryIds.add(cat.id);

    return products
      .filter(
        (p) =>
          subcategoryIds.has(p.categoryId) ||
          p.categorySlug === cat.slug ||
          p.categorySlug === selectedCategorySlug
      )
      .slice(0, 8);
  }, [selectedCategorySlug, categories, products]);

  return (
    <div className="bg-[var(--sp-canvas)]">
      {/* Top Banner Carousel */}
      <section className="mx-auto max-w-7xl px-4 md:px-10 lg:px-12 pb-7 pt-5 md:pb-9 md:pt-7">
        <PromoCarousel banners={banners} locale={locale} />
      </section>

      {/* Categories Horizontal Slider */}
      <section className="border-y border-[var(--sp-line)] bg-[var(--sp-surface)] py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-extended text-xl sm:text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] md:text-[28px]">
                {t('categoriesTitle')}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[var(--sp-ink-secondary)]">{t('categoriesDescription')}</p>
            </div>
            <Link
              href="/catalog"
              className="hidden shrink-0 items-center gap-1.5 font-compact text-xs font-semibold text-[var(--sp-brand)] transition-opacity hover:opacity-75 sm:inline-flex"
            >
              {t('allCategories')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {categoryCards.length > 0 ? (
            <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
              <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto py-1 pl-[max(1rem,calc((100vw-80rem)/2+1rem))] pr-4">
                {categoryCards.map(({ category, count, image }, index) => (
                  <Link
                    key={category.id}
                    href={`/catalog/${category.slug}`}
                    className="group relative aspect-[4/3] min-w-[220px] max-w-[220px] snap-start overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--sp-brand)] hover:shadow-[var(--sp-shadow-raised)] motion-reduce:hover:translate-y-0 sm:min-w-[240px] sm:max-w-[240px] md:min-w-[260px] md:max-w-[260px]"
                  >
                    {/* Full Card Image */}
                    {image ? (
                      <Image
                        src={image}
                        alt={getLocalizedText(category.titleRu, category.titleUz, category.titleEn)}
                        fill
                        sizes="(max-width: 768px) 240px, 260px"
                        loading={index < 4 ? 'eager' : 'lazy'}
                        priority={index < 2}
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--sp-surface-inset)]">
                        <PackageSearch className="h-16 w-16 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                      </div>
                    )}

                    {/* Clean Top-Left Text */}
                    <div className="relative z-10 p-3.5 sm:p-4 max-w-[90%]">
                      <h3 className="line-clamp-2 font-compact text-xs sm:text-sm font-bold leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
                        {getLocalizedText(category.titleRu, category.titleUz, category.titleEn)}
                      </h3>
                      <p className="mt-0.5 text-[10px] sm:text-[11px] font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                        {t('itemsCount', { count })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--sp-radius-card)] border border-dashed border-[var(--sp-line-strong)] bg-[var(--sp-surface-inset)] px-6 py-10 text-center text-sm text-[var(--sp-ink-secondary)]">
              {dataUnavailable ? t('errorDescription') : t('emptyCatalogDescription')}
            </div>
          )}
        </div>
      </section>

      {/* Main Catalog Products Preview Section */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-extended text-xl sm:text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] md:text-[28px]">
              {t('mainCatalogTitle')}
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-[var(--sp-ink-secondary)]">
              {t('mainCatalogDescription')}
            </p>
          </div>

          <Link
            href="/catalog"
            className="hidden shrink-0 items-center gap-1.5 font-compact text-xs font-semibold text-[var(--sp-brand)] transition-opacity hover:opacity-75 sm:inline-flex"
          >
            {t('viewCatalog')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Quick Category Filter Tabs (respecting theme radius) */}
        {mainCategories.length > 0 && (
          <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            <button
              type="button"
              onClick={() => setSelectedCategorySlug('all')}
              className={`shrink-0 rounded-[var(--sp-radius-control)] px-4 py-2 font-compact text-xs font-semibold transition-all ${
                selectedCategorySlug === 'all'
                  ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-xs'
                  : 'border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)] hover:border-[var(--sp-brand)] hover:text-[var(--sp-ink)]'
              }`}
            >
              {t('allProducts')}
            </button>

            {mainCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategorySlug(cat.slug)}
                className={`shrink-0 rounded-[var(--sp-radius-control)] px-4 py-2 font-compact text-xs font-semibold transition-all ${
                  selectedCategorySlug === cat.slug
                    ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-xs'
                    : 'border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)] hover:border-[var(--sp-brand)] hover:text-[var(--sp-ink)]'
                }`}
              >
                {getLocalizedText(cat.titleRu, cat.titleUz, cat.titleEn)}
              </button>
            ))}
          </div>
        )}

        {/* Main 2-Column Responsive Product Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {displayedCatalogProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              eagerImage={index < 8}
            />
          ))}
        </div>

        {/* Bottom All Products CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/catalog"
            className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-8 font-compact text-sm font-semibold text-[var(--sp-on-brand)] shadow-xs transition-all hover:bg-[var(--sp-brand-deep)] active:scale-[0.98]"
          >
            <span>{t('viewAllProducts')} ({products.length})</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => setPdfModalOpen(true)}
            className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line-strong)] bg-[var(--sp-surface)] px-6 font-compact text-sm font-medium text-[var(--sp-ink)] transition-all hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] active:scale-[0.98]"
          >
            <Download className="size-4" />
            <span>{t('downloadCatalog')} (PDF)</span>
          </button>
        </div>
      </section>

      {/* Custom Request CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-3 md:pb-16 md:pt-5">
        <div className="relative overflow-hidden rounded-[var(--sp-radius-card)] border border-[color-mix(in_srgb,var(--sp-cta-ink)_14%,transparent)] bg-[var(--sp-cta-bg)] px-5 py-7 text-[var(--sp-cta-ink)] shadow-[var(--sp-shadow-soft)] md:px-10 md:py-10">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_75%_20%,color-mix(in_srgb,var(--sp-cta-action)_22%,transparent),transparent_48%)]" />
          <div className="relative z-10 grid items-center gap-7 md:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[var(--sp-cta-ink)]">
                <span className="flex size-8 items-center justify-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-cta-action)] text-[var(--sp-cta-action-ink)]">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-compact text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {t('ctaEyebrow')}
                </span>
              </div>
              <h2 className="text-pretty font-extended text-2xl font-bold tracking-[-0.025em] md:text-3xl">
                {t('ctaTitle')}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[color-mix(in_srgb,var(--sp-cta-ink)_78%,transparent)]">
                {t('ctaDescription')}
              </p>
            </div>
            <div className="grid w-full gap-2.5 md:w-72">
              <Link
                href="/request"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-cta-ink)] bg-[var(--sp-cta-ink)] px-5 font-compact text-xs font-semibold text-[var(--sp-cta-bg)] transition-[background-color,border-color,color,transform] hover:border-[var(--sp-cta-action)] hover:bg-[var(--sp-cta-action)] hover:text-[var(--sp-cta-action-ink)] active:scale-[0.96] md:min-h-11"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('sendList')}
              </Link>
              <button
                type="button"
                onClick={() => setPdfModalOpen(true)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-cta-ink)_28%,transparent)] bg-[color-mix(in_srgb,var(--sp-cta-ink)_8%,transparent)] px-5 font-compact text-xs font-medium text-[var(--sp-cta-ink)] transition-[background-color,border-color,transform] hover:border-[color-mix(in_srgb,var(--sp-cta-ink)_46%,transparent)] hover:bg-[color-mix(in_srgb,var(--sp-cta-ink)_14%,transparent)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-11"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t('downloadCatalog')}
              </button>
              <a
                href={contactPhoneHref(contacts.phone1)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-cta-ink)_28%,transparent)] bg-[color-mix(in_srgb,var(--sp-cta-ink)_8%,transparent)] px-5 font-compact text-xs font-medium text-[var(--sp-cta-ink)] transition-[background-color,border-color,transform] hover:border-[color-mix(in_srgb,var(--sp-cta-ink)_46%,transparent)] hover:bg-[color-mix(in_srgb,var(--sp-cta-ink)_14%,transparent)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-11"
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                {t('callSales')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PDF Download Choice Modal */}
      {pdfModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPdfModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--sp-brand-subtle)] text-[var(--sp-brand)]">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h3 className="font-extended text-base font-bold text-[var(--sp-ink)]">
                    Каталог продукции SANPACK
                  </h3>
                  <p className="text-xs text-[var(--sp-ink-secondary)]">
                    Выберите формат для скачивания (PDF, A4)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPdfModalOpen(false)}
                className="rounded-lg p-1 text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-ink)]"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <a
                href="/api/catalog/pdf?prices=1&download=1"
                target="_blank"
                rel="noreferrer"
                onClick={() => setPdfModalOpen(false)}
                className="group flex items-center justify-between rounded-xl border border-[var(--sp-brand-border)] bg-[var(--sp-brand-subtle)] p-4 transition-all hover:border-[var(--sp-brand)] hover:shadow-sm active:scale-[0.98]"
              >
                <div className="pr-3">
                  <span className="inline-block rounded bg-[var(--sp-brand)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Прайс-лист
                  </span>
                  <p className="mt-1 font-semibold text-sm text-[var(--sp-ink)]">
                    Каталог с оптовыми ценами
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sp-ink-secondary)]">
                    Артикулы, параметры, фасовка и актуальные цены в сумах
                  </p>
                </div>
                <Download className="size-5 shrink-0 text-[var(--sp-brand)] transition-transform group-hover:translate-y-0.5" />
              </a>

              <a
                href="/api/catalog/pdf?prices=0&download=1"
                target="_blank"
                rel="noreferrer"
                onClick={() => setPdfModalOpen(false)}
                className="group flex items-center justify-between rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-soft)] p-4 transition-all hover:border-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-hover)] active:scale-[0.98]"
              >
                <div className="pr-3">
                  <span className="inline-block rounded bg-zinc-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Презентация
                  </span>
                  <p className="mt-1 font-semibold text-sm text-[var(--sp-ink)]">
                    Каталог без цен
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sp-ink-secondary)]">
                    Удобно для показа конечным клиентам и партнерам
                  </p>
                </div>
                <Download className="size-5 shrink-0 text-[var(--sp-ink-secondary)] transition-transform group-hover:translate-y-0.5" />
              </a>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPdfModalOpen(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
