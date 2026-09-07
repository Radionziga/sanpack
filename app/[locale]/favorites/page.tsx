'use client';

import React, { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import { Product } from '@/types';
import { useFavorites } from '@/context/FavoritesContext';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Heart, RefreshCw, Trash2 } from 'lucide-react';

export default function FavoritesPage() {
  const { favoriteIds, clearFavorites } = useFavorites();
  const { t, language } = useLanguage();
  const copy = pageCopy[language].favorites;

  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadFavs() {
      setLoading(true);
      setLoadError(false);
      if (favoriteIds.length === 0) {
        if (!cancelled) { setFavProducts([]); setLoading(false); }
        return;
      }
      try {
        const all = await PublicRepository.getProducts();
        if (!cancelled) setFavProducts(all.filter((p) => favoriteIds.includes(p.id)));
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadFavs();
    return () => { cancelled = true; };
  }, [favoriteIds, loadAttempt]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-[var(--sp-line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] sm:text-3xl">
              {t('favorites')}
            </h1>
            <p className="mt-1 text-sm text-[var(--sp-ink-secondary)]">
              {copy.intro}
            </p>
          </div>

          {favProducts.length > 0 && (
            <button
              onClick={clearFavorites}
              className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-danger)_34%,var(--sp-line))] bg-[var(--sp-surface)] px-4 text-xs font-semibold text-[var(--sp-danger)] transition-[background-color,border-color] hover:border-[var(--sp-danger)] hover:bg-[color-mix(in_srgb,var(--sp-danger)_7%,var(--sp-surface))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] sm:shrink-0"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span>{copy.clear}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)]" />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-6 text-center" role="alert">
            <RefreshCw className="size-7 text-[var(--sp-brand)]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold">{language === 'ru' ? 'Не удалось загрузить избранное' : language === 'uz' ? 'Tanlanganlarni yuklab bo‘lmadi' : language === 'zh' ? '收藏夹加载失败' : 'Could not load favorites'}</h2>
            <button type="button" onClick={() => setLoadAttempt((value) => value + 1)} className="mt-5 min-h-11 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)]">{language === 'ru' ? 'Повторить' : language === 'uz' ? 'Qayta urinish' : language === 'zh' ? '重试' : 'Retry'}</button>
          </div>
        ) : favProducts.length === 0 ? (
          <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-6 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-[var(--sp-brand)]">
              <Heart className="size-7" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-[var(--sp-ink)]">{copy.emptyTitle}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--sp-ink-secondary)]">
              {copy.emptyText}
            </p>
            <Link
              href="/catalog"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 font-compact text-xs font-medium text-[var(--sp-on-brand)] transition-opacity hover:opacity-90"
            >
              {t('goToCatalog')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {favProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
