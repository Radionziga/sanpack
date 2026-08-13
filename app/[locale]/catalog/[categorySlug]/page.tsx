'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
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

export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = use(params);
  const { t, getLocalizedText, language } = useLanguage();
  const copy = {
    ru: { catalog: 'Каталог', filters: 'Фильтры', empty: 'В этой категории пока нет подходящих товаров', reset: 'Сбросить фильтры', show: 'Показать результаты' },
    uz: { catalog: 'Katalog', filters: 'Filtrlar', empty: 'Bu kategoriyada mos mahsulotlar topilmadi', reset: 'Filtrlarni tozalash', show: 'Natijalarni ko‘rsatish' },
    en: { catalog: 'Catalog', filters: 'Filters', empty: 'There are no matching products in this category', reset: 'Reset filters', show: 'Show results' },
  }[language];

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
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
    async function loadCategoryData() {
      const [p, c, a] = await Promise.all([
        SanpackRepository.getProducts(),
        SanpackRepository.getCategories(),
        SanpackRepository.getAttributes(),
      ]);

      const cat = c.find((item) => item.slug === categorySlug);
      setCurrentCategory(cat || null);
      setCategories(c);
      setAttributes(a);

      if (cat) {
        // Include child category IDs if currentCategory is a parent
        const childCatIds = c.filter((sub) => sub.parentId === cat.id).map((sub) => sub.id);
        const validCatIds = [cat.id, ...childCatIds];
        const categoryProducts = p.filter((prod) => validCatIds.includes(prod.categoryId));
        setProducts(categoryProducts);
      } else {
        setProducts(p);
      }

      setLoading(false);
    }
    loadCategoryData();
  }, [categorySlug]);

  const handleFilterChange = (key: string, values: string[]) => {
    setSelectedFilters((prev) => ({ ...prev, [key]: values }));
  };

  const handleResetFilters = () => {
    setSelectedFilters({});
    setInStockOnly(false);
    setOwnProductionOnly(false);
  };

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

  const categoryTitle = currentCategory
    ? getLocalizedText(currentCategory.titleRu, currentCategory.titleUz, currentCategory.titleEn)
    : copy.catalog;

  const categoryDesc = currentCategory
    ? getLocalizedText(currentCategory.descriptionRu, currentCategory.descriptionUz, currentCategory.descriptionEn)
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Link href="/" className="hover:text-[#006F3C] transition-colors">
              {t('home')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/catalog" className="hover:text-[#006F3C] transition-colors">
              {t('catalog')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#18231E] font-bold">{categoryTitle}</span>
          </nav>

          {/* Header Title Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#18231E]">
                {categoryTitle}
              </h1>
              {categoryDesc && (
                <p className="text-xs text-[#68736D] mt-1 max-w-2xl">{categoryDesc}</p>
              )}
              <p className="text-xs font-bold text-[#006F3C] mt-2">
                {t('foundItems')} {filteredProducts.length}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 text-xs font-semibold text-[var(--sp-ink-secondary)] shadow-[var(--sp-shadow-soft)] lg:hidden"
              >
                <Filter className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
                <span>{copy.filters}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">{t('sortBy')}</span>
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

              <div className="flex h-11 items-center border border-[var(--sp-line)] bg-[var(--sp-surface)] p-1 shadow-xs rounded-[var(--sp-radius-control)]">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--sp-radius-control-inner)] transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--sp-radius-control-inner)] transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="hidden lg:block lg:col-span-3 space-y-6">
              <CategorySidebar categories={categories} activeSlug={categorySlug} />

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

            <div className="lg:col-span-9 space-y-6">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 bg-slate-200 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                  <h3 className="text-lg font-bold text-[#18231E]">
                    {copy.empty}
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 py-2.5 text-xs font-semibold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)]"
                  >
                    {copy.reset}
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
              <h3 className="text-lg font-bold text-[var(--sp-ink)]">{copy.filters}</h3>
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
              className="w-full rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] py-3 text-xs font-semibold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)]"
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
