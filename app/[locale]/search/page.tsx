'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CatalogListing } from '@/components/catalog/CatalogListing';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  return <CatalogListing key={query} searchQuery={query} />;
}

function SearchLoading() {
  const t = useTranslations('catalogListing');
  return (
    <main className="mx-auto min-h-[40vh] w-full max-w-7xl px-4 py-10" aria-busy="true">
      <div className="h-8 w-72 max-w-full animate-pulse rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)]" />
      <p className="sr-only">{t('catalog')}</p>
    </main>
  );
}

export default function SearchPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />
      <Suspense fallback={<SearchLoading />}>
        <SearchResultsContent />
      </Suspense>
      <Footer />
    </div>
  );
}
