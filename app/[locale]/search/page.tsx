'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { PublicSanpackRepository as SanpackRepository } from '@/lib/repositories/publicRepository';
import { Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Search } from 'lucide-react';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { t, language } = useLanguage();
  const copy = pageCopy[language].search;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function executeSearch() {
      setLoading(true);
      const all = await SanpackRepository.getProducts();
      if (!query.trim()) {
        setProducts([]);
      } else {
        const q = query.toLowerCase();
        const res = all.filter(
          (p) =>
            p.titleRu.toLowerCase().includes(q) ||
            p.titleUz.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.shortDescriptionRu.toLowerCase().includes(q)
        );
        setProducts(res);
      }
      setLoading(false);
    }
    executeSearch();
  }, [query]);

  return (
    <main className="flex-1 py-10 max-w-7xl mx-auto px-4 w-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#18231E]">
          {copy.title}: &ldquo;{query}&rdquo;
        </h1>
        <p className="text-xs text-[#68736D] mt-1">
          {t('foundItems')} <span className="font-bold text-[#006F3C]">{products.length}</span>
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-slate-200 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto">
          <Search className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#18231E]">{copy.emptyTitle}</h3>
          <p className="text-xs text-slate-500">
            {copy.emptyText}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />
      <Suspense fallback={<div className="p-10 text-center text-xs">{pageCopy[language].search.loading}</div>}>
        <SearchResultsContent />
      </Suspense>
      <Footer />
    </div>
  );
}
