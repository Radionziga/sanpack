'use client';

import React from 'react';
import Link from 'next/link';
import { Category } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Folder, ChevronRight } from 'lucide-react';

interface CategorySidebarProps {
  categories: Category[];
  activeSlug?: string;
}

export function CategorySidebar({ categories, activeSlug }: CategorySidebarProps) {
  const { getLocalizedText } = useLanguage();

  const parents = categories.filter((c) => !c.parentId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center gap-2 text-base font-bold text-[#18231E] pb-3 mb-3 border-b border-slate-100">
        <Folder className="w-5 h-5 text-[#006F3C]" />
        <span>Категории SANPACK</span>
      </div>

      <ul className="space-y-2">
        <li>
          <Link
            href="/catalog"
            className={`block px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              !activeSlug
                ? 'bg-[#006F3C] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Все товары каталога
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
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isParentActive
                    ? 'bg-[#006F3C] text-white'
                    : hasActiveChild
                    ? 'bg-[#EAF5EF] text-[#006F3C]'
                    : 'text-[#18231E] hover:bg-slate-100'
                }`}
              >
                <span>{getLocalizedText(parent.titleRu, parent.titleUz)}</span>
                {subs.length > 0 && <ChevronRight className="w-3.5 h-3.5" />}
              </Link>

              {subs.length > 0 && (
                <ul className="pl-4 space-y-1 border-l-2 border-slate-100 ml-3">
                  {subs.map((sub) => {
                    const isChildActive = sub.slug === activeSlug;
                    return (
                      <li key={sub.id}>
                        <Link
                          href={`/catalog/${sub.slug}`}
                          className={`block px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                            isChildActive
                              ? 'bg-[#006F3C] text-white font-bold'
                              : 'text-[#68736D] hover:text-[#006F3C] hover:bg-slate-50'
                          }`}
                        >
                          {getLocalizedText(sub.titleRu, sub.titleUz)}
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
