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
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-10 max-w-7xl mx-auto px-4 w-full">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#18231E]">
              {t('favorites')}
            </h1>
            <p className="text-xs text-[#68736D] mt-1">
              {copy.intro}
            </p>
          </div>

          {favProducts.length > 0 && (
            <button
              onClick={clearFavorites}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5"
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
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto">
            <Heart className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-[#18231E]">{copy.emptyTitle}</h3>
            <p className="text-xs text-slate-500">
              {copy.emptyText}
            </p>
            <Link
              href="/catalog"
              className="inline-block px-6 py-3 bg-[#006F3C] text-white font-bold rounded-xl text-xs"
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
