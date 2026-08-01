'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDownAZ,
  ArrowRight,
  Boxes,
  Download,
  PackageSearch,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import type { Category, Product } from '@/types';

type SortMode = 'recommended' | 'newest' | 'name';

interface CatalogHomeProps {
  products: Product[];
  categories: Category[];
  catalogPdfUrl?: string;
  dataUnavailable?: boolean;
}

export function CatalogHome({
  products,
  categories,
  catalogPdfUrl,
  dataUnavailable = false,
}: CatalogHomeProps) {
  const t = useTranslations('homeCatalog');
  const { getLocalizedText } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          (categoryCounts.get(category.id) ?? 0) > 0
      ),
    [categories, categoryCounts]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return products
      .filter((product) => {
        if (activeCategory !== 'all' && product.categoryId !== activeCategory) {
          return false;
        }
        if (!normalizedQuery) return true;
        return [
          product.titleRu,
          product.titleUz,
          product.titleEn,
          product.sku,
          product.shortDescriptionRu,
          product.shortDescriptionUz,
          product.shortDescriptionEn,
        ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sortMode === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortMode === 'name') {
          return getLocalizedText(
            a.titleRu,
            a.titleUz,
            a.titleEn
          ).localeCompare(
            getLocalizedText(b.titleRu, b.titleUz, b.titleEn)
          );
        }
        return b.sortOrder - a.sortOrder;
      });
  }, [activeCategory, getLocalizedText, products, query, sortMode]);

  const activeCategoryTitle =
    activeCategory === 'all'
      ? t('allProducts')
      : getLocalizedText(
          categories.find((category) => category.id === activeCategory)?.titleRu,
          categories.find((category) => category.id === activeCategory)?.titleUz,
          categories.find((category) => category.id === activeCategory)?.titleEn
        );

  return (
    <>
      <section className="border-b border-[#DCE5DF] bg-[#EDF3EF]">
        <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
          <div className="grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 font-compact text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F6E43]">
                <span className="h-px w-7 bg-[#0F6E43]" />
                {t('eyebrow')}
              </div>
              <h1 className="font-extended text-3xl font-bold leading-[1.08] tracking-[-0.035em] text-[#14231C] sm:text-4xl lg:text-[42px]">
                {t('title')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5D6C64] md:text-[15px]">
                {t('description')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {catalogPdfUrl && (
                <a
                  href={catalogPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#BFCBC4] bg-white px-4 font-compact text-xs font-bold text-[#14231C] transition-colors hover:border-[#0F6E43] hover:text-[#0F6E43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E43]"
                >
                  <Download className="h-4 w-4" />
                  {t('downloadCatalog')}
                </a>
              )}
              <Link
                href="/request"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0F6E43] px-4 font-compact text-xs font-bold text-white transition-colors hover:bg-[#0A5734] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E43]"
              >
                {t('requestQuote')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-2 rounded-xl border border-[#CCD8D1] bg-white p-2 shadow-[0_10px_35px_rgba(20,35,28,0.06)] md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <span className="sr-only">{t('searchLabel')}</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#718078]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="h-12 w-full rounded-lg border-0 bg-[#F4F7F5] pl-12 pr-11 text-sm text-[#14231C] outline-none ring-[#0F6E43] placeholder:text-[#7B8982] focus:ring-2"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#718078] hover:bg-white hover:text-[#14231C] focus-visible:outline-2 focus-visible:outline-[#0F6E43]"
                  aria-label={t('clearSearch')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <Link
              href="/catalog"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#DCE9AF] px-5 font-compact text-xs font-bold text-[#173A28] transition-colors hover:bg-[#D1E19B] focus-visible:outline-2 focus-visible:outline-[#0F6E43]"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('advancedFilters')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 md:py-9">
        {visibleCategories.length > 0 && (
          <div className="border-b border-[#DCE5DF] pb-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-extended text-lg font-bold text-[#14231C] md:text-xl">
                  {t('categoriesTitle')}
                </h2>
                <p className="mt-1 text-xs text-[#6C7A73]">{t('categoriesHint')}</p>
              </div>
              <Link
                href="/catalog"
                className="hidden items-center gap-1 font-compact text-xs font-bold text-[#0F6E43] hover:text-[#0A5734] sm:flex"
              >
                {t('fullCatalog')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`min-w-[148px] rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#0F6E43] ${
                  activeCategory === 'all'
                    ? 'border-[#0F6E43] bg-[#0F6E43] text-white'
                    : 'border-[#D5DFD9] bg-white text-[#14231C] hover:border-[#93AA9D]'
                }`}
              >
                <Boxes className="mb-4 h-5 w-5" />
                <span className="block font-compact text-xs font-bold">{t('allProducts')}</span>
                <span className={`mt-1 block text-[11px] ${activeCategory === 'all' ? 'text-white/70' : 'text-[#74827B]'}`}>
                  {t('itemsCount', { count: products.length })}
                </span>
              </button>

              {visibleCategories.map((category) => {
                const selected = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={`min-w-[180px] max-w-[220px] rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#0F6E43] ${
                      selected
                        ? 'border-[#0F6E43] bg-[#0F6E43] text-white'
                        : 'border-[#D5DFD9] bg-white text-[#14231C] hover:border-[#93AA9D]'
                    }`}
                  >
                    <PackageSearch className="mb-4 h-5 w-5" />
                    <span className="block truncate font-compact text-xs font-bold">
                      {getLocalizedText(category.titleRu, category.titleUz, category.titleEn)}
                    </span>
                    <span className={`mt-1 block text-[11px] ${selected ? 'text-white/70' : 'text-[#74827B]'}`}>
                      {t('itemsCount', { count: categoryCounts.get(category.id) ?? 0 })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-7">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[#0F6E43]">
                <Sparkles className="h-4 w-4" />
                <span className="font-compact text-[11px] font-bold uppercase tracking-[0.1em]">
                  {t('assortment')}
                </span>
              </div>
              <h2 className="font-extended text-2xl font-bold tracking-[-0.02em] text-[#14231C]">
                {activeCategoryTitle}
              </h2>
              <p className="mt-1 text-xs text-[#6C7A73]">
                {t('shownCount', { count: filteredProducts.length })}
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#65736C]">
              <ArrowDownAZ className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{t('sortLabel')}</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-10 rounded-lg border border-[#D1DCD6] bg-white px-3 font-compact text-xs font-bold text-[#26362E] outline-none focus:border-[#0F6E43] focus:ring-2 focus:ring-[#0F6E43]/15"
              >
                <option value="recommended">{t('sortRecommended')}</option>
                <option value="newest">{t('sortNewest')}</option>
                <option value="name">{t('sortName')}</option>
              </select>
            </label>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#BFCBC4] bg-white px-6 py-14 text-center">
              <PackageSearch className="mx-auto h-9 w-9 text-[#829188]" />
              <h3 className="mt-4 font-extended text-lg font-bold text-[#14231C]">
                {dataUnavailable ? t('errorTitle') : products.length === 0 ? t('emptyCatalogTitle') : t('nothingFoundTitle')}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6C7A73]">
                {dataUnavailable ? t('errorDescription') : products.length === 0 ? t('emptyCatalogDescription') : t('nothingFoundDescription')}
              </p>
              {(query || activeCategory !== 'all') && products.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setActiveCategory('all');
                  }}
                  className="mt-5 rounded-lg bg-[#0F6E43] px-4 py-2.5 font-compact text-xs font-bold text-white hover:bg-[#0A5734]"
                >
                  {t('resetFilters')}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
