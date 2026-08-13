'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CategorySidebar } from '@/components/catalog/CategorySidebar';
import { FilterSidebar } from '@/components/catalog/FilterSidebar';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PublicSanpackRepository as SanpackRepository } from '@/lib/repositories/publicRepository';
import { Product, Category, Attribute } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Grid, List, Filter, ChevronRight, RotateCcw, X } from 'lucide-react';

export default function CatalogPage() {
  const { t, getLocalizedText, language } = useLanguage();
  const copy = {
    ru: {
      active: 'Активные фильтры',
      stock: 'Только в наличии',
      own: 'Собственное производство',
      resetAll: 'Сбросить все',
      empty: 'Товары не найдены',
      emptyText: 'Измените параметры фильтрации или выберите другую категорию.',
      show: 'Показать результаты',
    },
    uz: {
      active: 'Faol filtrlar',
      stock: 'Faqat mavjud',
      own: 'O‘z ishlab chiqarishimiz',
      resetAll: 'Hammasini tozalash',
      empty: 'Mahsulotlar topilmadi',
      emptyText: 'Filtrlarni o‘zgartiring yoki boshqa kategoriyani tanlang.',
      show: 'Natijalarni ko‘rsatish',
    },
    en: {
      active: 'Active filters',
      stock: 'In stock only',
      own: 'Own production',
      resetAll: 'Reset all',
      empty: 'No products found',
      emptyText: 'Change the filters or select another category.',
      show: 'Show results',
    },
  }[language];

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);

  // Controls
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filters state
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [inStockOnly, setInStockOnly] = useState(false);
  const [ownProductionOnly, setOwnProductionOnly] = useState(false);

  useEffect(() => {
    async function loadCatalogData() {
      const [p, c, a] = await Promise.all([
        SanpackRepository.getProducts(),
        SanpackRepository.getCategories(),
        SanpackRepository.getAttributes(),
      ]);
      setProducts(p);
      setCategories(c);
      setAttributes(a);
      setLoading(false);
    }
    loadCatalogData();
  }, []);

  const handleFilterChange = (key: string, values: string[]) => {
    setSelectedFilters((prev) => ({ ...prev, [key]: values }));
  };

  const handleResetFilters = () => {
    setSelectedFilters({});
    setInStockOnly(false);
    setOwnProductionOnly(false);
  };

  // Filtered & Sorted Products computation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (inStockOnly && p.stockStatus !== 'in_stock') return false;
      if (ownProductionOnly && !p.ownProduction) return false;

      for (const [key, vals] of Object.entries(selectedFilters)) {
        if (vals.length === 0) continue;
        const attrVal = p.attributes[key];
        if (!attrVal) return false;

        const valStr = String(attrVal);
        if (!vals.some((v) => valStr.includes(v))) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'name') return a.titleRu.localeCompare(b.titleRu);
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      return b.sortOrder - a.sortOrder;
    });
  }, [products, selectedFilters, inStockOnly, ownProductionOnly, sortBy]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-[var(--sp-ink-tertiary)]">
            <Link href="/" className="transition-colors hover:text-[var(--sp-brand)]">
              {t('home')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-[var(--sp-ink)]">{t('catalog')}</span>
          </nav>

          {/* Header Title Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--sp-ink)] sm:text-3xl">
                {t('catalog')} SANPACK
              </h1>
              <p className="mt-1 text-xs text-[var(--sp-ink-secondary)]">
                {t('foundItems')} <span className="font-semibold tabular-nums text-[var(--sp-brand)]">{filteredProducts.length}</span>
              </p>
            </div>

            {/* Sorting & View Mode Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 text-xs font-semibold text-[var(--sp-ink-secondary)] shadow-[var(--sp-shadow-soft)] lg:hidden"
              >
                <Filter className="size-4 text-[var(--sp-brand)]" />
                <span>{t('filterTitle')}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-medium text-[var(--sp-ink-muted)] sm:inline">{t('sortBy')}</span>
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
                  size="md"
                  variant="default"
                  className="w-48"
                />
              </div>

              <div className="flex h-11 items-center border border-[var(--sp-line)] bg-[var(--sp-surface)] p-1 shadow-2xs rounded-[var(--sp-radius-control)]">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--sp-radius-control-inner)] transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'
                      : 'text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]'
                  }`}
                  title={t('viewGrid')}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--sp-radius-control-inner)] transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'
                      : 'text-[var(--sp-ink-muted)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]'
                  }`}
                  title={t('viewList')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Catalog Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Desktop Sidebars */}
            <aside className="hidden lg:block lg:col-span-3 space-y-6">
              <CategorySidebar categories={categories} />

              <FilterSidebar
                attributes={attributes}
                products={products}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                inStockOnly={inStockOnly}
                onInStockChange={setInStockOnly}
                ownProductionOnly={ownProductionOnly}
                onOwnProductionChange={setOwnProductionOnly}
                onReset={handleResetFilters}
              />
            </aside>

            {/* Main Content Column */}
            <div className="lg:col-span-9 space-y-6">
              {/* Active Filter Chips */}
              {(inStockOnly || ownProductionOnly || Object.values(selectedFilters).some((a) => a.length > 0)) && (
                <div className="flex flex-wrap items-center gap-2 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3">
                  <span className="text-xs font-medium text-[var(--sp-ink-muted)]">{copy.active}:</span>
                  {inStockOnly && (
                    <button type="button" onClick={() => setInStockOnly(false)} aria-label={`${copy.stock}: удалить фильтр`} className="flex items-center gap-1.5 rounded-[var(--sp-radius-control-inner)] border border-[color-mix(in_srgb,var(--sp-brand)_22%,var(--sp-line))] bg-[var(--sp-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--sp-brand)] transition-colors hover:bg-[color-mix(in_srgb,var(--sp-brand)_15%,var(--sp-surface))]">
                      {copy.stock}
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  )}
                  {ownProductionOnly && (
                    <button type="button" onClick={() => setOwnProductionOnly(false)} aria-label={`${copy.own}: удалить фильтр`} className="flex items-center gap-1.5 rounded-[var(--sp-radius-control-inner)] border border-[color-mix(in_srgb,var(--sp-brand)_22%,var(--sp-line))] bg-[var(--sp-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--sp-brand)] transition-colors hover:bg-[color-mix(in_srgb,var(--sp-brand)_15%,var(--sp-surface))]">
                      {copy.own}
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-rose-600 hover:underline ml-auto font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> {copy.resetAll}
                  </button>
                </div>
              )}

              {/* Products Display */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 animate-pulse rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)]" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="space-y-4 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-12 text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-2xl text-[var(--sp-ink-muted)]">
                    🔍
                  </div>
                  <h3 className="text-lg font-bold text-[var(--sp-ink)]">
                    {copy.empty}
                  </h3>
                  <p className="mx-auto max-w-sm text-xs text-[var(--sp-ink-secondary)]">
                    {copy.emptyText}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 py-2.5 text-xs font-semibold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)]"
                  >
                    {copy.resetAll}
                  </button>
                </div>
              ) : (
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                      : 'space-y-4'
                  }
                >
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} viewMode={viewMode} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Filters Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
          <div className="fixed right-0 top-0 h-full w-4/5 max-w-md space-y-6 overflow-y-auto bg-[var(--sp-surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--sp-line)] pb-4">
              <h3 className="text-lg font-bold text-[var(--sp-ink)]">{t('filterTitle')}</h3>
              <button type="button" onClick={() => setIsMobileFilterOpen(false)} className="sp-icon-button size-10" aria-label="Закрыть фильтры">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <FilterSidebar
              attributes={attributes}
              products={products}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              inStockOnly={inStockOnly}
              onInStockChange={setInStockOnly}
              ownProductionOnly={ownProductionOnly}
              onOwnProductionChange={setOwnProductionOnly}
              onReset={handleResetFilters}
            />

            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] py-3 text-xs font-semibold text-[var(--sp-on-brand)]"
            >
              {copy.show} ({filteredProducts.length})
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
