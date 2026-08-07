'use client';

import React, { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { PublicSanpackRepository as SanpackRepository } from '@/lib/repositories/publicRepository';
import { Product } from '@/types';
import { useFavorites } from '@/context/FavoritesContext';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Heart, Trash2 } from 'lucide-react';

export default function FavoritesPage() {
  const { favoriteIds, clearFavorites } = useFavorites();
  const { t, language } = useLanguage();
  const copy = pageCopy[language].favorites;

  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavs() {
      if (favoriteIds.length === 0) {
        setFavProducts([]);
        setLoading(false);
        return;
      }
      const all = await SanpackRepository.getProducts();
      setFavProducts(all.filter((p) => favoriteIds.includes(p.id)));
      setLoading(false);
    }
    loadFavs();
  }, [favoriteIds]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        <div className="mb-8 flex items-center justify-between border-b border-[var(--sp-line)] pb-4">
          <div>
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
              className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[var(--sp-danger)] transition-colors hover:bg-red-500/8"
            >
              <Trash2 className="w-4 h-4" />
              <span>{copy.clear}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : favProducts.length === 0 ? (
          <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] px-6 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--sp-surface-inset)] text-[var(--sp-ink-muted)]">
              <Heart className="size-7" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-[var(--sp-ink)]">{copy.emptyTitle}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--sp-ink-secondary)]">
              {copy.emptyText}
            </p>
            <Link
              href="/catalog"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--sp-brand)] px-5 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90"
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
