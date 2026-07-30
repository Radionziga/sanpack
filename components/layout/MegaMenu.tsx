'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { Category } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { ChevronRight, Package, Trash2, ShoppingBag, Layers, Shield, Hand, Film, Utensils, Wheat, Leaf, Printer } from 'lucide-react';

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
  const { getLocalizedText } = useLanguage();

  if (!isOpen) return null;

  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl z-40 animate-in slide-in-from-top-2 duration-200">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {parentCategories.map((parent) => {
            const Icon = iconMap[parent.icon || 'Package'] || Package;
            const subCategories = categories.filter((c) => c.parentId === parent.id);

            return (
              <div key={parent.id} className="space-y-3 border-r border-slate-100 pr-4 last:border-0">
                <Link
                  href={`/catalog/${parent.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 text-base font-bold text-[#006F3C] hover:text-[#004F2B] group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EAF5EF] flex items-center justify-center group-hover:bg-[#006F3C] group-hover:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{getLocalizedText(parent.titleRu, parent.titleUz)}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                <ul className="space-y-1.5 pl-10">
                  {subCategories.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        href={`/catalog/${sub.slug}`}
                        onClick={onClose}
                        className="text-xs text-[#68736D] hover:text-[#006F3C] hover:underline flex items-center gap-1.5 py-0.5 transition-colors"
                      >
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        {getLocalizedText(sub.titleRu, sub.titleUz)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Promo banner strip inside mega menu */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#EAF5EF] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#006F3C] text-white flex items-center justify-center font-bold text-lg">
              %
            </div>
            <div>
              <p className="text-xs font-bold text-[#18231E]">
                Оптовые поставки с гарантией от завода SANPACK
              </p>
              <p className="text-[11px] text-[#68736D]">
                Бесплатная доставка по Ташкенту при заказе от 2 000 000 сум
              </p>
            </div>
          </div>
          <Link
            href="/catalog"
            onClick={onClose}
            className="px-4 py-2 bg-[#006F3C] hover:bg-[#004F2B] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Смотреть весь каталог
          </Link>
        </div>
      </div>
    </div>
  );
}
