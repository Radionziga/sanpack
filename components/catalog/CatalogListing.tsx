'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
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
import { CategorySidebar } from '@/components/catalog/CategorySidebar';
import { FilterSidebar } from '@/components/catalog/FilterSidebar';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface CatalogListingProps {
  activeCategorySlug?: string;
}

type LoadState = 'loading' | 'ready' | 'error';

const copyByLanguage = {
  ru: {
    catalog: 'Каталог',
    all: 'Все товары',
    back: 'Назад',
    filters: 'Фильтры',
    closeFilters: 'Закрыть фильтры',
    active: 'Выбрано',
    resetAll: 'Сбросить',
    empty: 'Подходящих товаров нет',
    emptyText: 'Измените фильтры или выберите другую категорию.',
    show: 'Показать товары',
    error: 'Не удалось загрузить каталог',
    errorText: 'Проверьте соединение и попробуйте ещё раз.',
    retry: 'Попробовать снова',
    grid: 'Показать плиткой',
    list: 'Показать списком',
  },
  uz: {
    catalog: 'Katalog',
    all: 'Barcha mahsulotlar',
    back: 'Orqaga',
    filters: 'Filtrlar',
    closeFilters: 'Filtrlarni yopish',
    active: 'Tanlangan',
    resetAll: 'Tozalash',
    empty: 'Mos mahsulotlar topilmadi',
    emptyText: 'Filtrlarni o‘zgartiring yoki boshqa kategoriyani tanlang.',
    show: 'Mahsulotlarni ko‘rsatish',
    error: 'Katalogni yuklab bo‘lmadi',
    errorText: 'Internet aloqasini tekshirib, qayta urinib ko‘ring.',
    retry: 'Qayta urinish',
    grid: 'Katak ko‘rinishi',
    list: 'Ro‘yxat ko‘rinishi',
  },
  en: {
    catalog: 'Catalog',
    all: 'All products',
    back: 'Back',
    filters: 'Filters',
    closeFilters: 'Close filters',
    active: 'Selected',
    resetAll: 'Reset',
    empty: 'No matching products',
    emptyText: 'Change the filters or choose another category.',
    show: 'Show products',
    error: 'Could not load the catalog',
    errorText: 'Check your connection and try again.',
    retry: 'Try again',
    grid: 'Grid view',
    list: 'List view',
  },
} as const;

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

function MobileCategoryRail({
  categories,
  activeCategory,
}: {
  categories: Category[];
  activeCategory: Category | null;
}) {
  const { getLocalizedText, language } = useLanguage();
  const copy = copyByLanguage[language];
  const parents = useMemo(
    () => categories.filter((category) => !category.parentId && category.status === 'active'),
    [categories],
  );
  const activeParent = activeCategory?.parentId
    ? categories.find((category) => category.id === activeCategory.parentId) ?? null
    : activeCategory;
  const children = activeParent
    ? categories.filter((category) => category.parentId === activeParent.id && category.status === 'active')
    : [];

  const railClassName =
    '-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
  const itemClassName =
    'flex min-h-11 shrink-0 snap-start items-center rounded-[var(--sp-radius-control)] border px-3.5 text-sm font-medium transition-colors';

  return (
    <div className="space-y-2 lg:hidden">
      <nav className={railClassName} aria-label={copy.catalog}>
        <Link
          href="/catalog"
          aria-current={!activeCategory ? 'page' : undefined}
          className={`${itemClassName} ${
            !activeCategory
              ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'
              : 'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)]'
          }`}
        >
          {copy.all}
        </Link>
        {parents.map((category) => {
          const isActive = activeParent?.id === category.id;
          return (
            <Link
              key={category.id}
              href={`/catalog/${category.slug}`}
              aria-current={isActive ? 'page' : undefined}
              className={`${itemClassName} ${
                isActive
                  ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]'
                  : 'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)]'
              }`}
            >
              {getLocalizedText(category.titleRu, category.titleUz, category.titleEn)}
            </Link>
          );
        })}
      </nav>

      {children.length > 0 ? (
        <nav className={railClassName} aria-label={getLocalizedText(activeParent!.titleRu, activeParent!.titleUz, activeParent!.titleEn)}>
          {children.map((category) => {
            const isActive = activeCategory?.id === category.id;
            return (
              <Link
                key={category.id}
                href={`/catalog/${category.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={`${itemClassName} min-h-10 px-3 text-xs ${
                  isActive
                    ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'
                    : 'border-[var(--sp-line)] bg-[var(--sp-surface-inset)] text-[var(--sp-ink-secondary)]'
                }`}
              >
                {getLocalizedText(category.titleRu, category.titleUz, category.titleEn)}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

export function CatalogListing({ activeCategorySlug }: CatalogListingProps) {
  const { t, getLocalizedText, language } = useLanguage();
  const copy = copyByLanguage[language];
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [inStockOnly, setInStockOnly] = useState(false);
  const [ownProductionOnly, setOwnProductionOnly] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
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
  }, [loadAttempt]);

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

  const parentCategory = useMemo(
    () => (currentCategory?.parentId ? categories.find((c) => c.id === currentCategory.parentId) ?? null : null),
    [categories, currentCategory],
  );

  const parentTitle = parentCategory
    ? getLocalizedText(parentCategory.titleRu, parentCategory.titleUz, parentCategory.titleEn)
    : copy.catalog;

  const scopedProducts = useMemo(() => {
    if (!currentCategory) return products;
    const childIds = categories
      .filter((category) => category.parentId === currentCategory.id)
      .map((category) => category.id);
    const categoryIds = new Set([currentCategory.id, ...childIds]);
    return products.filter((product) => categoryIds.has(product.categoryId));
  }, [categories, currentCategory, products]);

  const filteredProducts = useMemo(() => {
    return scopedProducts
      .filter((product) => {
        if (inStockOnly && product.stockStatus !== 'in_stock') return false;
        if (ownProductionOnly && !product.ownProduction) return false;
        return Object.entries(selectedFilters).every(([key, values]) => {
          if (values.length === 0) return true;
          const attributeValue = product.attributes[key];
          if (attributeValue === undefined || attributeValue === null) return false;
          const comparableValues = Array.isArray(attributeValue)
            ? attributeValue.map(String)
            : [String(attributeValue)];
          return values.some((value) => comparableValues.some((candidate) => candidate.includes(value)));
        });
      })
      .sort((left, right) => {
        if (sortBy === 'newest') return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        if (sortBy === 'name') {
          const leftTitle = getLocalizedText(left.titleRu, left.titleUz, left.titleEn);
          const rightTitle = getLocalizedText(right.titleRu, right.titleUz, right.titleEn);
          return leftTitle.localeCompare(rightTitle, language);
        }
        if (sortBy === 'price_asc') return (left.price ?? Number.POSITIVE_INFINITY) - (right.price ?? Number.POSITIVE_INFINITY);
        if (sortBy === 'price_desc') return (right.price ?? 0) - (left.price ?? 0);
        return right.sortOrder - left.sortOrder;
      });
  }, [getLocalizedText, inStockOnly, language, ownProductionOnly, scopedProducts, selectedFilters, sortBy]);

  const activeFilterCount =
    Number(inStockOnly) +
    Number(ownProductionOnly) +
    Object.values(selectedFilters).reduce((total, values) => total + values.length, 0);
  const categoryTitle = currentCategory
    ? getLocalizedText(currentCategory.titleRu, currentCategory.titleUz, currentCategory.titleEn)
    : copy.catalog;
  const categoryDescription = currentCategory
    ? getLocalizedText(currentCategory.descriptionRu, currentCategory.descriptionUz, currentCategory.descriptionEn)
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
      <div className="mx-auto w-full max-w-7xl px-4">
        {/* Desktop Breadcrumb */}
        <nav className="mb-6 hidden items-center gap-2 text-xs font-medium text-[var(--sp-ink-tertiary)] md:flex" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-[var(--sp-brand)]">{t('home')}</Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <Link href="/catalog" className="transition-colors hover:text-[var(--sp-brand)]">{t('catalog')}</Link>
          {parentCategory ? (
            <>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <Link href={`/catalog/${parentCategory.slug}`} className="transition-colors hover:text-[var(--sp-brand)]">
                {parentTitle}
              </Link>
            </>
          ) : null}
          {currentCategory ? (
            <>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span className="font-semibold text-[var(--sp-ink)]">{categoryTitle}</span>
            </>
          ) : null}
        </nav>

        <div className="mb-4 md:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {currentCategory ? (
              <Link
                href={parentCategory ? `/catalog/${parentCategory.slug}` : '/catalog'}
                className="flex size-10 shrink-0 items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink)] shadow-xs transition-all hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] active:scale-95 md:hidden"
                aria-label={copy.back}
                title={copy.back}
              >
                <ChevronLeft className="size-5 text-[var(--sp-brand)]" aria-hidden="true" />
              </Link>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] sm:text-3xl truncate">
                {categoryTitle}
              </h1>
            </div>
          </div>
          {categoryDescription ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--sp-ink-secondary)]">{categoryDescription}</p> : null}
          <p className="mt-1.5 text-xs font-medium text-[var(--sp-ink-secondary)]">
            {t('foundItems')} <span className="font-semibold tabular-nums text-[var(--sp-brand)]">{filteredProducts.length}</span>
          </p>
        </div>

        <MobileCategoryRail categories={categories} activeCategory={currentCategory} />

        <div className="sticky top-[56px] z-20 -mx-4 mt-3 border-y border-[var(--sp-line)] bg-[color-mix(in_srgb,var(--sp-canvas)_96%,transparent)] px-4 py-2.5 backdrop-blur-xl md:static md:mx-0 md:mt-6 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
          <div className="flex items-center gap-2 md:justify-end">
            <button
              ref={filterTriggerRef}
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              aria-haspopup="dialog"
              className="relative flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 text-sm font-semibold text-[var(--sp-ink)] shadow-[var(--sp-shadow-soft)] lg:hidden"
            >
              <Filter className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
              <span>{copy.filters}</span>
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

            <div className="hidden h-11 items-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-1 md:flex">
              <button type="button" onClick={() => setViewMode('grid')} aria-label={copy.grid} aria-pressed={viewMode === 'grid'} className={`flex size-9 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control-inner)] transition-colors ${viewMode === 'grid' ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-inset)]'}`}>
                <Grid2X2 className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setViewMode('list')} aria-label={copy.list} aria-pressed={viewMode === 'list'} className={`flex size-9 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control-inner)] transition-colors ${viewMode === 'list' ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-inset)]'}`}>
                <List className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-8 lg:grid-cols-12">
          <aside className="hidden space-y-6 lg:col-span-3 lg:block">
            <CategorySidebar categories={categories} activeSlug={activeCategorySlug} />
            <FilterSidebar
              attributes={attributes}
              products={scopedProducts}
              selectedFilters={selectedFilters}
              onFilterChange={(key, values) => setSelectedFilters((current) => ({ ...current, [key]: values }))}
              inStockOnly={inStockOnly}
              onInStockChange={setInStockOnly}
              ownProductionOnly={ownProductionOnly}
              onOwnProductionChange={setOwnProductionOnly}
              onReset={resetFilters}
            />
          </aside>

          <div className="min-w-0 lg:col-span-9">
            {activeFilterCount > 0 ? (
              <div className="mb-4 flex items-center gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-3 py-2.5">
                <span className="min-w-0 flex-1 text-xs font-medium text-[var(--sp-ink-secondary)]">{copy.active}: {activeFilterCount}</span>
                <button type="button" onClick={resetFilters} className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[var(--sp-radius-control-inner)] px-2 text-xs font-semibold text-[var(--sp-brand)] transition-colors hover:bg-[var(--sp-brand-soft)]">
                  <RotateCcw className="size-3.5" aria-hidden="true" />{copy.resetAll}
                </button>
              </div>
            ) : null}

            {loadState === 'loading' ? <CatalogSkeleton /> : null}

            {loadState === 'error' ? (
              <div className="mx-auto max-w-md py-12 text-center" role="alert">
                <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-[var(--sp-brand)]"><RefreshCw className="size-6" aria-hidden="true" /></div>
                <h2 className="mt-5 font-extended text-xl font-bold text-[var(--sp-ink)]">{copy.error}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--sp-ink-secondary)]">{copy.errorText}</p>
                <button type="button" onClick={() => { setLoadState('loading'); setLoadAttempt((current) => current + 1); }} className="mt-5 min-h-11 cursor-pointer rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)]">{copy.retry}</button>
              </div>
            ) : null}

            {loadState === 'ready' && filteredProducts.length === 0 ? (
              <div className="mx-auto max-w-md py-12 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-[var(--sp-ink-muted)]"><Search className="size-6" aria-hidden="true" /></div>
                <h2 className="mt-5 font-extended text-xl font-bold text-[var(--sp-ink)]">{copy.empty}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--sp-ink-secondary)]">{copy.emptyText}</p>
                {activeFilterCount > 0 ? <button type="button" onClick={resetFilters} className="mt-5 min-h-11 cursor-pointer rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)]">{copy.resetAll}</button> : null}
              </div>
            ) : null}

            {loadState === 'ready' && filteredProducts.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3' : 'space-y-4'}>
                {filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} viewMode={viewMode} eagerImage={index < 2} />)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isMobileFilterOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={copy.closeFilters} onClick={() => setIsMobileFilterOpen(false)} className="absolute inset-0 cursor-pointer bg-black/45" />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            onKeyDown={handleSheetKeyDown}
            className="absolute inset-x-0 bottom-0 flex max-h-[min(84dvh,760px)] flex-col rounded-t-[var(--sp-radius-card)] bg-[var(--sp-surface)] shadow-[0_-18px_48px_rgb(0_0_0/18%)]"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--sp-line)] px-4 py-3">
              <div>
                <h2 id="mobile-filter-title" className="font-extended text-lg font-bold text-[var(--sp-ink)]">{copy.filters}</h2>
                <p className="mt-0.5 text-xs text-[var(--sp-ink-secondary)]">{t('foundItems')} {filteredProducts.length}</p>
              </div>
              <button ref={filterCloseRef} type="button" onClick={() => setIsMobileFilterOpen(false)} aria-label={copy.closeFilters} className="sp-icon-button size-11 shrink-0"><X className="size-5" aria-hidden="true" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <FilterSidebar
                embedded
                hideHeader
                attributes={attributes}
                products={scopedProducts}
                selectedFilters={selectedFilters}
                onFilterChange={(key, values) => setSelectedFilters((current) => ({ ...current, [key]: values }))}
                inStockOnly={inStockOnly}
                onInStockChange={setInStockOnly}
                ownProductionOnly={ownProductionOnly}
                onOwnProductionChange={setOwnProductionOnly}
                onReset={resetFilters}
              />
            </div>
            <div className="flex shrink-0 gap-2 border-t border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {activeFilterCount > 0 ? <button type="button" onClick={resetFilters} className="min-h-12 cursor-pointer rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-4 text-sm font-semibold text-[var(--sp-ink)]">{copy.resetAll}</button> : null}
              <button type="button" onClick={() => setIsMobileFilterOpen(false)} className="min-h-12 flex-1 cursor-pointer rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)]">{copy.show} ({filteredProducts.length})</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
