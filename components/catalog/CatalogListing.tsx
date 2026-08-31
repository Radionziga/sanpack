'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  Filter,
  Grid2X2,
  List,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import type { Attribute, Category, Product } from '@/types';
import {
  getCategoryDescendantIds,
  isAttributeApplicableToCategory,
} from '@/lib/catalog/attributeApplicability';
import { FilterSidebar } from '@/components/catalog/FilterSidebar';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CatalogBreadcrumbs, SubcategoryNavigation } from '@/components/catalog/CategoryNavigation';
import { getCategoryBreadcrumbs, getProductsInCategoryScope, getVisibleCategories } from '@/lib/catalog/categoryHierarchy';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { filterProductsBySearch } from '@/lib/catalog/productSearch';
import {
  getProductAttributeValues,
  isAttributeFilterActive,
  productMatchesAttributeFilters,
  type CatalogAttributeFilters,
} from '@/lib/catalog/productFacets';
import { getEffectiveCatalogPrice } from '@/lib/commerce/productOffer';
import {
  StorefrontCartSidebar,
  StorefrontCategorySidebar,
  StorefrontMobileCategoryRail,
} from '@/components/storefront/StorefrontPanels';

interface CatalogListingProps {
  activeCategorySlug?: string;
  searchQuery?: string;
  initialProducts?: Product[];
  initialCategories?: Category[];
  initialAttributes?: Attribute[];
}

type LoadState = 'loading' | 'ready' | 'error';

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] p-2 sm:p-3"
        >
          <div className="aspect-square animate-pulse rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)]" />
          <div className="mt-3 h-3.5 w-4/5 animate-pulse rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)]" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)]" />
          <div className="mt-5 h-10 animate-pulse rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)]" />
        </div>
      ))}
    </div>
  );
}

export function CatalogListing({
  activeCategorySlug,
  searchQuery,
  initialProducts,
  initialCategories,
  initialAttributes,
}: CatalogListingProps) {
  const t = useTranslations('catalogListing');
  const { getLocalizedText, language } = useLanguage();
  const hasInitialCatalog = Boolean(initialProducts && initialCategories && initialAttributes);
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? []);
  const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes ?? []);
  const [loadState, setLoadState] = useState<LoadState>(hasInitialCatalog ? 'ready' : 'loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<CatalogAttributeFilters>({});
  const [inStockOnly, setInStockOnly] = useState(false);
  const [ownProductionOnly, setOwnProductionOnly] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hasInitialCatalog && loadAttempt === 0) return;
    let cancelled = false;
    async function loadCatalog() {
      try {
        const [nextProducts, nextCategories, nextAttributes] = await Promise.all([
          PublicRepository.getProducts(),
          PublicRepository.getCategories(),
          PublicRepository.getAttributes(),
        ]);
        if (cancelled) return;
        setProducts(nextProducts);
        setCategories(nextCategories);
        setAttributes(nextAttributes);
        setLoadState('ready');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [hasInitialCatalog, loadAttempt]);

  useEffect(() => {
    if (!isMobileFilterOpen) return;
    const previousOverflow = document.body.style.overflow;
    const filterTrigger = filterTriggerRef.current;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => filterCloseRef.current?.focus());
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileFilterOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
      filterTrigger?.focus();
    };
  }, [isMobileFilterOpen]);

  const currentCategory = useMemo(
    () => categories.find((category) => category.slug === activeCategorySlug) ?? null,
    [activeCategorySlug, categories],
  );

  const categoryCrumbs = currentCategory ? getCategoryBreadcrumbs(currentCategory, categories) : [];
  const parentPath = categoryCrumbs.at(-2)?.href ?? '/catalog';

  const scopedProducts = useMemo(() => {
    let nextProducts = products;
    if (currentCategory) {
      nextProducts = getProductsInCategoryScope(products, getVisibleCategories(categories), currentCategory.id);
    }
    return searchQuery === undefined
      ? nextProducts
      : filterProductsBySearch(nextProducts, searchQuery);
  }, [categories, currentCategory, products, searchQuery]);

  const filterAttributes = useMemo(() => {
    if (!currentCategory) return [];
    const categoryIds = getCategoryDescendantIds(currentCategory.id, categories);

    return attributes.filter((attribute) => {
      if (!attribute.filterable) return false;
      if (![...categoryIds].some((id) => isAttributeApplicableToCategory(attribute, id, categories))) {
        return false;
      }
      return scopedProducts.some((product) => getProductAttributeValues(product, attribute.key).length > 0);
    });
  }, [attributes, categories, currentCategory, scopedProducts]);

  const applicableSelectedFilters = useMemo(() => {
    const allowedKeys = new Set(filterAttributes.map((attribute) => attribute.key));
    return Object.fromEntries(
      Object.entries(selectedFilters).filter(([key]) => allowedKeys.has(key)),
    );
  }, [filterAttributes, selectedFilters]);

  const filteredProducts = useMemo(() => {
    return scopedProducts
      .filter((product) => {
        if (ownProductionOnly && !product.ownProduction) return false;
        return productMatchesAttributeFilters(product, applicableSelectedFilters, { inStockOnly });
      })
      .sort((left, right) => {
        if (sortBy === 'newest') return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        if (sortBy === 'name') {
          const leftTitle = getLocalizedText(left.titleRu, left.titleUz, left.titleEn, left.titleZh);
          const rightTitle = getLocalizedText(right.titleRu, right.titleUz, right.titleEn, right.titleZh);
          return leftTitle.localeCompare(rightTitle, language);
        }
        if (sortBy === 'price_asc') {
          return (getEffectiveCatalogPrice(left)?.amount ?? Number.POSITIVE_INFINITY)
            - (getEffectiveCatalogPrice(right)?.amount ?? Number.POSITIVE_INFINITY);
        }
        if (sortBy === 'price_desc') {
          return (getEffectiveCatalogPrice(right)?.amount ?? Number.NEGATIVE_INFINITY)
            - (getEffectiveCatalogPrice(left)?.amount ?? Number.NEGATIVE_INFINITY);
        }
        return right.sortOrder - left.sortOrder;
      });
  }, [applicableSelectedFilters, getLocalizedText, inStockOnly, language, ownProductionOnly, scopedProducts, sortBy]);

  const activeFilterCount =
    Number(inStockOnly) +
    Number(ownProductionOnly) +
    Object.values(applicableSelectedFilters).reduce((total, selection) => total + Number(isAttributeFilterActive(selection)), 0);
  const normalizedSearchQuery = searchQuery?.trim() || '';
  const categoryTitle = searchQuery !== undefined
    ? normalizedSearchQuery
      ? t('searchTitle', { query: normalizedSearchQuery })
      : t('searchWithoutQuery')
    : currentCategory
      ? getLocalizedText(currentCategory.titleRu, currentCategory.titleUz, currentCategory.titleEn, currentCategory.titleZh)
      : t('catalog');
  const categoryDescription = currentCategory
    ? getLocalizedText(currentCategory.descriptionRu, currentCategory.descriptionUz, currentCategory.descriptionEn, currentCategory.descriptionZh)
    : '';

  const resetFilters = () => {
    setSelectedFilters({});
    setInStockOnly(false);
    setOwnProductionOnly(false);
  };

  const handleSheetKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  return (
    <main className="flex-1 pb-8 pt-4 md:py-8">
      <div className="mx-auto grid w-full max-w-[1536px] gap-5 px-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px] xl:gap-6">
        <div className="hidden lg:block">
          <StorefrontCategorySidebar categories={categories} activeCategorySlug={activeCategorySlug} />
        </div>

        <div className="min-w-0">
        <CatalogBreadcrumbs category={currentCategory} categories={categories} />

        <div className="md:flex md:items-end md:justify-between md:gap-5">
        <div className="mb-4 min-w-0 md:mb-0 md:flex-1">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {currentCategory ? (
              <Link
                href={parentPath}
                className="flex size-11 shrink-0 items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink)] shadow-xs transition-[border-color,color,transform] hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] active:scale-[0.96] md:hidden"
                aria-label={t('back')}
                title={t('back')}
              >
                <ChevronLeft className="size-5 text-[var(--sp-brand)]" aria-hidden="true" />
              </Link>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="text-pretty break-words font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] sm:text-3xl">
                {categoryTitle}
              </h1>
            </div>
          </div>
          {categoryDescription ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--sp-ink-secondary)]">{categoryDescription}</p> : null}
          <p className="mt-1.5 text-xs font-medium text-[var(--sp-ink-secondary)]">
            {loadState === 'ready' ? (
              <>{t('found')} <span className="font-semibold tabular-nums text-[var(--sp-brand)]">{filteredProducts.length}</span></>
            ) : (
              <span className="inline-block h-3 w-24 animate-pulse rounded bg-[var(--sp-surface-inset)]" aria-hidden="true" />
            )}
          </p>
        </div>

        <div className="sticky top-[56px] z-20 -mx-4 mt-3 shrink-0 border-y border-[var(--sp-line)] bg-[color-mix(in_srgb,var(--sp-canvas)_96%,transparent)] px-4 py-2.5 backdrop-blur-xl md:static md:mx-0 md:mt-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
          <div className="flex items-center gap-2 md:justify-end">
            <button
              ref={filterTriggerRef}
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              aria-haspopup="dialog"
              className="relative flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 text-sm font-semibold text-[var(--sp-ink)] shadow-[var(--sp-shadow-soft)] md:flex-none md:px-4"
            >
              <Filter className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
              <span>{t('filters')}</span>
              {activeFilterCount > 0 ? (
                <span className="flex min-h-5 min-w-5 items-center justify-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand)] px-1 text-[10px] tabular-nums text-[var(--sp-on-brand)]">{activeFilterCount}</span>
              ) : null}
            </button>

            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'popular', label: t('sortPopular') },
                { value: 'newest', label: t('sortNewest') },
                { value: 'name', label: t('sortName') },
                { value: 'price_asc', label: t('sortPriceAsc') },
                { value: 'price_desc', label: t('sortPriceDesc') },
              ]}
              ariaLabel={t('sortBy')}
              size="md"
              className="min-w-0 flex-1 md:w-52 md:flex-none"
            />

            <div className="hidden h-12 items-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-1 md:flex">
              <button type="button" onClick={() => setViewMode('grid')} aria-label={t('grid')} aria-pressed={viewMode === 'grid'} className={`flex size-10 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control-inner)] transition-colors ${viewMode === 'grid' ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-inset)]'}`}>
                <Grid2X2 className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setViewMode('list')} aria-label={t('list')} aria-pressed={viewMode === 'list'} className={`flex size-10 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control-inner)] transition-colors ${viewMode === 'list' ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-inset)]'}`}>
                <List className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        </div>

        <div className="mt-5 lg:hidden">
          <StorefrontMobileCategoryRail categories={categories} activeCategorySlug={activeCategorySlug} />
        </div>
        {currentCategory ? <SubcategoryNavigation category={currentCategory} categories={categories} /> : null}

        <div className="mt-5">
          <div className="min-w-0">
            {activeFilterCount > 0 ? (
              <div className="mb-4 flex items-center gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-3 py-2.5">
                <span className="min-w-0 flex-1 text-xs font-medium text-[var(--sp-ink-secondary)]">{t('selected')}: {activeFilterCount}</span>
                <button type="button" onClick={resetFilters} className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[var(--sp-radius-control-inner)] px-2 text-xs font-semibold text-[var(--sp-brand)] transition-colors hover:bg-[var(--sp-brand-soft)]">
                  <RotateCcw className="size-3.5" aria-hidden="true" />{t('reset')}
                </button>
              </div>
            ) : null}

            {loadState === 'loading' ? <CatalogSkeleton /> : null}

            {loadState === 'error' ? (
              <div className="mx-auto max-w-md py-12 text-center" role="alert">
                <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-[var(--sp-brand)]"><RefreshCw className="size-6" aria-hidden="true" /></div>
                <h2 className="mt-5 font-extended text-xl font-bold text-[var(--sp-ink)]">{t('error')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--sp-ink-secondary)]">{t('errorText')}</p>
                <button type="button" onClick={() => { setLoadState('loading'); setLoadAttempt((current) => current + 1); }} className="mt-5 min-h-11 cursor-pointer rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)]">{t('retry')}</button>
              </div>
            ) : null}

            {loadState === 'ready' && filteredProducts.length === 0 ? (
              <div className="mx-auto max-w-md py-12 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-[var(--sp-ink-muted)]"><Search className="size-6" aria-hidden="true" /></div>
                <h2 className="mt-5 font-extended text-xl font-bold text-[var(--sp-ink)]">{t('empty')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--sp-ink-secondary)]">{t(searchQuery !== undefined ? 'searchEmptyText' : 'emptyText')}</p>
                {activeFilterCount > 0 ? <button type="button" onClick={resetFilters} className="mt-5 min-h-11 cursor-pointer rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)]">{t('reset')}</button> : null}
              </div>
            ) : null}

            {loadState === 'ready' && filteredProducts.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4' : 'space-y-4'}>
                {filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} viewMode={viewMode} appearance={viewMode === 'grid' ? 'market' : 'default'} eagerImage={index < 3} attributeDefinitions={attributes} />)}
              </div>
            ) : null}
          </div>
        </div>

        </div>

        <div className="hidden h-full xl:block">
          <StorefrontCartSidebar />
        </div>
      </div>

      {isMobileFilterOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={t('closeFilters')} onClick={() => setIsMobileFilterOpen(false)} className="absolute inset-0 cursor-pointer bg-black/45" />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            onKeyDown={handleSheetKeyDown}
            className="absolute inset-x-0 bottom-0 flex max-h-[min(84dvh,760px)] flex-col rounded-t-[var(--sp-radius-card)] bg-[var(--sp-surface)] shadow-[0_-18px_48px_rgb(0_0_0/18%)] md:inset-auto md:left-1/2 md:top-1/2 md:w-[min(34rem,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[var(--sp-radius-card)] md:shadow-[var(--sp-shadow-raised)]"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--sp-line)] px-4 py-3">
              <div>
                <h2 id="mobile-filter-title" className="font-extended text-lg font-bold text-[var(--sp-ink)]">{t('filters')}</h2>
                <p className="mt-0.5 text-xs text-[var(--sp-ink-secondary)]">{t('found')} {filteredProducts.length}</p>
              </div>
              <button ref={filterCloseRef} type="button" onClick={() => setIsMobileFilterOpen(false)} aria-label={t('closeFilters')} className="sp-icon-button size-11 shrink-0"><X className="size-5" aria-hidden="true" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <FilterSidebar
                embedded
                hideHeader
                attributes={filterAttributes}
                products={scopedProducts}
                selectedFilters={applicableSelectedFilters}
                onFilterChange={(key, selection) => setSelectedFilters((current) => {
                  if (selection) return { ...current, [key]: selection };
                  const next = { ...current };
                  delete next[key];
                  return next;
                })}
                inStockOnly={inStockOnly}
                onInStockChange={setInStockOnly}
                ownProductionOnly={ownProductionOnly}
                onOwnProductionChange={setOwnProductionOnly}
                onReset={resetFilters}
              />
            </div>
            <div className="flex shrink-0 gap-2 border-t border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {activeFilterCount > 0 ? <button type="button" onClick={resetFilters} className="min-h-12 cursor-pointer rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-4 text-sm font-semibold text-[var(--sp-ink)]">{t('reset')}</button> : null}
              <button type="button" onClick={() => setIsMobileFilterOpen(false)} className="min-h-12 flex-1 cursor-pointer rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)]">{t('show')} ({filteredProducts.length})</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
