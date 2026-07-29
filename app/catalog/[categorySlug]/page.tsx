'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CategorySidebar } from '@/components/catalog/CategorySidebar';
import { FilterSidebar } from '@/components/catalog/FilterSidebar';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { Product, Category, Attribute } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Grid, List, Filter, ChevronRight, RotateCcw, X } from 'lucide-react';

export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = use(params);
  const { t, getLocalizedText } = useLanguage();

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
    ? getLocalizedText(currentCategory.titleRu, currentCategory.titleUz)
    : 'Каталог';

  const categoryDesc = currentCategory
    ? getLocalizedText(currentCategory.descriptionRu, currentCategory.descriptionUz)
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
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-xs"
              >
                <Filter className="w-4 h-4 text-[#006F3C]" />
                <span>Фильтры</span>
              </button>

              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-2xs"
              >
                <Filter className="w-4 h-4 text-[#006F3C]" />
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

              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#006F3C] text-white'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#006F3C] text-white'
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
                    В этой категории пока нет подходящих товаров
                  </h3>
                  <button
                    onClick={handleResetFilters}
                    className="px-5 py-2.5 bg-[#006F3C] text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Сбросить фильтры
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
              <h3 className="font-bold text-lg text-[#18231E]">Фильтры категории</h3>
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
              className="w-full py-3 bg-[#006F3C] text-white font-bold rounded-xl text-xs shadow-md"
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
