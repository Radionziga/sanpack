'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StorefrontSearch } from '@/components/search/StorefrontSearch';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  return <StorefrontSearch key={query} initialQuery={query} />;
}

function SearchLoading() {
  return (
    <main className="mx-auto min-h-[40vh] w-full max-w-7xl px-4 py-10" aria-busy="true">
      <div className="h-8 w-72 max-w-full animate-pulse rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)]" />
      <span className="sr-only">Loading</span>
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
