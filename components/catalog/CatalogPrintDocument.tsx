'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Share2,
  Check,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Package,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  Building2,
  Sparkles,
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
  const [scale, setScale] = useState<number>(embeddedInAdmin ? 0.75 : 0.85);
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

  // Filter products by selected category (if any) and published status
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      if (p.status && p.status !== 'published') return false;
      if (selectedCategory && p.categoryId !== selectedCategory && p.categorySlug !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [initialProducts, selectedCategory]);

  // Intelligent category page solver:
  // - If category has <= 6 items -> 1 page of 6 (3 cols x 2 rows)
  // - If category has 7..8 items -> 1 page of 8 (4 cols x 2 rows)
  // - If category has 9..12 items -> 2 pages of 6 (3 cols x 2 rows)
  // - If category has 13..16 items -> 2 pages of 8 (4 cols x 2 rows)
  // - If more -> chunk into batches of 6 or 8 so no page has fewer than 3 items!
  const categoryPages = useMemo(() => {
    const pages: CategoryPageChunk[] = [];

    const activeCategories = selectedCategory
      ? sortedCategories.filter((c) => c.id === selectedCategory || c.slug === selectedCategory)
      : sortedCategories;

    for (const cat of activeCategories) {
      const catProds = filteredProducts.filter(
        (p) => p.categoryId === cat.id || p.categorySlug === cat.slug
      );
      if (catProds.length === 0) continue;

      const totalCount = catProds.length;

      // Determine optimal chunking
      if (totalCount <= 6) {
        pages.push({
          category: cat,
          products: catProds,
          pageIndex: 1,
          totalCategoryPages: 1,
          layoutCols: totalCount <= 4 ? 2 : 3,
        });
      } else if (totalCount <= 8) {
        pages.push({
          category: cat,
          products: catProds,
          pageIndex: 1,
          totalCategoryPages: 1,
          layoutCols: 4,
        });
      } else {
        // More than 8 items: chunk into balanced pages of 6 or 8
        const itemsPerPage = totalCount <= 12 ? 6 : 8;
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        const cols: 3 | 4 = itemsPerPage === 6 ? 3 : 4;

        for (let i = 0; i < totalPages; i++) {
          pages.push({
            category: cat,
            products: catProds.slice(i * itemsPerPage, (i + 1) * itemsPerPage),
            pageIndex: i + 1,
            totalCategoryPages: totalPages,
            layoutCols: cols,
          });
        }
      }
    }

    return pages;
  }, [filteredProducts, sortedCategories, selectedCategory]);

  // Total pages including cover
  const totalDocumentPages = categoryPages.length + 1;

  // Contact info helpers
  const phone1 = settings?.contacts?.phone1 || '+998 99 851 05 06';
  const phone2 = settings?.contacts?.phone2 || '+998 99 232 39 99';
  const email = settings?.contacts?.email || 'info@sanpack.uz';
  const website = 'sanpack.uz';
  const address =
    language === 'uz'
      ? settings?.contacts?.addressUz || 'Toshkent sh., O‘zbekiston'
      : settings?.contacts?.addressRu || 'г. Ташкент, Узбекистан';

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = new URL(window.location.href);
      url.searchParams.set('prices', withPrices ? '1' : '0');
      url.searchParams.set('lang', language);
      if (selectedCategory) url.searchParams.set('category', selectedCategory);
      navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`min-h-screen text-slate-900 font-sans antialiased flex flex-col items-center ${embeddedInAdmin ? 'bg-transparent' : 'bg-slate-200'}`}>
      {/* =========================================================================
          FLOATING ACTION BAR (SCREEN ONLY - HIDDEN ON PRINT)
          ========================================================================= */}
      <aside aria-label="Панель печати каталога" className="no-print sticky top-4 z-50 w-full max-w-5xl px-4 pointer-events-none mb-4">
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/70 flex flex-wrap items-center justify-between gap-3">
          {/* Back link & Title */}
          <div className="flex items-center gap-3">
            {!embeddedInAdmin && (
              <Link
                href="/catalog"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Вернуться на сайт"
              >
                <ArrowLeft className="size-4" />
              </Link>
            )}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                <span>SANPACK Каталог продукции (A4)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {totalDocumentPages} стр. • {filteredProducts.length} позиций
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Price Toggle */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setWithPrices(true)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  withPrices ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                С ценами
              </button>
              <button
                onClick={() => setWithPrices(false)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  !withPrices ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Без цен
              </button>
            </div>

            {/* Language Switcher */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              {(['ru', 'uz', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-2 py-1 rounded-md font-bold uppercase transition ${
                    language === l ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Category selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none max-w-[200px] truncate"
            >
              <option value="">Все категории ({initialProducts.length})</option>
              {sortedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titleRu}
                </option>
              ))}
            </select>
          </div>

          {/* Actions: Zoom, Copy Link, Print */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-slate-300 text-xs">
              <button
                onClick={() => setScale((s) => Math.max(0.4, s - 0.1))}
                className="hover:text-white p-0.5"
                title="Уменьшить"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="font-mono text-[10px] w-8 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale((s) => Math.min(1.2, s + 0.1))}
                className="hover:text-white p-0.5"
                title="Увеличить"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="Скопировать ссылку на каталог"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Share2 className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Скопировано' : 'Ссылка'}</span>
            </button>

            {/* PRINT / SAVE PDF BUTTON */}
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-xs transition active:scale-95"
            >
              <Printer className="size-4" />
              <span>Печать / Экспорт в PDF</span>
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
            PAGE 1: COVER PAGE (ТИТУЛЬНЫЙ ЛИСТ)
            ======================================================================= */}
        <div className="a4-page justify-between border-t-8 border-[#03432D]">
          {/* Cover Header Bar */}
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#03432D]">
              SANPACK Distribution LLC
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              sanpack.uz
            </span>
          </div>

          {/* Center Main Cover Content */}
          <div className="my-auto text-center flex flex-col items-center py-6">
            {/* Logo */}
            <div className="mb-8">
              <SanpackLogo variant="green" className="h-16" />
            </div>

            {/* Sub-badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#03432D] text-xs font-bold uppercase tracking-widest mb-4">
              <Sparkles className="size-3.5" />
              <span>
                {language === 'uz'
                  ? 'HoReCa va biznes uchun kompleks ta’minot'
                  : 'Комплексные поставки для HoReCa и бизнеса'}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3">
              {language === 'uz' ? 'Mahsulotlar katalogi' : 'Каталог продукции'}
            </h1>

            {/* Subtitle / Mode */}
            <h2 className="text-base font-bold text-slate-600 uppercase tracking-wider mb-8">
              {withPrices
                ? language === 'uz'
                  ? 'Ulgurji narxlar ro‘yxati (Prays-list)'
                  : 'Оптовый прайс-лист продукции'
                : language === 'uz'
                  ? 'Taqdimot katalogi'
                  : 'Презентационный каталог'}
            </h2>

            {/* Highlighted Metrics / Features */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-lg mb-8 text-left">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <Building2 className="size-6 text-[#03432D] mb-2" />
                <div className="text-xs font-black text-slate-900 uppercase">160+ позиций</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-1">
                  Сертифицированная продукция
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <ShieldCheck className="size-6 text-[#03432D] mb-2" />
                <div className="text-xs font-black text-slate-900 uppercase">Собственное пр-во</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-1">
                  Гарантия качества и стандартов
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <Truck className="size-6 text-[#03432D] mb-2" />
                <div className="text-xs font-black text-slate-900 uppercase">Быстрая доставка</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-1">
                  По Ташкенту и всему Узбекистану
                </div>
              </div>
            </div>

            {/* Generation Date */}
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {new Intl.DateTimeFormat(language === 'uz' ? 'uz-UZ' : 'ru-RU', {
                month: 'long',
                year: 'numeric',
              }).format(new Date())}
            </div>
          </div>

          {/* Cover Footer (Contacts) */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-[#03432D] shrink-0" />
              <div className="font-mono text-[11px] font-bold">
                <div>{phone1}</div>
                <div>{phone2}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center">
              <Mail className="size-4 text-[#03432D] shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-[#03432D]">{website}</div>
                <div className="text-slate-500">{email}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end text-right">
              <MapPin className="size-4 text-[#03432D] shrink-0" />
              <div className="text-[11px] text-slate-600 leading-tight">
                <div className="font-bold">{address}</div>
                <div className="text-slate-400">Пн-Сб 9:00 - 18:00</div>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            PAGES 2+: EDITORIAL BROCHURE STYLE (MATCHING CDR PDF LAYOUT)
            ======================================================================= */}
        {categoryPages.map((pageData, pageIdx) => {
          const { category, products: pageProds, pageIndex, totalCategoryPages, layoutCols } = pageData;
          const currentDocPageNumber = pageIdx + 2;

          // Grid class based on solved layout
          const gridColsClass =
            layoutCols === 2
              ? 'grid-cols-2 gap-8'
              : layoutCols === 3
                ? 'grid-cols-3 gap-6'
                : 'grid-cols-4 gap-4';

          const imageAreaHeight =
            layoutCols === 2 ? 'h-48' : layoutCols === 3 ? 'h-40' : 'h-32';

          return (
            <div key={`${category.id}-${pageIndex}`} className="a4-page justify-between">
              {/* TOP SOLID GREEN HEADER BANNER (LIKE USER'S PDF CATALOG) */}
              <header className="bg-[#03432D] text-white px-4 py-2.5 rounded-lg flex justify-between items-center shrink-0 mb-4">
                <div className="flex items-center gap-3">
                  <SanpackLogo variant="white" className="h-5" />
                  <div className="h-4 w-px bg-emerald-500/50" />
                  <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-widest leading-none">
                    {language === 'uz' ? 'Mahsulotlar katalogi' : 'Каталог продукции'}
                  </div>
                </div>
                <div className="text-right flex items-center gap-3 text-[10px] text-emerald-200 font-medium">
                  <span className="font-mono font-bold text-white">{phone1}</span>
                  <span className="opacity-40">|</span>
                  <span className="font-mono font-bold text-white">{website}</span>
                </div>
              </header>

              {/* CATEGORY TITLE & SUBTITLE */}
              <section className="mb-4 shrink-0">
                <h1 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                  {language === 'uz' ? category.titleUz || category.titleRu : category.titleRu}
                </h1>
                {category.titleUz && language !== 'uz' && (
                  <h2 className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide">
                    {category.titleUz}
                  </h2>
                )}
              </section>

              {/* PRODUCTS GRID (EDITORIAL FLOATING STYLE - NO HEAVY CARD BOXES) */}
              <main className={`flex-1 grid ${gridColsClass} content-start py-2`}>
                {pageProds.map((product) => {
                  // Full Title (no premature ellipsis)
                  const title =
                    language === 'uz'
                      ? product.titleUz || product.titleRu
                      : language === 'en'
                        ? product.titleEn || product.titleRu
                        : product.titleRu;

                  // Specs list
                  const specs: string[] = [];
                  if (product.attributes?.size) specs.push(String(product.attributes.size));
                  if (product.attributes?.volume) specs.push(String(product.attributes.volume));
                  if (product.attributes?.weight) specs.push(String(product.attributes.weight));
                  if (product.attributes?.package_quantity) {
                    specs.push(`${product.attributes.package_quantity} шт в упаковке`);
                  } else if (product.salesUnit && product.salesUnit !== 'шт') {
                    specs.push(`Единица: ${product.salesUnit}`);
                  }
                  if (product.attributes?.material) specs.push(String(product.attributes.material));

                  // Pricing
                  let displayPrice = '';
                  if (withPrices) {
                    if (product.variants && product.variants.length > 0 && product.variants[0].price) {
                      displayPrice = formatMoney(product.variants[0].price, language, product.currency || 'UZS');
                    } else if (product.price) {
                      displayPrice = formatMoney(product.price, language, product.currency || 'UZS');
                    }
                  }

                  return (
                    <div
                      key={product.id}
                      className="flex flex-col justify-between items-start h-full group"
                    >
                      {/* Product Text Top */}
                      <div className="w-full">
                        {/* Title in Brand Green */}
                        <h3 className="text-xs sm:text-sm font-black text-[#03432D] uppercase tracking-tight leading-snug">
                          {title}
                        </h3>

                        {/* Specs */}
                        {specs.length > 0 && (
                          <div className="text-[11px] text-slate-600 font-medium leading-tight mt-1 space-y-0.5">
                            {specs.slice(0, 3).map((s, idx) => (
                              <div key={idx}>{s}</div>
                            ))}
                          </div>
                        )}

                        {/* Clean Price Line (No neon pills) */}
                        {withPrices && displayPrice && (
                          <div className="mt-1.5 text-xs font-black text-slate-900 flex items-baseline gap-1">
                            <span>{displayPrice}</span>
                            <span className="text-[10px] font-normal text-slate-500">
                              / {product.salesUnit || 'уп'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Image Bottom (Floating on pure white paper) */}
                      <div className={`w-full ${imageAreaHeight} flex items-center justify-center mt-3 relative`}>
                        {product.mainImage || product.images?.[0] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={product.mainImage || product.images?.[0]}
                            alt={title}
                            className="max-w-full max-h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
                            loading="eager"
                          />
                        ) : (
                          <Package className="size-12 text-slate-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </main>

              {/* PAGE FOOTER (НИЖНИЙ КОЛОНТИТУЛ) */}
              <footer className="mt-auto pt-3 border-t border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Sanpack Distribution • Комплексное снабжение HoReCa
                  </span>
                </div>
                <div className="text-xs font-black text-slate-400 font-mono">
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
