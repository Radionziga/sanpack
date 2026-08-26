'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { Category } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { ChevronRight, Package, Trash2, ShoppingBag, Layers, Shield, Hand, Film, Utensils, Wheat, Leaf, Printer } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { getCategoryTitle } from '@/lib/i18n/categoryText';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

const iconMap: Record<string, React.ElementType> = {
  Package,
  Trash2,
  ShoppingBag,
  Layers,
  Shield,
  Hand,
  Film,
  Utensils,
  Wheat,
  Leaf,
  Printer,
};

export function MegaMenu({ isOpen, onClose, categories }: MegaMenuProps) {
  const { getLocalizedText, language } = useLanguage();
  const { company } = useSiteSettings();
  const copy = {
    ru: [`Оптовые поставки с гарантией от ${company.name}`, 'Бесплатная доставка по Ташкенту от 2 000 000 сум', 'Смотреть весь каталог'],
    uz: [`${company.name} tomonidan kafolatlangan ulgurji yetkazib berish`, 'Toshkent bo‘ylab 2 000 000 so‘mdan bepul yetkazib berish', 'To‘liq katalogni ko‘rish'],
    en: [`Guaranteed wholesale supply from ${company.name}`, 'Free Tashkent delivery on orders over UZS 2,000,000', 'View the full catalog'],
    zh: [`${company.name} 提供有保障的批量供应`, '塔什干市内订单满 2,000,000 苏姆免费配送', '查看全部商品'],
  }[language];

  if (!isOpen) return null;

  const parentCategories = categories.filter((c) => !c.parentId);
  const categoryTitle = (category: Category) => getCategoryTitle(
    category,
    language,
    getLocalizedText(category.titleRu, category.titleUz, category.titleEn, category.titleZh),
  );

  return (
    <div className="absolute left-0 top-full z-40 w-full animate-in border-b border-[var(--sp-line)] bg-[var(--sp-surface-raised)] shadow-[var(--sp-shadow-raised)] duration-200 slide-in-from-top-2">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {parentCategories.map((parent) => {
            const Icon = iconMap[parent.icon || 'Package'] || Package;
            const subCategories = categories.filter((c) => c.parentId === parent.id);

            return (
              <section key={parent.id} className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4">
                <Link
                  href={`/catalog/${parent.slug}`}
                  onClick={onClose}
                  className="group flex items-center gap-2.5 text-sm font-semibold text-[var(--sp-brand)] hover:text-[var(--sp-brand-deep)]"
                >
                  <div className="flex size-8 items-center justify-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] transition-colors group-hover:bg-[var(--sp-brand)] group-hover:text-[var(--sp-on-brand)]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{categoryTitle(parent)}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-1 border-t border-[var(--sp-line-soft)] pt-3 sm:grid-cols-2">
                  {subCategories.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        href={`/catalog/${sub.slug}`}
                        onClick={onClose}
                        className="flex min-h-9 items-center gap-2 rounded-[var(--sp-radius-control-inner)] px-2 py-1.5 text-xs text-[var(--sp-ink-secondary)] transition-colors hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]"
                      >
                        <span className="size-1 rounded-full bg-[var(--sp-line-strong)]"></span>
                        {categoryTitle(sub)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Promo banner strip inside mega menu */}
        <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-[var(--sp-radius-card)] bg-[var(--sp-brand-soft)] p-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] text-lg font-semibold text-[var(--sp-on-brand)]">
              %
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--sp-ink)]">
                {copy[0]}
              </p>
              <p className="text-[11px] text-[var(--sp-ink-secondary)]">
                {copy[1]}
              </p>
            </div>
          </div>
          <Link
            href="/catalog"
            onClick={onClose}
            className="whitespace-nowrap rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 py-2 text-xs font-medium text-[var(--sp-on-brand)] transition-colors hover:bg-[var(--sp-brand-deep)]"
          >
            {copy[2]}
          </Link>
        </div>
      </div>
    </div>
  );
}
