import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-[var(--sp-surface-inset)] ${className}`} />;
}

export function ProductDetailSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />
      <main className="flex-1 py-8" aria-busy="true">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="mb-6 flex gap-3">
            <Skeleton className="h-4 w-16 rounded-[var(--sp-radius-control-inner)]" />
            <Skeleton className="h-4 w-20 rounded-[var(--sp-radius-control-inner)]" />
            <Skeleton className="h-4 w-40 rounded-[var(--sp-radius-control-inner)]" />
          </div>

          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <section className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 lg:col-span-5">
              <Skeleton className="aspect-square w-full rounded-[var(--sp-radius-control-inner)]" />
            </section>

            <section className="space-y-5 lg:col-span-4">
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-[var(--sp-radius-control-inner)]" />
                <Skeleton className="h-10 w-4/5 rounded-[var(--sp-radius-control-inner)]" />
              </div>
              <Skeleton className="h-14 w-full rounded-[var(--sp-radius-control)]" />
              <div className="space-y-4 border-t border-[var(--sp-line-soft)] pt-6">
                <Skeleton className="h-5 w-44 rounded-[var(--sp-radius-control-inner)]" />
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between gap-6">
                    <Skeleton className="h-4 w-32 rounded-[var(--sp-radius-control-inner)]" />
                    <Skeleton className="h-4 w-28 rounded-[var(--sp-radius-control-inner)]" />
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-[var(--sp-shadow-soft)] lg:col-span-3">
              <Skeleton className="h-4 w-36 rounded-[var(--sp-radius-control-inner)]" />
              <Skeleton className="mt-3 h-9 w-44 rounded-[var(--sp-radius-control-inner)]" />
              <Skeleton className="mt-3 h-4 w-full rounded-[var(--sp-radius-control-inner)]" />
              <Skeleton className="mt-8 h-14 w-full rounded-[var(--sp-radius-control)]" />
              <Skeleton className="mt-5 h-16 w-full rounded-[var(--sp-radius-control)]" />
              <Skeleton className="mt-7 h-14 w-full rounded-[var(--sp-radius-control)]" />
              <Skeleton className="mt-3 h-12 w-full rounded-[var(--sp-radius-control)]" />
            </aside>
          </div>

          <section className="mt-12 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 md:p-8">
            <div className="flex gap-6 border-b border-[var(--sp-line-soft)] pb-5">
              <Skeleton className="h-5 w-24 rounded-[var(--sp-radius-control-inner)]" />
              <Skeleton className="h-5 w-32 rounded-[var(--sp-radius-control-inner)]" />
              <Skeleton className="h-5 w-36 rounded-[var(--sp-radius-control-inner)]" />
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-14 w-full rounded-[var(--sp-radius-control)]" />
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
