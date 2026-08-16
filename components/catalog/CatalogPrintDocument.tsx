'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Globe,
  DollarSign,
  Share2,
  Check,
  ZoomIn,
  ZoomOut,
  Layers,
  ArrowLeft,
  Package,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  Building2,
  Sparkles,
  Grid2X2,
  LayoutGrid,
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
    density?: 4 | 6 | 8;
  };
  embeddedInAdmin?: boolean;
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
  const [density, setDensity] = useState<4 | 6 | 8>(initialOptions.density || 6);
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

  // Group products by category and chunk into pages according to selected density
  const categoryPages = useMemo(() => {
    const itemsPerPage = density;
    const pages: { category: Category; products: Product[]; pageIndex: number; totalCategoryPages: number }[] = [];

    const activeCategories = selectedCategory
      ? sortedCategories.filter((c) => c.id === selectedCategory || c.slug === selectedCategory)
      : sortedCategories;

    for (const cat of activeCategories) {
      const catProds = filteredProducts.filter(
        (p) => p.categoryId === cat.id || p.categorySlug === cat.slug
      );
      if (catProds.length === 0) continue;

      const totalPages = Math.ceil(catProds.length / itemsPerPage);
      for (let i = 0; i < totalPages; i++) {
        pages.push({
          category: cat,
          products: catProds.slice(i * itemsPerPage, (i + 1) * itemsPerPage),
          pageIndex: i + 1,
          totalCategoryPages: totalPages,
        });
      }
    }

    return pages;
  }, [filteredProducts, sortedCategories, selectedCategory, density]);

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
      url.searchParams.set('density', String(density));
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
      <aside aria-label="Панель печати каталога" className="no-print sticky top-4 z-50 w-full max-w-6xl px-4 pointer-events-none mb-4">
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

            {/* Density Selector (4, 6, 8) */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700" title="Количество товаров на страницу">
              {([4, 6, 8] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`px-2 py-1 rounded-md font-bold text-[11px] transition ${
                    density === d ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d === 4 ? '4 (Крупно)' : d === 6 ? '6 (Оптимально)' : '8 (Компактно)'}
                </button>
              ))}
            </div>

            {/* Category selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none max-w-[180px] truncate"
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
          --page-padding-x: 13mm;
          --page-padding-y: 13mm;
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
            padding: 13mm 13mm !important;
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
        <div className="a4-page justify-between border-t-8 border-[#0F6E43]">
          {/* Cover Header Bar */}
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0F6E43]">
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
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0F6E43] text-xs font-bold uppercase tracking-widest mb-4">
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
                <Building2 className="size-6 text-[#0F6E43] mb-2" />
                <div className="text-xs font-black text-slate-900 uppercase">160+ позиций</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-1">
                  Сертифицированная продукция
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <ShieldCheck className="size-6 text-[#0F6E43] mb-2" />
                <div className="text-xs font-black text-slate-900 uppercase">Собственное пр-во</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-1">
                  Гарантия качества и стандартов
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <Truck className="size-6 text-[#0F6E43] mb-2" />
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
              <Phone className="size-4 text-[#0F6E43] shrink-0" />
              <div className="font-mono text-[11px] font-bold">
                <div>{phone1}</div>
                <div>{phone2}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center">
              <Mail className="size-4 text-[#0F6E43] shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-[#0F6E43]">{website}</div>
                <div className="text-slate-500">{email}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end text-right">
              <MapPin className="size-4 text-[#0F6E43] shrink-0" />
              <div className="text-[11px] text-slate-600 leading-tight">
                <div className="font-bold">{address}</div>
                <div className="text-slate-400">Пн-Сб 9:00 - 18:00</div>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            PAGES 2+: CATEGORY PRODUCT GRIDS (4, 6, OR 8 PRODUCTS PER A4 PAGE)
            ======================================================================= */}
        {categoryPages.map((pageData, pageIdx) => {
          const { category, products: pageProds, pageIndex, totalCategoryPages } = pageData;
          const currentDocPageNumber = pageIdx + 2;

          // Card layout sizing classes based on density
          const gridColsClass = density === 4 ? 'grid-cols-2 gap-4' : density === 6 ? 'grid-cols-2 gap-3.5' : 'grid-cols-2 gap-2.5';
          const imageSizeClass = density === 4 ? 'w-32 h-32' : density === 6 ? 'w-28 h-28' : 'w-24 h-24';

          return (
            <div key={`${category.id}-${pageIndex}`} className="a4-page justify-between">
              {/* PAGE HEADER (КОЛОНТИТУЛ) */}
              <header className="flex justify-between items-end border-b-2 border-[#0F6E43] pb-2 mb-3 shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest leading-none">
                    SANPACK • {language === 'uz' ? 'Mahsulotlar katalogi' : 'Каталог продукции'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wide">
                    {withPrices
                      ? language === 'uz'
                        ? 'Ulgurji narxlar'
                        : 'Оптовый прайс-лист'
                      : language === 'uz'
                        ? 'Taqdimot'
                        : 'Презентация'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-900 font-mono tracking-tight">
                    {phone1} <span className="text-slate-300 mx-1">|</span> {phone2}
                  </p>
                  <p className="text-[10px] text-[#0F6E43] font-black uppercase tracking-widest mt-0.5">
                    {website}
                  </p>
                </div>
              </header>

              {/* SECTION HEADER (ЗАГОЛОВОК РАЗДЕЛА) */}
              <section className="mb-3 shrink-0 flex justify-between items-center">
                <div className="border-l-4 border-[#0F6E43] pl-3 py-0.5">
                  <h1 className="text-xl font-black text-slate-900 uppercase leading-none tracking-tight">
                    {language === 'uz' ? category.titleUz || category.titleRu : category.titleRu}
                  </h1>
                  {category.titleUz && language !== 'uz' && (
                    <h2 className="text-xs text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">
                      {category.titleUz}
                    </h2>
                  )}
                </div>
                <div className="bg-slate-100 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {totalCategoryPages > 1
                    ? `Часть ${pageIndex} из ${totalCategoryPages}`
                    : `Раздел`}
                </div>
              </section>

              {/* MAIN PRODUCTS GRID */}
              <main className={`flex-1 grid ${gridColsClass} content-start`}>
                {pageProds.map((product) => {
                  // Title
                  const title =
                    language === 'uz'
                      ? product.titleUz || product.titleRu
                      : language === 'en'
                        ? product.titleEn || product.titleRu
                        : product.titleRu;

                  // Attributes & specs formatting
                  const specs: string[] = [];
                  if (product.attributes?.size) specs.push(String(product.attributes.size));
                  if (product.attributes?.volume) specs.push(String(product.attributes.volume));
                  if (product.attributes?.weight) specs.push(String(product.attributes.weight));
                  if (product.attributes?.package_quantity) {
                    specs.push(`${product.attributes.package_quantity} шт/уп`);
                  }
                  if (product.attributes?.material) specs.push(String(product.attributes.material));

                  const specString = specs.slice(0, 3).join(' | ');

                  // Pricing
                  let displayPrice = '';
                  if (withPrices) {
                    if (product.variants && product.variants.length > 0 && product.variants[0].price) {
                      displayPrice = formatMoney(product.variants[0].price, language, product.currency || 'UZS');
                    } else if (product.price) {
                      displayPrice = formatMoney(product.price, language, product.currency || 'UZS');
                    }
                  }

                  const salesUnitText = product.salesUnit || 'шт';

                  return (
                    <article
                      key={product.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-2.5 flex flex-col justify-between relative overflow-hidden shadow-sm"
                    >
                      <div className="flex items-center gap-3 h-full">
                        {/* Image (Left) - Substantially Larger with clean backdrop */}
                        <div className={`${imageSizeClass} shrink-0 bg-white rounded-xl p-1.5 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner`}>
                          {product.mainImage || product.images?.[0] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={product.mainImage || product.images?.[0]}
                              alt={title}
                              className="w-full h-full object-contain"
                              loading="eager"
                            />
                          ) : (
                            <Package className="size-10 text-slate-300" />
                          )}
                        </div>

                        {/* Details (Right) */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block truncate mb-0.5">
                              {category.titleRu}
                            </span>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-snug line-clamp-2 mb-1">
                              {title}
                            </h3>

                            {specString && (
                              <p className="text-[10px] font-medium text-slate-500 line-clamp-2 leading-tight">
                                {specString}
                              </p>
                            )}
                          </div>

                          {/* Price / Packaging Badge */}
                          <div className="mt-2 flex items-center justify-between gap-1">
                            {withPrices && displayPrice ? (
                              <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg leading-none shadow-sm flex items-center gap-1">
                                <span>{displayPrice}</span>
                                <span className="text-[9px] font-normal opacity-90">
                                  / {salesUnitText}
                                </span>
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg leading-none">
                                {salesUnitText.toUpperCase()}
                              </span>
                            )}

                            {product.sku && (
                              <span className="text-[9px] font-mono text-slate-400">
                                {product.sku}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </main>

              {/* PAGE FOOTER (НИЖНИЙ КОЛОНТИТУЛ) */}
              <footer className="mt-auto pt-2.5 border-t border-slate-200 flex justify-between items-center shrink-0">
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
