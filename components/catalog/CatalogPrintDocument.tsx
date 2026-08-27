'use client';

import React, { useState, useMemo, useEffect, type CSSProperties } from 'react';
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
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';
import type { Category, ClientPartner, Language, Product, SiteSettings } from '@/types';
import { formatMoney } from '@/lib/catalog/productPresentation';
import { localizeSeedAttributeValue } from '@/lib/catalog/seedProductLocalization';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { getCategoryTitle } from '@/lib/i18n/categoryText';
import {
  getCatalogCompanyName,
  getCatalogDocumentTheme,
  getCatalogFilename,
  getCatalogPrintPath,
  getCatalogSiteLabel,
} from '@/lib/documents/catalogIdentity';
import {
  formatCatalogPdfMessage,
  getCatalogPdfMessages,
} from '@/lib/i18n/catalogPdfMessages';

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
  generatedAt: string;
}

interface CategoryPageChunk {
  category: Category;
  products: Product[];
  pageIndex: number;
  totalCategoryPages: number;
  layoutCols: 2 | 3 | 4;
  rowsCount: number;
}

const A4_WIDTH_PX = (210 / 25.4) * 96;
const PREVIEW_INLINE_GUTTER_PX = 16;

function getLocalizedProductTitle(product: Product, language: Language): string {
  return resolveLocalizedText(language, {
    ru: product.titleRu,
    uz: product.titleUz,
    en: product.titleEn,
    zh: product.titleZh,
  }).text;
}

function getLocalizedCategoryTitle(category: Category, language: Language): string {
  const localized = resolveLocalizedText(language, {
    ru: category.titleRu,
    uz: category.titleUz,
    en: category.titleEn,
    zh: category.titleZh,
  }).text;
  return getCategoryTitle(category, language, localized);
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
  if (language === 'zh') {
    if (clean.includes('рулон') || clean === 'rulon') return '卷';
    if (clean.includes('упаковк') || clean === 'qadoq') return '包';
    if (clean.includes('блок')) return '组';
    if (clean.includes('коробк') || clean === 'quti') return '箱';
    if (clean.includes('мешок') || clean === 'qop') return '袋';
    if (clean.includes('кг') || clean === 'kg') return '公斤';
    return '件';
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
  generatedAt,
}: CatalogPrintDocumentProps) {
  const router = useRouter();
  // State
  const [withPrices, setWithPrices] = useState<boolean>(initialOptions.withPrices !== false);
  const [language, setLanguage] = useState<Language>(initialOptions.language || 'ru');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialOptions.categoryId || '');
  const [scale, setScale] = useState<number>(embeddedInAdmin ? 0.78 : 0.85);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const previewScale = previewWidth === null
    ? scale
    : Math.min(scale, Math.max(0.25, (previewWidth - PREVIEW_INLINE_GUTTER_PX) / A4_WIDTH_PX));
  const documentDate = useMemo(() => {
    const locale = language === 'uz' ? 'uz-UZ' : language === 'en' ? 'en-GB' : language === 'zh' ? 'zh-CN' : 'ru-RU';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(generatedAt));
  }, [generatedAt, language]);
  const copy = getCatalogPdfMessages(language).studio;
  const companyName = settings ? getCatalogCompanyName(settings) : 'Storefront';
  const website = getCatalogSiteLabel(process.env.NEXT_PUBLIC_SITE_URL);
  const documentTheme = getCatalogDocumentTheme(settings?.design);
  const catalogTheme = {
    '--catalog-brand': documentTheme.brand,
    '--catalog-brand-deep': documentTheme.brandDeep,
    '--catalog-accent': documentTheme.accent,
    '--catalog-on-brand': documentTheme.onBrand,
    '--catalog-on-brand-deep': documentTheme.onBrandDeep,
  } as CSSProperties;

  // Set page title for nice PDF export filename
  useEffect(() => {
    document.title = getCatalogFilename(withPrices, language).replace(/\.pdf$/i, '');
  }, [withPrices, language]);

  useEffect(() => {
    const updatePreviewWidth = () => setPreviewWidth(window.visualViewport?.width ?? window.innerWidth);
    updatePreviewWidth();
    window.addEventListener('resize', updatePreviewWidth);
    window.visualViewport?.addEventListener('resize', updatePreviewWidth);
    return () => {
      window.removeEventListener('resize', updatePreviewWidth);
      window.visualViewport?.removeEventListener('resize', updatePreviewWidth);
    };
  }, []);

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    if (!embeddedInAdmin) {
      router.replace(
        getCatalogPrintPath(withPrices, nextLanguage, selectedCategory || undefined),
        { scroll: false },
      );
    }
  };

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
  const phone1 = settings?.contacts?.phone1?.trim() || '';
  const phone2 = settings?.contacts?.phone2?.trim() || '';
  const email = settings?.contacts?.email?.trim() || '';
  const address =
    (language === 'uz'
      ? settings?.contacts?.addressUz
      : language === 'en'
        ? settings?.contacts?.addressEn
        : language === 'zh'
          ? settings?.contacts?.addressZh || settings?.contacts?.addressEn
        : settings?.contacts?.addressRu
    )?.trim() || '';
  const workingHours =
    (language === 'uz'
      ? settings?.contacts?.workingHoursUz
      : language === 'en'
        ? settings?.contacts?.workingHoursEn
        : language === 'zh'
          ? settings?.contacts?.workingHoursZh || settings?.contacts?.workingHoursEn
        : settings?.contacts?.workingHoursRu
    )?.trim() || '';

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const origin = window.location.origin;
      const url = new URL(
        getCatalogPrintPath(withPrices, language, selectedCategory || undefined),
        origin,
      );
      navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={catalogTheme} className={`min-h-screen font-sans antialiased flex flex-col items-center text-[var(--sp-ink)] ${embeddedInAdmin ? 'bg-transparent' : 'bg-[var(--sp-canvas)]'}`}>
      {/* =========================================================================
          INTEGRATED CONTROL TOOLBAR
          ========================================================================= */}
      <aside aria-label={copy.controlPanel} className="no-print static z-40 mb-3 w-full max-w-6xl px-2 sm:sticky sm:top-2 sm:mb-4 sm:px-4">
        <div className="grid grid-cols-1 items-center gap-2 rounded-[var(--sp-radius)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-2 shadow-sm sm:gap-3 sm:p-4">
          {/* Left Group: Status / Filter info */}
          <div className="flex items-center gap-3">
            {!embeddedInAdmin && (
              <Link
                href={`/${language}/catalog`}
                className="rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-2 text-[var(--sp-ink)] transition hover:bg-[var(--sp-surface-hover)]"
                title={copy.backToSite}
                aria-label={copy.backToSite}
              >
                <ArrowLeft className="size-4" />
              </Link>
            )}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <BrandLogo
                src={settings?.company.logo}
                srcDark={settings?.company.logoDark || '/logo-white.svg'}
                label={companyName}
                className="hidden h-8 max-w-32 sm:block"
              />
              <div className="min-w-0 sm:border-l sm:border-[var(--sp-line)] sm:pl-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--sp-brand)]">
                  <FileText className="size-4 shrink-0" />
                  <span className="truncate">{copy.a4Catalog}</span>
                </div>
                <div className="text-[11px] font-medium text-[var(--sp-ink-secondary)]">
                  {totalDocumentPages} {copy.pages} • {filteredProducts.length} {copy.products}
                </div>
                {documentDate ? <div className="text-[10px] text-[var(--sp-ink-muted)]">{formatCatalogPdfMessage(copy.validOn, { date: documentDate })}</div> : null}
              </div>
            </div>
          </div>

          {/* Center Controls: Prices, Language, Category in Brand Theme */}
          <div className="no-scrollbar flex min-w-0 flex-nowrap items-center justify-start gap-2 overflow-x-auto border-t border-[var(--sp-line-soft)] pt-2 text-xs sm:flex-wrap sm:gap-2.5 sm:pt-3">
            {/* Price Segmented Toggle */}
            <div className="flex shrink-0 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-1">
              <button
                type="button"
                onClick={() => setWithPrices(true)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  withPrices
                    ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-sm'
                    : 'text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)]'
                }`}
              >
                {copy.withPrices}
              </button>
              <button
                type="button"
                onClick={() => setWithPrices(false)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  !withPrices
                    ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-sm'
                    : 'text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)]'
                }`}
              >
                {copy.withoutPrices}
              </button>
            </div>

            {/* Language Segmented Toggle */}
            <div className="flex shrink-0 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-1">
              {(['ru', 'uz', 'en', 'zh'] as const).map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold uppercase transition ${
                    language === l
                      ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-sm'
                      : 'text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)]'
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
              className="w-52 shrink-0 cursor-pointer truncate rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 py-1.5 text-xs font-medium text-[var(--sp-ink)] shadow-sm outline-none focus:border-[var(--sp-brand)] sm:w-56"
            >
              <option value="">{copy.allSections} ({initialProducts.length} {copy.productsShort})</option>
              {parentCategories.map((parent) => {
                const children = sortedCategories.filter((c) => c.parentId === parent.id);
                const parentChildIds = new Set([parent.id, ...children.map((ch) => ch.id)]);
                const parentTotalProds = initialProducts.filter(
                  (p) => p.categoryId && parentChildIds.has(p.categoryId)
                ).length;

                return (
                  <optgroup
                    key={parent.id}
                    label={`${getLocalizedCategoryTitle(parent, language)} (${parentTotalProds})`}
                  >
                    <option value={parent.id} className="font-bold">
                      {copy.allInSection}: {getLocalizedCategoryTitle(parent, language)} ({parentTotalProds})
                    </option>
                    {children.map((child) => {
                      const childProds = initialProducts.filter(
                        (p) => p.categoryId === child.id || p.categorySlug === child.slug
                      ).length;
                      return (
                        <option key={child.id} value={child.id}>
                          — {getLocalizedCategoryTitle(child, language)} ({childProds})
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Right Actions: Zoom, Copy Link, Fullscreen, Print */}
          <div className="no-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-[var(--sp-line-soft)] pt-2 sm:flex-wrap sm:pt-3">
            {/* Zoom Controls */}
            <div className="hidden items-center gap-1 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-2 py-1 text-xs text-[var(--sp-ink-secondary)] sm:flex">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.4, s - 0.1))}
                className="p-1 hover:text-[var(--sp-ink)]"
                title={copy.zoomOut}
                aria-label={copy.zoomOut}
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="w-9 text-center font-mono text-[11px] font-semibold text-[var(--sp-ink)]">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(1.2, s + 0.1))}
                className="p-1 hover:text-[var(--sp-ink)]"
                title={copy.zoomIn}
                aria-label={copy.zoomIn}
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 py-2 text-xs font-semibold text-[var(--sp-ink)] shadow-sm transition hover:bg-[var(--sp-surface-hover)] active:scale-95"
              title={copy.copyLinkTitle}
            >
              {copied ? <Check className="size-3.5 text-[var(--sp-brand)]" /> : <Share2 className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? copy.copied : copy.copyLink}</span>
            </button>

            {/* Open Fullscreen link */}
            <a
              href={getCatalogPrintPath(withPrices, language, selectedCategory || undefined)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 py-2 text-xs font-semibold text-[var(--sp-ink)] shadow-sm transition hover:bg-[var(--sp-surface-hover)] active:scale-95"
              title={copy.openFullscreenTitle}
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden md:inline">{copy.openFullscreen}</span>
            </a>

            {/* PRINT / SAVE PDF BUTTON */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 py-2 text-xs font-bold text-[var(--sp-on-brand)] shadow-sm transition hover:opacity-90 active:scale-95"
            >
              <Printer className="size-4" />
              <span>{copy.print}</span>
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
          width: var(--a4-width);
          zoom: var(--catalog-preview-scale);
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
          background-color: var(--catalog-brand-deep) !important;
          color: var(--catalog-on-brand-deep) !important;
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
            zoom: 1 !important;
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
            background-color: var(--catalog-brand-deep) !important;
            color: var(--catalog-on-brand-deep) !important;
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
        style={{ '--catalog-preview-scale': previewScale } as CSSProperties}
      >
        {/* =======================================================================
            PAGE 1: COVER PAGE (ИЗУМРУДНЫЙ ТИТУЛЬНЫЙ ЛИСТ В ФИРМЕННЫХ ЦВЕТАХ)
            ======================================================================= */}
        <div className="a4-page a4-page-cover justify-between">
          {/* Cover Header Bar */}
          <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--catalog-on-brand-deep)_20%,transparent)] pb-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--catalog-on-brand-deep)] opacity-80">
              {companyName}
            </span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--catalog-on-brand-deep)]">
              {website}
            </span>
          </div>

          {/* Center Main Cover Content */}
          <div className="my-auto text-center flex flex-col items-center py-8">
            {/* Logo */}
            <div className="mb-10 flex min-h-24 items-center justify-center px-5 py-3">
              <BrandLogo
                src={settings?.company.logo}
                srcDark={settings?.company.logoDark || '/logo-white.svg'}
                label={companyName}
                variant="white"
                className="h-16 sm:h-20"
              />
            </div>

            {/* Subtitle Company Tagline */}
            <div className="mb-6 text-sm font-medium uppercase tracking-wider text-[var(--catalog-on-brand-deep)] opacity-85">
              {copy.businessSupply}
            </div>

            {/* Main Title */}
            <h1 className="mb-3 text-4xl font-bold uppercase leading-tight tracking-normal text-[var(--catalog-on-brand-deep)] sm:text-5xl">
              {copy.catalogTitle}
            </h1>

            {/* Subtitle / Mode */}
            <h2 className="mb-10 text-lg font-medium uppercase tracking-wide text-[var(--catalog-on-brand-deep)] opacity-90 sm:text-xl">
              {withPrices ? copy.priceListTitle : copy.presentationTitle}
            </h2>

            {/* Clean Date / Year */}
            {documentDate ? (
              <div className="space-y-2 text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--catalog-on-brand-deep)] opacity-80">
                  {formatCatalogPdfMessage(copy.validOn, { date: documentDate })}
                </div>
                {withPrices ? <p className="max-w-md text-[10px] leading-relaxed text-[var(--catalog-on-brand-deep)] opacity-65">{copy.priceDisclaimer}</p> : null}
              </div>
            ) : null}
          </div>

          {/* Cover Footer (Clean White / Brand Lime Contacts) */}
          <div className="grid grid-cols-3 gap-4 border-t border-[color-mix(in_srgb,var(--catalog-on-brand-deep)_20%,transparent)] pt-5 text-xs text-[var(--catalog-on-brand-deep)]">
            {/* Phones */}
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 size-4 shrink-0 text-[var(--catalog-accent)]" />
              <div className="text-[11px] font-semibold leading-relaxed whitespace-nowrap">
                <div className="whitespace-nowrap">{phone1}</div>
                <div className="whitespace-nowrap">{phone2}</div>
              </div>
            </div>

            {/* Site & Email */}
            <div className="flex items-start gap-2.5 justify-center">
              <Mail className="mt-0.5 size-4 shrink-0 text-[var(--catalog-accent)]" />
              <div className="text-[11px] leading-relaxed">
                <div className="font-semibold text-[var(--catalog-on-brand-deep)]">{website}</div>
                <div className="text-[var(--catalog-on-brand-deep)] opacity-80">{email}</div>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2.5 justify-end text-right">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--catalog-accent)]" />
              <div className="text-[11px] leading-snug">
                <div className="font-semibold text-[var(--catalog-on-brand-deep)]">{address}</div>
                <div className="mt-0.5 text-[var(--catalog-on-brand-deep)] opacity-70">{workingHours}</div>
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

          // Adaptive image container height: Large images flush with cell borders
          const isThreeRows = rowsCount >= 3 || pageProds.length > 8;
          const imageAreaHeight =
            layoutCols === 2
              ? 'h-56 sm:h-64'
              : layoutCols === 3 && !isThreeRows
                ? 'h-48 sm:h-56'
                : isThreeRows
                  ? 'h-36 sm:h-40'
                  : 'h-40 sm:h-44';

          const categoryTitle = getLocalizedCategoryTitle(category, language);

          const categorySubtitle =
            language === 'ru'
              ? category.titleUz
              : language === 'uz'
                ? category.titleRu
                : '';

          // Calculate total slots for an even, balanced grid matrix
          const totalSlots = Math.ceil(pageProds.length / layoutCols) * layoutCols;
          const emptySlotsCount = totalSlots - pageProds.length;

          return (
            <div key={`${category.id}-${pageIndex}`} className="a4-page justify-between">
              {/* TOP SOLID GREEN HEADER BANNER (SPACIOUS, NO OVERFLOW) */}
              <header className="mb-4 flex shrink-0 items-center justify-between rounded-none bg-[var(--catalog-brand)] px-5 py-3 text-[var(--catalog-on-brand)]">
                <div className="flex items-center gap-3.5 shrink-0">
                  <BrandLogo
                    src={settings?.company.logo}
                    srcDark={settings?.company.logoDark || '/logo-white.svg'}
                    label={companyName}
                    variant="white"
                    className="h-7 sm:h-8"
                  />
                  <div className="h-5 w-px bg-[var(--catalog-on-brand)] opacity-30" />
                  <div className="text-[11px] font-semibold uppercase leading-none tracking-wider text-[var(--catalog-on-brand)] opacity-90">
                    {copy.catalogTitle}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-right text-[11px] text-[var(--catalog-on-brand)]">
                  <span className="font-semibold uppercase tracking-wider text-[var(--catalog-accent)]">{website}</span>
                </div>
              </header>

              {/* CATEGORY TITLE & SUBTITLE (SOFT ELEGANT BRAND GREEN / SLATE, NO HARSH PITCH BLACK) */}
              <section className="mb-3.5 shrink-0">
                <h1 className="text-xl font-bold uppercase leading-none tracking-normal text-[var(--catalog-brand)] sm:text-2xl">
                  {categoryTitle}
                </h1>
                {categorySubtitle && (
                  <h2 className="text-[11px] text-[#64748B] font-medium mt-1 uppercase tracking-wide">
                    {categorySubtitle}
                  </h2>
                )}
              </section>

              {/* PRODUCTS GRID MATRIX WITH DELICATE THIN GREY DIVIDERS */}
              <main className="flex-1 flex flex-col justify-start">
                <div className={`grid ${gridColsClass} content-start border-t border-l border-[#DCE2DE]`}>
                  {pageProds.map((product) => {
                    // Full localized title
                    const title = getLocalizedProductTitle(product, language);

                    // Specs list with localized terms (clean physical specs only, no redundant sales unit)
                    const specs: string[] = [];
                    if (product.attributes?.size) {
                      specs.push(localizeSeedAttributeValue(String(product.attributes.size), language));
                    }
                    if (product.attributes?.volume) {
                      specs.push(localizeSeedAttributeValue(String(product.attributes.volume), language));
                    }
                    if (product.attributes?.weight) {
                      specs.push(localizeSeedAttributeValue(String(product.attributes.weight), language));
                    }
                    if (product.attributes?.package_quantity) {
                      specs.push(
                        formatCatalogPdfMessage(copy.packageQuantity, {
                          count: String(product.attributes.package_quantity),
                        }),
                      );
                    }
                    if (product.attributes?.material) {
                      specs.push(localizeSeedAttributeValue(String(product.attributes.material), language));
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
                        className="border-r border-b border-[#DCE2DE] flex flex-col justify-between items-start h-full bg-white overflow-hidden"
                      >
                        {/* Product Text Top (Clean, Readable, Brand Green with dedicated padding) */}
                        <div className="w-full px-3 pt-2.5 pb-1">
                          {/* Title in Brand Green */}
                          <h3 className="text-[11.5px] font-bold uppercase leading-snug tracking-normal text-[var(--catalog-brand)] sm:text-xs">
                            {title}
                          </h3>

                          {/* Specs (No redundant "Единица: кг") */}
                          {specs.length > 0 && (
                            <div className="text-[10px] text-[#64748B] font-normal leading-tight mt-0.5 space-y-0.5">
                              {specs.slice(0, 3).map((s, idx) => (
                                <div key={idx}>{s}</div>
                              ))}
                            </div>
                          )}

                          {/* Clean Price Line */}
                          {withPrices && displayPrice && (
                            <div className="mt-1 text-xs font-bold text-[#151B18] flex items-baseline gap-1">
                              <span>{displayPrice}</span>
                              <span className="text-[10px] font-normal text-[#64748B]">
                                / {salesUnitLabel}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Image Bottom (Flush against left, right, and bottom borders with no gap) */}
                        <div className={`w-full ${imageAreaHeight} flex items-center justify-center bg-transparent mt-auto`}>
                          {product.mainImage || product.images?.[0] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={product.mainImage || product.images?.[0]}
                              alt={title}
                              className="w-full h-full object-contain"
                              loading="eager"
                            />
                          ) : (
                            <div
                              role="img"
                              aria-label={`${title}. ${copy.photoComingSoon}`}
                              className="flex flex-col items-center gap-1.5 px-3 text-center text-[#64748B]"
                            >
                              <Package className="size-8 text-[#7A9184]" aria-hidden="true" />
                              <span className="text-[9px] font-semibold leading-tight">
                                {copy.photoComingSoon}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty cells to complete the rectangular matrix lines */}
                  {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="border-r border-b border-[#DCE2DE] bg-white"
                    />
                  ))}
                </div>
              </main>

              {/* PAGE FOOTER (НИЖНИЙ КОЛОНТИТУЛ С НОМЕРАМИ ТЕЛЕФОНОВ) */}
              <footer className="mt-auto grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-t border-[#DCE2DE] pt-3">
                <div className="flex items-center gap-2 whitespace-nowrap text-[11px] font-medium text-[#151B18]">
                  <Phone className="size-3.5 shrink-0 text-[var(--catalog-brand)]" />
                  <span className="font-semibold">{phone1}</span>
                  <span className="text-[#AEB9B2]">|</span>
                  <span className="font-semibold">{phone2}</span>
                </div>

                {withPrices ? <p className="min-w-0 text-center text-[8px] leading-tight text-[#929C96]">{copy.priceDisclaimer}</p> : <span />}

                <div className="text-xs font-bold text-[#929C96]">
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
