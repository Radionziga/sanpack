'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroBanner } from '@/components/home/HeroBanner';
import { FastCategories } from '@/components/home/FastCategories';
import { Advantages } from '@/components/home/Advantages';
import { BusinessSegments } from '@/components/home/BusinessSegments';
import { ClientsSection } from '@/components/home/ClientsSection';
import { BrandingBanner } from '@/components/home/BrandingBanner';
import { CtaBanner } from '@/components/home/CtaBanner';
import { ProductCard } from '@/components/catalog/ProductCard';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { Product, Category, ClientPartner } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HomePage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<ClientPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [p, c, cl] = await Promise.all([
        SanpackRepository.getProducts(),
        SanpackRepository.getCategories(),
        SanpackRepository.getClients(),
      ]);
      setProducts(p);
      setCategories(c.filter((cat) => !cat.parentId));
      setClients(cl);
      setLoading(false);
    }
    loadData();
  }, []);

  const popularProducts = products.filter((p) => p.featured).slice(0, 8);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1">
        <HeroBanner />

        <FastCategories categories={categories} />

        {/* Popular Products */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EF] text-[#006F3C] text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Популярный выбор HoReCa</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#18231E]">
                  {t('popularProductsTitle')}
                </h2>
              </div>

              <Link
                href="/catalog"
                className="text-xs font-bold text-[#006F3C] hover:text-[#004F2B] flex items-center gap-1 group self-start sm:self-auto"
              >
                <span>Перейти в полный каталог</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {popularProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        <Advantages />

        <BusinessSegments />

        <ClientsSection clients={clients} />

        <BrandingBanner />

        <CtaBanner />
      </main>

      <Footer />
    </div>
  );
}
