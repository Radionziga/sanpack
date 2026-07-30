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
    <section className="py-12 bg-[#F8FAF9]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#18231E] font-extended">
              {t('fastCategoriesTitle')}
            </h2>
            <p className="text-xs text-[#62726B] mt-1 font-wide">
              {subtitle}
            </p>
          </div>

          <Link
            href="/catalog"
            className="text-xs font-semibold text-[#0F6E43] hover:text-[#0B5735] flex items-center gap-1 group font-wide"
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
                className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-md hover:border-[#0F6E43] transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F2F7F4] text-[#0F6E43] flex items-center justify-center group-hover:bg-[#0F6E43] group-hover:text-white transition-colors shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#0F6E43] group-hover:translate-x-1 transition-all" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#18231E] group-hover:text-[#0F6E43] transition-colors line-clamp-1 mb-1 font-extended">
                    {title}
                  </h3>
                  <p className="text-[11px] text-[#62726B] line-clamp-2">
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
