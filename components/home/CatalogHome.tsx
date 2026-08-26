'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Download,
  FileText,
  PhoneCall,
  Send,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import type { Banner, Category, Language, Product } from '@/types';
import { PromoCarousel } from '@/components/home/PromoCarousel';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref } from '@/lib/settings/contacts';
import { getCatalogPrintPath } from '@/lib/documents/catalogIdentity';
import { getPopularCategoryArtwork } from '@/lib/catalog/popularCategoryArtwork';
import { getCategoryTitle } from '@/lib/i18n/categoryText';
import {
  StorefrontCartSidebar,
  StorefrontCategorySidebar,
  StorefrontMobileCategoryRail,
} from '@/components/storefront/StorefrontPanels';

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
  const t = useTranslations('homeCatalog');
  const tPdf = useTranslations('catalogPdf.downloadDialog');
  const { getLocalizedText } = useLanguage();
  const { company, contacts } = useSiteSettings();
  const categoryTitle = (category: Category) => getCategoryTitle(
    category,
    locale,
    getLocalizedText(category.titleRu, category.titleUz, category.titleEn, category.titleZh),
  );
  const pdfDialogRef = useRef<HTMLDivElement>(null);
  const pdfDialogCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pdfModalOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => pdfDialogCloseRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPdfModalOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !pdfDialogRef.current) return;
      const focusable = Array.from(
        pdfDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [pdfModalOpen]);

  const categoryCards = useMemo(() => categories
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
      .filter((item) => item.category.status === 'active' && item.count > 0)
      .sort((a, b) => (a.category.sortOrder ?? 99) - (b.category.sortOrder ?? 99)), [categories, products]);

  const childCategoryCards = useMemo(
    () => categoryCards.filter((item) => Boolean(item.category.parentId)),
    [categoryCards],
  );

  // Real product groups are more useful here than the two broad parent sections.
  const mainCategories = useMemo(() => {
    const categoriesWithProducts = categories.filter((category) => (
      Boolean(category.parentId)
      && category.status === 'active'
      && products.some((product) => (
        product.categoryId === category.id || product.categorySlug === category.slug
      ))
    ));

    return categoriesWithProducts
      .sort((left, right) => (left.sortOrder ?? 99) - (right.sortOrder ?? 99))
      .slice(0, 10);
  }, [categories, products]);

  const categorySections = useMemo(() => mainCategories
    .map((category) => ({
      category,
      products: products
        .filter((product) => product.categoryId === category.id || product.categorySlug === category.slug)
        .slice(0, 6),
    }))
    .filter((section) => section.products.length > 0), [mainCategories, products]);

  const storefrontCopy = {
    ru: { categories: 'Популярные категории', all: 'Смотреть все', empty: 'Каталог временно недоступен' },
    uz: { categories: 'Ommabop toifalar', all: 'Barchasini ko‘rish', empty: 'Katalog vaqtincha ishlamayapti' },
    en: { categories: 'Popular categories', all: 'View all', empty: 'The catalogue is temporarily unavailable' },
    zh: { categories: '热门分类', all: '查看全部', empty: '目录暂时不可用' },
  }[locale];

  return (
    <div className="bg-[var(--sp-canvas)]">
      <div className="mx-auto grid w-full max-w-[1536px] gap-5 px-4 pb-12 pt-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px] xl:gap-6">
        <div className="hidden lg:block">
          <StorefrontCategorySidebar categories={categories} />
        </div>

        <div className="min-w-0">
          <PromoCarousel banners={banners} locale={locale} />

          <div className="mt-7">
            <StorefrontMobileCategoryRail categories={categories} />
          </div>

          {childCategoryCards.length > 0 ? (
            <section aria-labelledby="popular-category-heading" className="mt-8 hidden lg:block">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 id="popular-category-heading" className="text-2xl font-extrabold tracking-[-0.035em] text-[var(--sp-ink)]">{storefrontCopy.categories}</h2>
                <Link href="/catalog" className="flex min-h-11 items-center gap-1.5 rounded-[var(--sp-radius-control)] px-3 text-xs font-bold text-[var(--sp-brand)] hover:bg-[var(--sp-brand-soft)]">
                  {storefrontCopy.all}<ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {childCategoryCards.slice(0, 6).map(({ category, count }) => (
                  <Link
                    key={category.id}
                    href={`/catalog/${category.slug}`}
                    className="group relative isolate min-h-40 overflow-hidden rounded-[var(--sp-radius-card)] bg-[var(--sp-brand-soft)] p-4 ring-1 ring-inset ring-[var(--sp-line)] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[var(--sp-shadow-raised)] motion-reduce:hover:translate-y-0"
                  >
                    {getPopularCategoryArtwork(category) ? (
                      <Image src={getPopularCategoryArtwork(category)!} alt="" fill sizes="(min-width: 1024px) 26vw, 320px" className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                    ) : null}
                    <div className="relative z-10 max-w-[52%] pt-0.5 text-white">
                      <h3 className="line-clamp-3 text-sm font-extrabold leading-[1.18]">{categoryTitle(category)}</h3>
                      <p className="mt-1.5 text-[11px] font-semibold text-white/85">{t('categoryItemsCount', { count })}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : dataUnavailable ? (
            <p className="mt-8 rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] p-6 text-center text-sm text-[var(--sp-ink-secondary)]">{storefrontCopy.empty}</p>
          ) : null}

          <div className="mt-9 space-y-10">
            {categorySections.map(({ category, products: sectionProducts }, sectionIndex) => (
              <section key={category.id} aria-labelledby={`home-shelf-${category.id}`}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 id={`home-shelf-${category.id}`} className="text-2xl font-extrabold leading-tight tracking-[-0.035em] text-[var(--sp-ink)]">
                      {categoryTitle(category)}
                    </h2>
                    {category.descriptionRu || category.descriptionUz || category.descriptionEn ? (
                      <p className="mt-1 line-clamp-1 text-xs text-[var(--sp-ink-secondary)]">{getLocalizedText(category.descriptionRu, category.descriptionUz, category.descriptionEn, category.descriptionZh)}</p>
                    ) : null}
                  </div>
                  <Link href={`/catalog/${category.slug}`} className="flex min-h-11 shrink-0 items-center gap-1 rounded-[var(--sp-radius-control)] px-2.5 text-xs font-bold text-[var(--sp-brand)] hover:bg-[var(--sp-brand-soft)]">
                    {storefrontCopy.all}<ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4">
                  {sectionProducts.map((product, productIndex) => (
                    <ProductCard key={product.id} product={product} appearance="market" eagerImage={sectionIndex === 0 && productIndex < 3} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/catalog" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-8 text-sm font-bold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)] transition-[background-color,opacity] hover:bg-[var(--sp-brand-deep)] active:opacity-85 sm:w-auto">
              <span>{t('viewAllProducts')} ({products.length})</span><ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <button type="button" onClick={() => setPdfModalOpen(true)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line-strong)] bg-[var(--sp-surface)] px-6 text-sm font-semibold text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] sm:w-auto">
              <Download className="size-4" aria-hidden="true" /><span>{t('downloadCatalog')} (PDF)</span>
            </button>
          </div>
        </div>

        <div className="hidden h-full xl:block">
          <StorefrontCartSidebar />
        </div>
      </div>

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPdfModalOpen(false)}
        >
          <div
            ref={pdfDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-pdf-dialog-title"
            aria-describedby="catalog-pdf-dialog-description"
            className="w-full max-w-md rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--sp-brand-subtle)] text-[var(--sp-brand)]">
                  <FileText className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="catalog-pdf-dialog-title" className="font-extended text-base font-bold text-[var(--sp-ink)]">
                    {tPdf('title', { company: company.name })}
                  </h3>
                  <p id="catalog-pdf-dialog-description" className="text-xs text-[var(--sp-ink-secondary)]">
                    {tPdf('description')}
                  </p>
                </div>
              </div>
              <button
                ref={pdfDialogCloseRef}
                type="button"
                onClick={() => setPdfModalOpen(false)}
                className="sp-icon-button size-10 text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-hover)] hover:text-[var(--sp-ink)]"
                aria-label={tPdf('close')}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <a
                href={getCatalogPrintPath(true, locale)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setPdfModalOpen(false)}
                className="group flex items-center justify-between rounded-xl border border-[var(--sp-brand-border)] bg-[var(--sp-brand-subtle)] p-4 transition-all hover:border-[var(--sp-brand)] hover:shadow-sm active:scale-[0.98]"
              >
                <div className="pr-3">
                  <span className="inline-block rounded bg-[var(--sp-brand)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--sp-on-brand)]">
                    {tPdf('priceListBadge')}
                  </span>
                  <p className="mt-1 font-semibold text-sm text-[var(--sp-ink)]">
                    {tPdf('withPricesTitle')}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sp-ink-secondary)]">
                    {tPdf('withPricesDescription')}
                  </p>
                </div>
                <Download className="size-5 shrink-0 text-[var(--sp-brand)] transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
              </a>

              <a
                href={getCatalogPrintPath(false, locale)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setPdfModalOpen(false)}
                className="group flex items-center justify-between rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-soft)] p-4 transition-all hover:border-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-hover)] active:scale-[0.98]"
              >
                <div className="pr-3">
                  <span className="inline-block rounded bg-zinc-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    {tPdf('presentationBadge')}
                  </span>
                  <p className="mt-1 font-semibold text-sm text-[var(--sp-ink)]">
                    {tPdf('withoutPricesTitle')}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sp-ink-secondary)]">
                    {tPdf('withoutPricesDescription')}
                  </p>
                </div>
                <Download className="size-5 shrink-0 text-[var(--sp-ink-secondary)] transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPdfModalOpen(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)]"
              >
                {tPdf('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
