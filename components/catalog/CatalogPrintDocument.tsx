'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Share2,
  Check,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ExternalLink,
  Package,
  Phone,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { SanpackLogo } from '@/components/ui/SanpackLogo';
import type { Category, ClientPartner, Language, Product, SiteSettings } from '@/types';
import { formatMoney } from '@/lib/catalog/productPresentation';

interface CatalogPrintDocumentProps {
  initialProducts: Product[];
  initialCategories: Category[];
  settings?: SiteSettings | null;
  clients?: ClientPartner[];
  initialOptions?: {
    withPrices?: boolean;
    language?: Language;
    categoryId?: string;
  };
  embeddedInAdmin?: boolean;
}

interface CategoryPageChunk {
  category: Category;
  products: Product[];
  pageIndex: number;
  totalCategoryPages: number;
  layoutCols: 2 | 3 | 4;
  rowsCount: number;
}

// Comprehensive dictionary for translating product titles and terms into Uzbek
function translateTitleToUzbek(titleRu: string): string {
  if (!titleRu) return '';
  let str = titleRu;

  const dictionary: [RegExp, string][] = [
    // Phrases & Multi-word categories
    [/Мусорные пакеты/gi, 'Chiqindi paketlari'],
    [/Мусорные мешки/gi, 'Chiqindi qoplari'],
    [/Пакеты «Майка»/gi, '«Mayka» paketlar'],
    [/Пакеты майка/gi, '«Mayka» paketlar'],
    [/Пакеты для пиццы/gi, 'Pitsa paketlari'],
    [/Отрывные пакеты/gi, 'Yirtma paketlar'],
    [/Вакуумные пакеты/gi, 'Vakuumli paketlar'],
    [/Крафт-пакеты/gi, 'Kraft paketlar'],
    [/Крафт пакеты/gi, 'Kraft paketlar'],
    [/Пищевая стрейч-плёнка/gi, 'Oziq-ovqat streych plyonkasi'],
    [/Пищевая стрейч-пленка/gi, 'Oziq-ovqat streych plyonkasi'],
    [/Стрейч-плёнка/gi, 'Streych plyonka'],
    [/Стрейч-пленка/gi, 'Streych plyonka'],
    [/Стрейч плёнка/gi, 'Streych plyonka'],
    [/Стрейч пленка/gi, 'Streych plyonka'],
    [/Алюминиевая фольга/gi, 'Alyuminiy folga'],
    [/Фольга/gi, 'Folga'],
    [/Бумага для выпечки/gi, 'Pishiriq qog‘ozi'],
    [/Пергаментная бумага/gi, 'Pergament qog‘ozi'],
    [/Пергамент/gi, 'Pergament'],
    [/Рулонные салфетки/gi, 'Rulonli salfetkalar'],
    [/Квадратные салфетки/gi, 'Kvadrat salfetkalar'],
    [/Влажные салфетки/gi, 'Nam salfetkalar'],
    [/Салфетки для диспенсера/gi, 'Dispenser salfetkalari'],
    [/Салфетки/gi, 'Salfetkalar'],
    [/Туалетная бумага/gi, 'Hojatxona qog‘ozi'],
    [/Бумажные полотенца/gi, 'Qog‘oz sochiqlar'],
    [/Перчатки универсальные/gi, 'Universal qo‘lqoplar'],
    [/Резиновые перчатки/gi, 'Rezina qo‘lqoplar'],
    [/Нитриловые перчатки/gi, 'Nitril qo‘lqoplar'],
    [/Виниловые перчатки/gi, 'Vinil qo‘lqoplar'],
    [/Латексные перчатки/gi, 'Lateks qo‘lqoplar'],
    [/Хозяйственные перчатки/gi, 'Xo‘jalik qo‘lqoplari'],
    [/Одноразовые перчатки/gi, 'Bir martalik qo‘lqoplar'],
    [/Перчатки/gi, 'Qo‘lqoplar'],
    [/Губки для мытья посуды/gi, 'Idish yuvish gubkalari'],
    [/Губки для посуды/gi, 'Idish yuvish gubkalari'],
    [/Корейская губка/gi, 'Koreys gubkasi'],
    [/Губки/gi, 'Gubkalar'],
    [/Губка/gi, 'Gubka'],
    [/Цветные тряпки для столов/gi, 'Stol uchun rangli lattalar'],
    [/Половая тряпка из микрофибры/gi, 'Mikrofibradan pol lattasi'],
    [/Половая тряпка/gi, 'Pol lattasi'],
    [/Тряпка «Дельфин»/gi, '«Delfin» lattasi'],
    [/Тряпки для уборки/gi, 'Tozalash lattalari'],
    [/Тряпки/gi, 'Lattalar'],
    [/Тряпка/gi, 'Latta'],
    [/Зубочистки/gi, 'Tish tozalagichlar'],
    [/Шпажки/gi, 'Sixlar'],
    [/Одноразовые стаканы/gi, 'Bir martalik stakanlar'],
    [/Одноразовые стаканчики/gi, 'Bir martalik stakanlar'],
    [/Стаканы/gi, 'Stakanlar'],
    [/Стаканчики/gi, 'Stakanlar'],
    [/Контейнеры для еды/gi, 'Ovqat konteynerlari'],
    [/Контейнеры/gi, 'Konteynerlar'],
    [/Ланч-боксы/gi, 'Lanch-bokslar'],
    [/Ланч боксы/gi, 'Lanch-bokslar'],
    [/Коробки для пиццы/gi, 'Pitsa qutilari'],
    [/Коробки/gi, 'Qutilar'],
    [/Фольгированные формы/gi, 'Folga qoliplar'],
    [/Трубочки/gi, 'Trubochkalar'],
    [/Продукты питания/gi, 'Oziq-ovqat mahsulotlari'],
    [/Упаковка и расходные материалы/gi, 'Qadoqlash va sarf materiallari'],
    [/Упаковка для пищевых продуктов/gi, 'Oziq-ovqat qadoqlari'],
    [/Бумажная продукция/gi, 'Qog‘oz mahsulotlari'],
    [/Хозяйственные товары/gi, 'Xo‘jalik mollari'],
    [/Говядина/gi, 'Mol go‘shti'],
    [/Курица/gi, 'Tovuq go‘shti'],
    [/Куриный окорочок/gi, 'Tovuq soni'],
    [/Куриные крылышки/gi, 'Tovuq qanotchalari'],
    [/Целая курица/gi, 'Butun tovuq'],
    [/Куриная грудка очищенная/gi, 'Tozalangan tovuq filesi'],
    [/Куриная грудка/gi, 'Tovuq filesi'],
    [/Куриное бедро без костей и кожи/gi, 'Suyaksiz va terisiz tovuq soni'],
    [/Куриное бедро без костей/gi, 'Suyaksiz tovuq soni'],
    [/Куриное бедро/gi, 'Tovuq soni'],
    [/Куриная голень/gi, 'Tovuq boldiri'],
    [/Молочная продукция/gi, 'Sut mahsulotlari'],
    [/Куриные яйца/gi, 'Tovuq tuxumlari'],
    [/Мука/gi, 'Un mahsulotlari'],
    [/Фрукты/gi, 'Mevalar'],
    [/Свежая зелень Novagreen/gi, 'Novagreen yangi ko‘katlari'],
    [/Крупы и бобовые/gi, 'Yormalar va dukkaklilar'],
    [/Микрозелень/gi, 'Mikroko‘katlar'],
    [/Растительные и фритюрные масла/gi, 'O‘simlik va fritur moylari'],
    [/Сахар/gi, 'Shakar'],
    [/Овощи/gi, 'Sabzavotlar'],
    [/Ягоды/gi, 'Mevalar va rezavorlar'],

    // Modifiers & Adjectives
    [/ультрапрочные/gi, 'o‘ta mustahkam'],
    [/ультрапрочный/gi, 'o‘ta mustahkam'],
    [/прочные/gi, 'mustahkam'],
    [/прочный/gi, 'mustahkam'],
    [/утолщённые/gi, 'qalinlashtirilgan'],
    [/утолщенные/gi, 'qalinlashtirilgan'],
    [/утолщённая/gi, 'qalinlashtirilgan'],
    [/утолщенная/gi, 'qalinlashtirilgan'],
    [/большая/gi, 'katta'],
    [/большой/gi, 'katta'],
    [/маленькая/gi, 'kichik'],
    [/маленький/gi, 'kichik'],
    [/двухслойная/gi, '2 qatlamli'],
    [/двухслойные/gi, '2 qatlamli'],
    [/трехслойная/gi, '3 qatlamli'],
    [/трехслойные/gi, '3 qatlamli'],
    [/2 слоя/gi, '2 qatlam'],
    [/2 слоев/gi, '2 qatlam'],
    [/2 рулона/gi, '2 rulon'],
    [/4 рулона/gi, '4 rulon'],
    [/6 рулонов/gi, '6 rulon'],
    [/рулонов/gi, 'rulon'],
    [/рулона/gi, 'rulon'],
    [/рулон/gi, 'rulon'],
    [/рулоне/gi, 'rulonda'],
    [/упаковке/gi, 'qadoqda'],
    [/упаковка/gi, 'qadoq'],
    [/блоке/gi, 'blokda'],
    [/блок/gi, 'blok'],
    [/коробке/gi, 'qutida'],
    [/коробка/gi, 'quti'],
    [/штук/gi, 'dona'],
    [/шт\./gi, 'dona'],
    [/шт\b/gi, 'dona'],
    [/см/gi, 'sm'],
    [/л\b/gi, 'l'],
    [/кг/gi, 'kg'],
    [/мкм/gi, 'mkm'],
    [/м\b/gi, 'm'],
    [/уп\./gi, 'qadoq'],
    [/уп\b/gi, 'qadoq'],
    [/чёрные/gi, 'qora'],
    [/черные/gi, 'qora'],
    [/жёлтые/gi, 'sariq'],
    [/желтые/gi, 'sariq'],
    [/белые/gi, 'oq'],
    [/синие/gi, 'ko‘k'],
    [/прозрачные/gi, 'shaffof'],
  ];

  for (const [regex, replacement] of dictionary) {
    str = str.replace(regex, replacement);
  }

  return str;
}

function getLocalizedProductTitle(product: Product, language: Language): string {
  if (language === 'uz') {
    if (product.titleUz && product.titleUz !== product.titleRu && !/[а-яё]/i.test(product.titleUz)) {
      return product.titleUz;
    }
    return translateTitleToUzbek(product.titleRu || product.titleUz || '');
  }
  if (language === 'en') {
    if (product.titleEn && product.titleEn !== product.titleRu) {
      return product.titleEn;
    }
    return product.titleRu;
  }
  return product.titleRu;
}

function getLocalizedSalesUnitLabel(unit: string | undefined, language: Language): string {
  const clean = (unit || 'шт').toLowerCase().trim();
  if (language === 'uz') {
    if (clean.includes('рулон') || clean === 'рул' || clean === 'rulon') return 'rulon';
    if (clean.includes('упаковк') || clean === 'уп' || clean === 'qadoq') return 'qadoq';
    if (clean.includes('блок') || clean === 'blok') return 'blok';
    if (clean.includes('коробк') || clean === 'кор' || clean === 'quti') return 'quti';
    if (clean.includes('мешок') || clean === 'qop') return 'qop';
    if (clean.includes('кг') || clean === 'kg') return 'kg';
    return 'dona';
  }
  if (language === 'en') {
    if (clean.includes('рулон') || clean === 'rulon') return 'roll';
    if (clean.includes('упаковк') || clean === 'qadoq') return 'pack';
    if (clean.includes('блок')) return 'block';
    if (clean.includes('коробк') || clean === 'quti') return 'box';
    if (clean.includes('кг')) return 'kg';
    return 'pcs';
  }
  return clean;
}

export function CatalogPrintDocument({
  initialProducts = [],
  initialCategories = [],
  settings,
  clients = [],
  initialOptions = {},
  embeddedInAdmin = false,
}: CatalogPrintDocumentProps) {
  // State
  const [withPrices, setWithPrices] = useState<boolean>(initialOptions.withPrices !== false);
  const [language, setLanguage] = useState<Language>(initialOptions.language || 'ru');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialOptions.categoryId || '');
  const [scale, setScale] = useState<number>(embeddedInAdmin ? 0.78 : 0.85);
  const [copied, setCopied] = useState<boolean>(false);

  // Set page title for nice PDF export filename
  useEffect(() => {
    const modeStr = withPrices ? 'price-list' : 'presentation';
    document.title = `SANPACK-Catalog-${modeStr}-${language.toUpperCase()}`;
  }, [withPrices, language]);

  // Sort categories
  const sortedCategories = useMemo(() => {
    return [...initialCategories].sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
  }, [initialCategories]);

  // Separate parent categories (parentId is empty/undefined) and child categories
  const parentCategories = useMemo(() => {
    return sortedCategories.filter((c) => !c.parentId);
  }, [sortedCategories]);

  // Find all category IDs for the currently selected category (including child categories)
  const matchingCategoryIds = useMemo(() => {
    if (!selectedCategory) return null; // All categories

    const targetCat = sortedCategories.find(
      (c) => c.id === selectedCategory || c.slug === selectedCategory
    );
    if (!targetCat) return new Set([selectedCategory]);

    const ids = new Set<string>();
    ids.add(targetCat.id);
    if (targetCat.slug) ids.add(targetCat.slug);

    // Recursively add children
    const addDescendants = (parentId: string) => {
      for (const c of sortedCategories) {
        if (c.parentId === parentId) {
          ids.add(c.id);
          if (c.slug) ids.add(c.slug);
          addDescendants(c.id);
        }
      }
    };
    addDescendants(targetCat.id);

    return ids;
  }, [selectedCategory, sortedCategories]);

  // Filter products by selected category hierarchy and published status
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      if (p.status && p.status !== 'published') return false;
      if (matchingCategoryIds) {
        const match =
          (p.categoryId && matchingCategoryIds.has(p.categoryId)) ||
          (p.categorySlug && matchingCategoryIds.has(p.categorySlug));
        if (!match) return false;
      }
      return true;
    });
  }, [initialProducts, matchingCategoryIds]);

  // Dynamic category page solver:
  // - 1..4 items -> 1 page (2 cols x 2 rows)
  // - 5..6 items -> 1 page (3 cols x 2 rows)
  // - 7..8 items -> 1 page (4 cols x 2 rows)
  // - 9 items -> 1 page (3 cols x 3 rows = 9 items) - Perfect for Chicken/Курица!
  // - 10..12 items -> 1 page (4 cols x 3 rows = 12 items)
  // - > 12 items -> Split evenly into balanced multi-page batches of up to 9 or 12 items
  const categoryPages = useMemo(() => {
    const pages: CategoryPageChunk[] = [];

    const activeCategories = matchingCategoryIds
      ? sortedCategories.filter((c) => matchingCategoryIds.has(c.id) || (c.slug && matchingCategoryIds.has(c.slug)))
      : sortedCategories;

    for (const cat of activeCategories) {
      const catProds = filteredProducts.filter(
        (p) => p.categoryId === cat.id || p.categorySlug === cat.slug || p.categoryId === cat.slug
      );
      if (catProds.length === 0) continue;

      const totalCount = catProds.length;

      if (totalCount <= 4) {
        pages.push({
          category: cat,
          products: catProds,
          pageIndex: 1,
          totalCategoryPages: 1,
          layoutCols: 2,
          rowsCount: Math.ceil(totalCount / 2),
        });
      } else if (totalCount <= 6) {
        pages.push({
          category: cat,
          products: catProds,
          pageIndex: 1,
          totalCategoryPages: 1,
          layoutCols: 3,
          rowsCount: 2,
        });
      } else if (totalCount <= 8) {
        pages.push({
          category: cat,
          products: catProds,
          pageIndex: 1,
          totalCategoryPages: 1,
          layoutCols: 4,
          rowsCount: 2,
        });
      } else if (totalCount === 9) {
        pages.push({
          category: cat,
          products: catProds,
          pageIndex: 1,
          totalCategoryPages: 1,
          layoutCols: 3,
          rowsCount: 3,
        });
      } else if (totalCount <= 12) {
        pages.push({
          category: cat,
          products: catProds,
          pageIndex: 1,
          totalCategoryPages: 1,
          layoutCols: 4,
          rowsCount: 3,
        });
      } else {
        const itemsPerPage = totalCount <= 18 ? 9 : 12;
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        const cols: 3 | 4 = itemsPerPage === 9 ? 3 : 4;

        for (let i = 0; i < totalPages; i++) {
          const slice = catProds.slice(i * itemsPerPage, (i + 1) * itemsPerPage);
          pages.push({
            category: cat,
            products: slice,
            pageIndex: i + 1,
            totalCategoryPages: totalPages,
            layoutCols: cols,
            rowsCount: Math.ceil(slice.length / cols),
          });
        }
      }
    }

    return pages;
  }, [filteredProducts, sortedCategories, matchingCategoryIds]);

  // Total pages including cover
  const totalDocumentPages = categoryPages.length + 1;

  // Contact info helpers
  const phone1 = settings?.contacts?.phone1 || '+998 99 851 05 06';
  const phone2 = settings?.contacts?.phone2 || '+998 99 232 39 99';
  const email = settings?.contacts?.email || 'info@sanpack.uz';
  const website = 'sanpack.uz';
  const address =
    language === 'uz'
      ? settings?.contacts?.addressUz || 'Toshkent sh., Sergeli tumani, Yangi Sergeli ko‘ch., 14A'
      : settings?.contacts?.addressRu || 'г. Ташкент, Сергелийский р-н, ул. Янги Сергели, 14А';

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const origin = window.location.origin;
      const url = new URL(`${origin}/ru/catalog/print`);
      url.searchParams.set('prices', withPrices ? '1' : '0');
      url.searchParams.set('lang', language);
      if (selectedCategory) url.searchParams.set('category', selectedCategory);
      navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`min-h-screen text-slate-800 font-sans antialiased flex flex-col items-center ${embeddedInAdmin ? 'bg-transparent' : 'bg-slate-200'}`}>
      {/* =========================================================================
          INTEGRATED NATIVE CONTROL TOOLBAR (ADMIN PANEL STYLE)
          ========================================================================= */}
      <aside aria-label="Панель управления каталогом" className="no-print sticky top-2 z-40 w-full max-w-6xl px-2 sm:px-4 mb-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          {/* Left Group: Status / Filter info */}
          <div className="flex items-center gap-3">
            {!embeddedInAdmin && (
              <Link
                href="/catalog"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
                title="Вернуться на сайт"
              >
                <ArrowLeft className="size-4" />
              </Link>
            )}
            <div>
              <div className="text-xs font-bold text-[#03432D] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="size-4 text-[#03432D]" />
                <span>SANPACK Каталог А4</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {totalDocumentPages} стр. • {filteredProducts.length} позиций
              </div>
            </div>
          </div>

          {/* Center Controls: Prices, Language, Category */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Price Segmented Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setWithPrices(true)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  withPrices
                    ? 'bg-[#03432D] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                С ценами
              </button>
              <button
                type="button"
                onClick={() => setWithPrices(false)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  !withPrices
                    ? 'bg-[#03432D] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Без цен
              </button>
            </div>

            {/* Language Segmented Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {(['ru', 'uz', 'en'] as const).map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold uppercase transition ${
                    language === l
                      ? 'bg-[#03432D] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Category Hierarchical Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none max-w-[260px] truncate shadow-sm cursor-pointer"
            >
              <option value="">Все разделы ({initialProducts.length} тов.)</option>
              {parentCategories.map((parent) => {
                const children = sortedCategories.filter((c) => c.parentId === parent.id);
                const parentChildIds = new Set([parent.id, ...children.map((ch) => ch.id)]);
                const parentTotalProds = initialProducts.filter(
                  (p) => p.categoryId && parentChildIds.has(p.categoryId)
                ).length;

                return (
                  <optgroup
                    key={parent.id}
                    label={`${language === 'uz' ? parent.titleUz || parent.titleRu : parent.titleRu} (${parentTotalProds})`}
                  >
                    <option value={parent.id} className="font-bold">
                      📁 Все: {language === 'uz' ? parent.titleUz || parent.titleRu : parent.titleRu} ({parentTotalProds})
                    </option>
                    {children.map((child) => {
                      const childProds = initialProducts.filter(
                        (p) => p.categoryId === child.id || p.categorySlug === child.slug
                      ).length;
                      return (
                        <option key={child.id} value={child.id}>
                          &nbsp;&nbsp;↳ {language === 'uz' ? child.titleUz || child.titleRu : child.titleRu} ({childProds})
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Right Actions: Zoom, Copy Link, Fullscreen, Print */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.4, s - 0.1))}
                className="hover:text-black dark:hover:text-white p-1"
                title="Уменьшить масштаб"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="font-mono text-[11px] w-9 text-center font-semibold">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(1.2, s + 0.1))}
                className="hover:text-black dark:hover:text-white p-1"
                title="Увеличить масштаб"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Скопировать прямую ссылку на каталог"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Скопировано' : 'Ссылка'}</span>
            </button>

            {/* Open Fullscreen link */}
            <a
              href={`/ru/catalog/print?prices=${withPrices ? '1' : '0'}&lang=${language}${selectedCategory ? `&category=${selectedCategory}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Открыть каталог в новой вкладке"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden md:inline">На весь экран</span>
            </a>

            {/* PRINT / SAVE PDF BUTTON */}
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#03432D] hover:bg-[#023322] text-white font-bold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 text-xs transition active:scale-95"
            >
              <Printer className="size-4" />
              <span>Печать / Сохранить в PDF</span>
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          PRINT & DOCUMENT STYLES
          ========================================================================= */}
      <style jsx global>{`
        :root {
          --a4-width: 210mm;
          --a4-height: 297mm;
          --page-padding-x: 14mm;
          --page-padding-y: 14mm;
        }

        .a4-container {
          transform-origin: top center;
          transition: transform 0.2s ease;
        }

        .a4-page {
          width: var(--a4-width);
          height: var(--a4-height);
          background: white;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
          padding: var(--page-padding-y) var(--page-padding-x);
          display: flex;
          flex-direction: column;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .a4-page-cover {
          background-color: #03432D !important;
          color: #ffffff !important;
        }

        @media screen and (max-width: 230mm) {
          .a4-container {
            transform: none !important;
          }
          .a4-page {
            width: 100vw;
            height: auto;
            min-height: 141.4vw;
            box-shadow: none;
            padding: 5vw;
            margin-bottom: 12px;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            padding: 0 !important;
            margin: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .a4-container {
            transform: none !important;
          }
          .a4-page {
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 14mm 14mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .a4-page-cover {
            background-color: #03432D !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* =========================================================================
          DOCUMENT CONTAINER WITH LIVE SCALING
          ========================================================================= */}
      <div
        className="a4-container flex flex-col items-center pt-2 pb-16 print:pt-0 print:pb-0"
        style={{ transform: `scale(${scale})` }}
      >
        {/* =======================================================================
            PAGE 1: COVER PAGE (ЭЛЕГАНТНЫЙ ИЗУМРУДНЫЙ ТИТУЛЬНЫЙ ЛИСТ)
            ======================================================================= */}
        <div className="a4-page a4-page-cover justify-between">
          {/* Cover Header Bar */}
          <div className="flex justify-between items-center border-b border-emerald-800/80 pb-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
              SANPACK DISTRIBUTION LLC
            </span>
            <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider font-mono">
              sanpack.uz
            </span>
          </div>

          {/* Center Main Cover Content */}
          <div className="my-auto text-center flex flex-col items-center py-8">
            {/* Logo */}
            <div className="mb-10">
              <SanpackLogo variant="white" className="h-20 sm:h-24" />
            </div>

            {/* Subtitle Company Tagline */}
            <div className="text-sm font-medium text-emerald-200 uppercase tracking-wider mb-6">
              {language === 'uz'
                ? 'HoReCa va biznes uchun kompleks ta’minot'
                : 'Комплексные поставки для HoReCa и бизнеса'}
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl font-bold text-white uppercase tracking-normal leading-tight mb-3">
              {language === 'uz' ? 'Mahsulotlar katalogi' : 'Каталог продукции'}
            </h1>

            {/* Subtitle / Mode */}
            <h2 className="text-lg sm:text-xl font-medium text-emerald-100 uppercase tracking-wide mb-10">
              {withPrices
                ? language === 'uz'
                  ? 'Ulgurji narxlar ro‘yxati (Prays-list)'
                  : 'Оптовый прайс-лист продукции'
                : language === 'uz'
                  ? 'Taqdimot katalogi'
                  : 'Презентационный каталог'}
            </h2>

            {/* Clean Date / Year */}
            <div className="text-xs font-semibold text-emerald-300 uppercase tracking-widest">
              {new Intl.DateTimeFormat(language === 'uz' ? 'uz-UZ' : 'ru-RU', {
                month: 'long',
                year: 'numeric',
              }).format(new Date())}
            </div>
          </div>

          {/* Cover Footer (Clean White / Emerald Contacts) */}
          <div className="pt-5 border-t border-emerald-800/80 grid grid-cols-3 gap-4 text-xs text-emerald-100">
            {/* Phones */}
            <div className="flex items-start gap-2.5">
              <Phone className="size-4 text-emerald-300 shrink-0 mt-0.5" />
              <div className="font-mono text-[11px] font-semibold leading-relaxed">
                <div>{phone1}</div>
                <div>{phone2}</div>
              </div>
            </div>

            {/* Site & Email */}
            <div className="flex items-start gap-2.5 justify-center">
              <Mail className="size-4 text-emerald-300 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <div className="font-semibold text-white font-mono">{website}</div>
                <div className="text-emerald-200">{email}</div>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2.5 justify-end text-right">
              <MapPin className="size-4 text-emerald-300 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-snug">
                <div className="font-semibold text-white">{address}</div>
                <div className="text-emerald-300 mt-0.5">
                  {language === 'uz' ? 'Dush–Shan 9:00–18:00' : 'Пн–Сб 9:00–18:00'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            PAGES 2+: EDITORIAL BROCHURE STYLE WITH DELICATE THIN GREY DIVIDER GRID
            ======================================================================= */}
        {categoryPages.map((pageData, pageIdx) => {
          const { category, products: pageProds, pageIndex, totalCategoryPages, layoutCols, rowsCount } = pageData;
          const currentDocPageNumber = pageIdx + 2;

          // Grid class based on solved layout
          const gridColsClass =
            layoutCols === 2
              ? 'grid-cols-2'
              : layoutCols === 3
                ? 'grid-cols-3'
                : 'grid-cols-4';

          // Adaptive image and padding sizing based on number of rows (e.g. 3 rows for 9 or 12 items)
          const isThreeRows = rowsCount >= 3 || pageProds.length > 8;
          const imageAreaHeight =
            isThreeRows
              ? 'h-24 sm:h-28'
              : layoutCols === 2
                ? 'h-40 sm:h-44'
                : layoutCols === 3
                  ? 'h-32 sm:h-36'
                  : 'h-28 sm:h-30';

          const cellPadding = isThreeRows ? 'p-2.5 sm:p-3' : 'p-3 sm:p-3.5';

          const categoryTitle =
            language === 'uz'
              ? category.titleUz || translateTitleToUzbek(category.titleRu)
              : category.titleRu;

          const categorySubtitle =
            language === 'uz'
              ? category.titleRu
              : category.titleUz;

          // Calculate total slots for an even, balanced grid matrix
          const totalSlots = Math.ceil(pageProds.length / layoutCols) * layoutCols;
          const emptySlotsCount = totalSlots - pageProds.length;

          return (
            <div key={`${category.id}-${pageIndex}`} className="a4-page justify-between">
              {/* TOP SOLID GREEN HEADER BANNER (TALLER, LARGER LOGO, BOTH PHONE NUMBERS) */}
              <header className="bg-[#03432D] text-white px-5 py-3.5 rounded-none flex justify-between items-center shrink-0 mb-4">
                <div className="flex items-center gap-3.5">
                  <SanpackLogo variant="white" className="h-7 sm:h-8" />
                  <div className="h-5 w-px bg-emerald-500/40" />
                  <div className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider leading-none">
                    {language === 'uz' ? 'Mahsulotlar katalogi' : 'Каталог продукции'}
                  </div>
                </div>
                <div className="text-right flex items-center gap-2.5 text-[10.5px] text-emerald-100 font-medium font-mono">
                  <span className="font-semibold text-white">{phone1}</span>
                  <span className="opacity-40">|</span>
                  <span className="font-semibold text-white">{phone2}</span>
                  <span className="opacity-40">|</span>
                  <span className="font-semibold text-emerald-300">{website}</span>
                </div>
              </header>

              {/* CATEGORY TITLE & SUBTITLE (SOFT ELEGANT BRAND GREEN / SLATE, NO HARSH PITCH BLACK) */}
              <section className="mb-3.5 shrink-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[#03432D] uppercase leading-none tracking-normal">
                  {categoryTitle}
                </h1>
                {categorySubtitle && (
                  <h2 className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-wide">
                    {categorySubtitle}
                  </h2>
                )}
              </section>

              {/* PRODUCTS GRID MATRIX WITH DELICATE THIN GREY DIVIDERS */}
              <main
                className={`flex-1 grid ${gridColsClass} content-start border-t border-l border-slate-200/80`}
              >
                {pageProds.map((product) => {
                  // Full localized title
                  const title = getLocalizedProductTitle(product, language);

                  // Specs list with localized terms (clean physical specs only, no redundant sales unit)
                  const specs: string[] = [];
                  if (product.attributes?.size) {
                    const sizeVal = String(product.attributes.size).replace(/см/gi, 'sm');
                    specs.push(sizeVal);
                  }
                  if (product.attributes?.volume) {
                    const volVal = String(product.attributes.volume).replace(/л\b/gi, 'l');
                    specs.push(volVal);
                  }
                  if (product.attributes?.weight) {
                    const weightVal = String(product.attributes.weight).replace(/кг/gi, 'kg');
                    specs.push(weightVal);
                  }
                  if (product.attributes?.package_quantity) {
                    specs.push(
                      language === 'uz'
                        ? `${product.attributes.package_quantity} dona qadoqda`
                        : `${product.attributes.package_quantity} шт в упаковке`
                    );
                  }
                  if (product.attributes?.material) {
                    specs.push(String(product.attributes.material));
                  }

                  // Pricing
                  let displayPrice = '';
                  if (withPrices) {
                    if (product.variants && product.variants.length > 0 && product.variants[0].price) {
                      displayPrice = formatMoney(product.variants[0].price, language, product.currency || 'UZS');
                    } else if (product.price) {
                      displayPrice = formatMoney(product.price, language, product.currency || 'UZS');
                    }
                  }

                  const salesUnitLabel = getLocalizedSalesUnitLabel(product.salesUnit, language);

                  return (
                    <div
                      key={product.id}
                      className={`border-r border-b border-slate-200/80 ${cellPadding} flex flex-col justify-between items-start h-full bg-white`}
                    >
                      {/* Product Text Top (Clean, Readable, Brand Green) */}
                      <div className="w-full">
                        {/* Title in Brand Green */}
                        <h3 className="text-[11.5px] sm:text-xs font-bold text-[#03432D] uppercase tracking-normal leading-snug">
                          {title}
                        </h3>

                        {/* Specs (No redundant "Единица: кг") */}
                        {specs.length > 0 && (
                          <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5 space-y-0.5">
                            {specs.slice(0, 3).map((s, idx) => (
                              <div key={idx}>{s}</div>
                            ))}
                          </div>
                        )}

                        {/* Clean Price Line */}
                        {withPrices && displayPrice && (
                          <div className="mt-1 text-xs font-bold text-slate-800 flex items-baseline gap-1">
                            <span>{displayPrice}</span>
                            <span className="text-[10px] font-normal text-slate-500">
                              / {salesUnitLabel}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Image Bottom (Clean flat image with zero shadow) */}
                      <div className={`w-full ${imageAreaHeight} flex items-center justify-center mt-2 bg-transparent`}>
                        {product.mainImage || product.images?.[0] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={product.mainImage || product.images?.[0]}
                            alt={title}
                            className="max-w-full max-h-full object-contain"
                            loading="eager"
                          />
                        ) : (
                          <Package className="size-8 text-slate-300" />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty cells to complete the rectangular matrix lines */}
                {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className={`border-r border-b border-slate-200/80 ${cellPadding} bg-white`}
                  />
                ))}
              </main>

              {/* PAGE FOOTER (НИЖНИЙ КОЛОНТИТУЛ) */}
              <footer className="mt-auto pt-3 border-t border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    {language === 'uz'
                      ? 'Sanpack Distribution • HoReCa uchun kompleks ta’minot'
                      : 'Sanpack Distribution • Комплексное снабжение HoReCa'}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-400 font-mono">
                  {String(currentDocPageNumber).padStart(2, '0')} / {String(totalDocumentPages).padStart(2, '0')}
                </div>
              </footer>
            </div>
          );
        })}
      </div>
    </div>
  );
}
