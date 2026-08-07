import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-[var(--sp-line)] pb-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <h1 className="text-pretty font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--sp-ink-secondary)]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
