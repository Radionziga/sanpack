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
  const { t, getLocalizedText } = useLanguage();

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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
            <Link href="/" className="hover:text-[#0F6E43] transition-colors">
              {t('home')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#222B35] font-bold">{t('catalog')}</span>
          </nav>

          {/* Header Title Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#222B35] tracking-tight">
                Каталог продукции SANPACK
              </h1>
              <p className="text-xs text-[#5C6A75] mt-1">
                {t('foundItems')} <span className="font-bold text-[#0F6E43]">{filteredProducts.length}</span>
              </p>
            </div>

            {/* Sorting & View Mode Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-2xs"
              >
                <Filter className="w-4 h-4 text-[#0F6E43]" />
                <span>Фильтры</span>
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

              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#0F6E43] text-white'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title={t('viewGrid')}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#0F6E43] text-white'
                      : 'text-slate-400 hover:text-slate-700'
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
                <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-400 font-medium">Активные фильтры:</span>
                  {inStockOnly && (
                    <span className="bg-[#EAF5EF] text-[#0F6E43] text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-[#0F6E43]/20">
                      Только в наличии
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setInStockOnly(false)} />
                    </span>
                  )}
                  {ownProductionOnly && (
                    <span className="bg-[#EAF5EF] text-[#0F6E43] text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-[#0F6E43]/20">
                      Собственное производство
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setOwnProductionOnly(false)} />
                    </span>
                  )}
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-rose-600 hover:underline ml-auto font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Сбросить все
                  </button>
                </div>
              )}

              {/* Products Display */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 bg-slate-200 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl font-bold">
                    🔍
                  </div>
                  <h3 className="text-lg font-bold text-[#222B35]">
                    Товары не найдены
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Попробуйте измените параметры фильтрации или выберите другую категорию.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="px-5 py-2.5 bg-[#0F6E43] text-white font-bold text-xs rounded-xl shadow-2xs"
                  >
                    Сбросить все фильтры
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
          <div className="fixed top-0 right-0 w-4/5 max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg text-[#222B35]">Фильтры каталога</h3>
              <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 text-slate-400">
                <X className="w-6 h-6" />
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
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full py-3 bg-[#0F6E43] text-white font-bold rounded-xl text-xs"
            >
              Показать результаты ({filteredProducts.length})
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
