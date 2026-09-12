export default function CatalogLoading() {
  return (
    <main className="mx-auto min-h-[60dvh] w-full max-w-7xl px-4 pb-32 pt-6" aria-busy="true" aria-label="Loading catalog">
      <div className="h-8 w-48 animate-pulse rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] motion-reduce:animate-none" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] p-2">
            <div className="aspect-square animate-pulse rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] motion-reduce:animate-none" />
            <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-[var(--sp-surface-inset)] motion-reduce:animate-none" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--sp-surface-inset)] motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </main>
  );
}
