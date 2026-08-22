'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { Category } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Folder, ChevronRight } from 'lucide-react';

interface CategorySidebarProps {
  categories: Category[];
  activeSlug?: string;
}

export function CategorySidebar({ categories, activeSlug }: CategorySidebarProps) {
  const { getLocalizedText, t } = useLanguage();

  const parents = categories.filter((c) => !c.parentId);

  return (
    <div className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 shadow-[var(--sp-shadow-soft)]">
      <div className="mb-3 flex items-center gap-2 border-b border-[var(--sp-line-soft)] pb-3 text-base font-semibold text-[var(--sp-ink)]">
        <Folder className="size-5 text-[var(--sp-brand)]" />
        <span>{t('adminCategories')}</span>
      </div>

      <ul className="space-y-2">
        <li>
          <Link
            href="/catalog"
            className={`block rounded-[var(--sp-radius-control)] px-3 py-2 text-xs font-semibold transition-colors ${
              !activeSlug
                ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)]'
                : 'text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-inset)]'
            }`}
          >
            {t('allCategories')}
          </Link>
        </li>

        {parents.map((parent) => {
          const subs = categories.filter((c) => c.parentId === parent.id);
          const isParentActive = parent.slug === activeSlug;
          const hasActiveChild = subs.some((s) => s.slug === activeSlug);

          return (
            <li key={parent.id} className="space-y-1">
              <Link
                href={`/catalog/${parent.slug}`}
                className={`flex items-center justify-between rounded-[var(--sp-radius-control)] px-3 py-2 text-xs font-semibold transition-colors ${
                  isParentActive
                    ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'
                    : hasActiveChild
                    ? 'bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]'
                    : 'text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)]'
                }`}
              >
                <span>{getLocalizedText(parent.titleRu, parent.titleUz, parent.titleEn)}</span>
                {subs.length > 0 && <ChevronRight className="w-3.5 h-3.5" />}
              </Link>

              {subs.length > 0 && (
                <ul className="ml-3 space-y-1 border-l-2 border-[var(--sp-line-soft)] pl-4">
                  {subs.map((sub) => {
                    const isChildActive = sub.slug === activeSlug;
                    return (
                      <li key={sub.id}>
                        <Link
                          href={`/catalog/${sub.slug}`}
                          className={`block rounded-[var(--sp-radius-control-inner)] px-2.5 py-1.5 text-xs transition-colors ${
                            isChildActive
                              ? 'bg-[var(--sp-brand)] font-semibold text-[var(--sp-on-brand)]'
                              : 'text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]'
                          }`}
                        >
                          {getLocalizedText(sub.titleRu, sub.titleUz, sub.titleEn)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
