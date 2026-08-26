'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Category } from '@/types';
import { Package, Trash2, ShoppingBag, Hand, Film, Wheat, Leaf, Printer, ArrowRight } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';

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
  const { company } = useSiteSettings();
  const subtitle = {
    ru: `Основные направления поставки продукции ${company.name}`,
    uz: `${company.name} mahsulotlarini yetkazib berishning asosiy yo‘nalishlari`,
    en: `${company.name}’s core supply categories`,
    zh: `${company.name} 的主要供应分类`,
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
            const title = getLocalizedText(cat.titleRu, cat.titleUz, cat.titleEn, cat.titleZh);

            return (
              <Link
                key={cat.id}
                href={`/catalog/${cat.slug}`}
                className="bg-[var(--sp-surface)] rounded-2xl border border-[var(--sp-line)] p-5 hover:shadow-md hover:border-[var(--sp-brand)] transition-all group flex flex-col justify-between aspect-[4/3]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--sp-surface-inset)] text-[var(--sp-brand)] shadow-xs transition-colors group-hover:bg-[var(--sp-brand)] group-hover:text-[var(--sp-on-brand)]">
                    <Icon className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--sp-ink-muted)] group-hover:text-[var(--sp-brand)] group-hover:translate-x-1 transition-all" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--sp-ink)] group-hover:text-[var(--sp-brand)] transition-colors line-clamp-1 mb-1 font-extended">
                    {title}
                  </h3>
                  <p className="text-[11px] text-[var(--sp-ink-secondary)] line-clamp-2">
                    {getLocalizedText(cat.descriptionRu, cat.descriptionUz, cat.descriptionEn, cat.descriptionZh)}
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
