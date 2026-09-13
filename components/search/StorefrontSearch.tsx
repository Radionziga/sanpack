'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Search, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getCategoryTitle } from '@/lib/i18n/categoryText';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CatalogListing } from '@/components/catalog/CatalogListing';
import type { Attribute, Category, Product } from '@/types';
import { getCategoryLabel, getCategoryPath, getVisibleCategories } from '@/lib/catalog/categoryHierarchy';

const copyByLanguage = {
  ru: {
    back: 'Назад',
    title: 'Поиск по каталогу',
    placeholder: 'Название товара, категория или артикул',
    submit: 'Найти',
    clear: 'Очистить поиск',
    popular: 'Часто ищут',
    categories: 'Категории товаров',
    recommended: 'Можно начать с этого',
    allCatalog: 'Весь каталог',
    loading: 'Загружаем каталог…',
    error: 'Не удалось загрузить поиск',
    errorHint: 'Проверьте соединение и попробуйте ещё раз.',
    retry: 'Повторить',
  },
  uz: {
    back: 'Orqaga',
    title: 'Katalog bo‘yicha qidirish',
    placeholder: 'Mahsulot nomi, kategoriya yoki artikul',
    submit: 'Qidirish',
    clear: 'Qidiruvni tozalash',
    popular: 'Ko‘p qidiriladiganlar',
    categories: 'Mahsulot kategoriyalari',
    recommended: 'Shulardan boshlashingiz mumkin',
    allCatalog: 'Barcha mahsulotlar',
    loading: 'Katalog yuklanmoqda…', error: 'Qidiruvni yuklab bo‘lmadi', errorHint: 'Internet aloqasini tekshirib, qayta urinib ko‘ring.', retry: 'Qayta urinish',
  },
  en: {
    back: 'Back',
    title: 'Search the catalog',
    placeholder: 'Product name, category, or SKU',
    submit: 'Search',
    clear: 'Clear search',
    popular: 'Popular searches',
    categories: 'Product categories',
    recommended: 'A good place to start',
    allCatalog: 'Full catalog',
    loading: 'Loading catalog…', error: 'Search could not be loaded', errorHint: 'Check your connection and try again.', retry: 'Try again',
  },
  zh: {
    back: '返回',
    title: '搜索商品目录',
    placeholder: '商品名称、分类或货号',
    submit: '搜索',
    clear: '清除搜索',
    popular: '热门搜索',
    categories: '商品分类',
    recommended: '为您推荐',
    allCatalog: '全部商品',
    loading: '正在加载商品目录…', error: '搜索加载失败', errorHint: '请检查网络连接后重试。', retry: '重试',
  },
} as const;

const popularByLanguage = {
  ru: ['Мешки для мусора', 'Контейнеры', 'Салфетки', 'Перчатки', 'Сыры', 'Зелень'],
  uz: ['Chiqindi qoplari', 'Konteynerlar', 'Salfetkalar', 'Qo‘lqoplar', 'Pishloqlar', 'Ko‘katlar'],
  en: ['Trash bags', 'Containers', 'Napkins', 'Gloves', 'Cheese', 'Greens'],
  zh: ['垃圾袋', '餐盒', '餐巾纸', '手套', '奶酪', '新鲜蔬菜'],
} as const;

export function StorefrontSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const { language, getLocalizedText } = useLanguage();
  const copy = copyByLanguage[language];
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([PublicRepository.getProducts(), PublicRepository.getCategories(), PublicRepository.getAttributes()])
      .then(([nextProducts, nextCategories, nextAttributes]) => {
        if (cancelled) return;
        setProducts(nextProducts.filter((product) => product.status === 'published'));
        setCategories(getVisibleCategories(nextCategories));
        setAttributes(nextAttributes);
        setLoadState('ready');
      })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [loadAttempt]);

  useEffect(() => {
    if (loadState !== 'ready' || !initialQuery.trim()) return;
    const key = `sanpack-search-state-v1:${language}:${initialQuery.trim()}`;
    try {
      const state = JSON.parse(window.sessionStorage.getItem(key) || 'null') as { href?: string; scrollY?: number } | null;
      if (!state || state.href !== `${window.location.pathname}${window.location.search}` || !Number.isFinite(state.scrollY)) return;
      const frame = window.requestAnimationFrame(() => window.scrollTo({ top: state.scrollY, behavior: 'instant' }));
      return () => window.cancelAnimationFrame(frame);
    } catch {
      return;
    }
  }, [initialQuery, language, loadState]);

  const featuredCategories = useMemo(
    () => categories
      .filter((category) => Boolean(category.parentId))
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .slice(0, 8),
    [categories],
  );
  const suggestedProducts = useMemo(
    () => products.slice().sort((left, right) => right.sortOrder - left.sortOrder).slice(0, 6),
    [products],
  );

  function runSearch(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      router.replace('/search');
      return;
    }
    router.push({ pathname: '/search', query: { q: normalized } });
  }

  function rememberSearchPosition() {
    if (!initialQuery.trim()) return;
    window.sessionStorage.setItem(`sanpack-search-state-v1:${language}:${initialQuery.trim()}`, JSON.stringify({
      href: `${window.location.pathname}${window.location.search}`,
      scrollY: window.scrollY,
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(query);
  }

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 pb-4 pt-5 md:pb-6 md:pt-8">
        <Link href="/catalog" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--sp-brand)]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.back}
        </Link>
        <h1 className="mt-2 font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] sm:text-3xl">{copy.title}</h1>

        <form onSubmit={submit} role="search" className="mt-5 flex gap-2">
          <label htmlFor="storefront-search-page" className="sr-only">{copy.title}</label>
          <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-4 transition-[border-color,box-shadow] focus-within:border-[var(--sp-brand)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--sp-brand)_16%,transparent)] md:min-h-14">
            <Search className="size-5 shrink-0 text-[var(--sp-ink-muted)]" aria-hidden="true" />
            <input
              id="storefront-search-page"
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.placeholder}
              className="min-w-0 flex-1 bg-transparent py-3 text-base text-[var(--sp-ink)] outline-none placeholder:text-[var(--sp-ink-muted)]"
            />
            {query ? (
              <button type="button" onClick={() => { setQuery(''); router.replace('/search'); }} aria-label={copy.clear} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control-inner)] text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface)]">
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <button type="submit" className="hidden min-h-14 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-6 text-sm font-semibold text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-deep)] sm:flex">{copy.submit}</button>
        </form>
      </main>

      {loadState === 'loading' ? (
        <main className="mx-auto min-h-[36vh] w-full max-w-7xl flex-1 px-4 py-10" aria-busy="true" aria-live="polite">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)] motion-reduce:animate-none" />)}
          </div>
          <span className="sr-only">{copy.loading}</span>
        </main>
      ) : null}

      {loadState === 'error' ? (
        <main className="mx-auto flex min-h-[36vh] w-full max-w-7xl flex-1 items-start justify-center px-4 py-10">
          <section className="max-w-md text-center" role="alert">
            <RefreshCw className="mx-auto size-8 text-[var(--sp-brand)]" aria-hidden="true" />
            <h2 className="mt-4 font-extended text-xl font-bold text-[var(--sp-ink)]">{copy.error}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.errorHint}</p>
            <button type="button" onClick={() => { setLoadState('loading'); setLoadAttempt((value) => value + 1); }} className="mt-5 min-h-11 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-deep)]">{copy.retry}</button>
          </section>
        </main>
      ) : null}

      {loadState === 'ready' && initialQuery.trim() ? (
        <CatalogListing key={initialQuery} searchQuery={initialQuery} initialProducts={products} initialCategories={categories} initialAttributes={attributes} onProductNavigate={rememberSearchPosition} />
      ) : loadState === 'ready' ? (
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12">
          <section aria-labelledby="popular-searches-heading">
            <h2 id="popular-searches-heading" className="text-sm font-bold text-[var(--sp-ink)]">{copy.popular}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {popularByLanguage[language].map((term) => (
                <button key={term} type="button" onClick={() => { setQuery(term); runSearch(term); }} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-4 text-sm font-medium text-[var(--sp-ink)] transition-colors hover:bg-[var(--sp-brand-soft)]">
                  <Search className="size-4 text-[var(--sp-ink-muted)]" aria-hidden="true" />{term}
                </button>
              ))}
            </div>
          </section>

          {featuredCategories.length > 0 ? (
            <section className="mt-8" aria-labelledby="search-categories-heading">
              <div className="flex items-end justify-between gap-4">
                <h2 id="search-categories-heading" className="font-extended text-xl font-bold text-[var(--sp-ink)]">{copy.categories}</h2>
                <Link href="/catalog" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[var(--sp-brand)]">{copy.allCatalog}<ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
                {featuredCategories.map((category) => (
                  <Link key={category.id} href={getCategoryPath(category, categories)} title={getCategoryLabel(category.id, categories)} className="flex min-h-20 items-end rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)] p-3 text-sm font-semibold leading-snug text-[var(--sp-ink)] transition-colors hover:bg-[var(--sp-brand-soft)]">
                    {getCategoryTitle(category, language, getLocalizedText(category.titleRu, category.titleUz, category.titleEn, category.titleZh))}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {suggestedProducts.length > 0 ? (
            <section className="mt-9" aria-labelledby="suggested-products-heading">
              <h2 id="suggested-products-heading" className="font-extended text-xl font-bold text-[var(--sp-ink)]">{copy.recommended}</h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                {suggestedProducts.map((product, index) => <ProductCard key={product.id} product={product} eagerImage={index < 2} />)}
              </div>
            </section>
          ) : null}
        </main>
      ) : null}
    </>
  );
}
