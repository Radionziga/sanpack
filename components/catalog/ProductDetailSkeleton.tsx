import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-[var(--sp-surface-inset)] ${className}`} />;
}

export function ProductDetailSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />
      <main className="flex-1 pb-[calc(var(--sp-mobile-nav-height)+env(safe-area-inset-bottom)+5.5rem)] pt-5 md:py-8" aria-busy="true">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="mb-6 hidden gap-3 md:flex">
            <Skeleton className="h-4 w-16 rounded-[var(--sp-radius-control-inner)]" />
            <Skeleton className="h-4 w-20 rounded-[var(--sp-radius-control-inner)]" />
            <Skeleton className="h-4 w-40 rounded-[var(--sp-radius-control-inner)]" />
          </div>

          <div className="mb-4 space-y-2 lg:hidden">
            <Skeleton className="h-7 w-full rounded-[var(--sp-radius-control-inner)]" />
            <Skeleton className="h-7 w-3/4 rounded-[var(--sp-radius-control-inner)]" />
          </div>

          <div className="grid gap-5 lg:grid-cols-12 lg:items-start lg:gap-8">
            <section className="order-1 rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] sm:border sm:border-[var(--sp-line)] sm:p-4 lg:order-none lg:col-span-5">
              <Skeleton className="aspect-square w-full rounded-[var(--sp-radius-control-inner)]" />
            </section>

            <section className="order-3 space-y-5 lg:order-none lg:col-span-4">
              <div className="hidden space-y-3 lg:block">
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

            <aside className="order-2 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-[var(--sp-shadow-soft)] sm:p-6 lg:order-none lg:col-span-3">
              <Skeleton className="h-4 w-36 rounded-[var(--sp-radius-control-inner)]" />
              <Skeleton className="mt-3 h-9 w-44 rounded-[var(--sp-radius-control-inner)]" />
              <Skeleton className="mt-3 h-4 w-full rounded-[var(--sp-radius-control-inner)]" />
              <Skeleton className="mt-8 h-14 w-full rounded-[var(--sp-radius-control)]" />
              <Skeleton className="mt-5 h-16 w-full rounded-[var(--sp-radius-control)]" />
              <Skeleton className="mt-7 h-14 w-full rounded-[var(--sp-radius-control)]" />
              <Skeleton className="mt-3 h-12 w-full rounded-[var(--sp-radius-control)]" />
            </aside>
          </div>

          <section className="mt-8 space-y-2 md:hidden">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex min-h-12 items-center justify-between rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4">
                <Skeleton className="h-4 w-32 rounded-[var(--sp-radius-control-inner)]" />
                <Skeleton className="size-4 rounded-[var(--sp-radius-control-inner)]" />
              </div>
            ))}
          </section>

          <section className="mt-12 hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 md:block md:p-8">
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
      <div className="fixed inset-x-0 z-30 border-t border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 py-2 shadow-[0_-12px_28px_rgb(21_27_24/10%)] md:hidden" style={{ bottom: 'calc(var(--sp-mobile-nav-height) + env(safe-area-inset-bottom))' }} aria-hidden="true">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-3 w-20 rounded-[var(--sp-radius-control-inner)]" />
            <Skeleton className="h-5 w-28 rounded-[var(--sp-radius-control-inner)]" />
          </div>
          <Skeleton className="h-12 w-40 rounded-[var(--sp-radius-control)]" />
        </div>
      </div>
      <Footer />
    </div>
  );
}
