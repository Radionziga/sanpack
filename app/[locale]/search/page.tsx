'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import { Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { ChevronLeft, RefreshCw, Search } from 'lucide-react';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const { t, language } = useLanguage();
  const copy = pageCopy[language].search;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const stateCopy = {
    ru: { back: 'Назад', error: 'Не удалось выполнить поиск', errorText: 'Проверьте соединение и попробуйте ещё раз.', retry: 'Попробовать снова' },
    uz: { back: 'Orqaga', error: 'Qidiruvni bajarib bo‘lmadi', errorText: 'Internet aloqasini tekshirib, qayta urinib ko‘ring.', retry: 'Qayta urinish' },
    en: { back: 'Back', error: 'Search is unavailable', errorText: 'Check your connection and try again.', retry: 'Try again' },
  }[language];

  useEffect(() => {
    async function executeSearch() {
      setLoading(true);
      setError(false);
      try {
        const all = await PublicRepository.getProducts();
        if (!query.trim()) {
          setProducts([]);
        } else {
          const q = query.toLowerCase();
          const res = all.filter(
            (p) =>
              p.titleRu.toLowerCase().includes(q) ||
              p.titleUz.toLowerCase().includes(q) ||
              p.titleEn?.toLowerCase().includes(q) ||
              p.sku.toLowerCase().includes(q) ||
              p.shortDescriptionRu.toLowerCase().includes(q)
          );
          setProducts(res);
        }
      } catch {
        setProducts([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    void executeSearch();
  }, [attempt, query]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-5 md:py-10">
      <div className="mb-5 md:mb-8">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/catalog');
              }
            }}
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink)] shadow-xs transition-all hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] active:scale-95"
            aria-label={stateCopy.back}
            title={stateCopy.back}
          >
            <ChevronLeft className="size-5 text-[var(--sp-brand)]" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] sm:text-3xl truncate">
              {copy.title}: &ldquo;{query}&rdquo;
            </h1>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-[var(--sp-ink-secondary)]">
          {t('foundItems')} <span className="font-semibold tabular-nums text-[var(--sp-brand)]">{products.length}</span>
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4" aria-hidden="true">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] p-2 sm:p-3">
              <div className="aspect-square animate-pulse rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)]" />
              <div className="mt-3 h-3.5 w-4/5 animate-pulse rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)]" />
              <div className="mt-5 h-10 animate-pulse rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mx-auto max-w-md py-12 text-center" role="alert">
          <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-[var(--sp-brand)]"><RefreshCw className="size-6" aria-hidden="true" /></div>
          <h2 className="mt-5 font-extended text-xl font-bold text-[var(--sp-ink)]">{stateCopy.error}</h2>
          <p className="mt-2 text-sm text-[var(--sp-ink-secondary)]">{stateCopy.errorText}</p>
          <button type="button" onClick={() => setAttempt((current) => current + 1)} className="mt-5 min-h-11 cursor-pointer rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)]">{stateCopy.retry}</button>
        </div>
      ) : products.length === 0 ? (
        <div className="mx-auto max-w-md py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-[var(--sp-ink-muted)]"><Search className="size-6" aria-hidden="true" /></div>
          <h2 className="mt-5 font-extended text-xl font-bold text-[var(--sp-ink)]">{copy.emptyTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--sp-ink-secondary)]">
            {copy.emptyText}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {products.map((p, index) => (
            <ProductCard key={p.id} product={p} eagerImage={index < 2} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  const { language } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />
      <Suspense fallback={<div className="p-10 text-center text-xs">{pageCopy[language].search.loading}</div>}>
        <SearchResultsContent />
      </Suspense>
      <Footer />
    </div>
  );
}
