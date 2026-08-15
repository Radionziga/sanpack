'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Category } from '@/types';
import { Package, Trash2, ShoppingBag, Hand, Film, Wheat, Leaf, Printer, ArrowRight } from 'lucide-react';

interface FastCategoriesProps {
  categories: Category[];
}

const iconMap: Record<string, React.ElementType> = {
  Trash2,
  ShoppingBag,
  Hand,
  Film,
  Wheat,
  Leaf,
  Printer,
  Package,
};

export function FastCategories({ categories }: FastCategoriesProps) {
  const { t, getLocalizedText, language } = useLanguage();
  const subtitle = {
    ru: 'Основные направления поставки продукции SANPACK',
    uz: 'SANPACK mahsulotlarini yetkazib berishning asosiy yo‘nalishlari',
    en: 'SANPACK’s core supply categories',
  }[language];

  return (
    <section className="py-12 bg-[var(--sp-surface-inset)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[var(--sp-ink)] font-extended">
              {t('fastCategoriesTitle')}
            </h2>
            <p className="text-xs text-[var(--sp-ink-secondary)] mt-1 font-wide">
              {subtitle}
            </p>
          </div>

          <Link
            href="/catalog"
            className="text-xs font-semibold text-[var(--sp-brand)] hover:opacity-80 flex items-center gap-1 group font-wide"
          >
            <span>{t('allCategories')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 font-wide">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon || 'Package'] || Package;
            const title = getLocalizedText(cat.titleRu, cat.titleUz, cat.titleEn);

            return (
              <Link
                key={cat.id}
                href={`/catalog/${cat.slug}`}
                className="bg-[var(--sp-surface)] rounded-[var(--sp-radius)] border border-[var(--sp-line)] p-5 hover:shadow-md hover:border-[var(--sp-brand)] transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-[var(--sp-radius-control)] bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] text-[var(--sp-brand)] flex items-center justify-center group-hover:bg-[var(--sp-brand)] group-hover:text-[var(--sp-on-brand)] transition-colors shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--sp-ink-tertiary)] group-hover:text-[var(--sp-brand)] group-hover:translate-x-1 transition-all" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--sp-ink)] group-hover:text-[var(--sp-brand)] transition-colors line-clamp-1 mb-1 font-extended">
                    {title}
                  </h3>
                  <p className="text-[11px] text-[var(--sp-ink-secondary)] line-clamp-2">
                    {getLocalizedText(cat.descriptionRu, cat.descriptionUz, cat.descriptionEn)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
