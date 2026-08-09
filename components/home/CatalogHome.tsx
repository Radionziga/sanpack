'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Download,
  FileText,
  PackageSearch,
  PhoneCall,
  Send,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import type { Banner, Category, Language, Product } from '@/types';
import { PromoCarousel } from '@/components/home/PromoCarousel';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref } from '@/lib/settings/contacts';

interface CatalogHomeProps {
  products: Product[];
  categories: Category[];
  banners: Banner[];
  locale: Language;
  catalogPdfUrl?: string;
  dataUnavailable?: boolean;
}

interface ProductShelfProps {
  title: string;
  description: string;
  products: Product[];
  actionLabel: string;
}

function ProductShelf({
  title,
  description,
  products,
  actionLabel,
}: ProductShelfProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-8 md:py-11">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] md:text-[28px]">
            {title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--sp-ink-secondary)]">{description}</p>
        </div>
        <Link
          href="/catalog"
          className="hidden shrink-0 items-center gap-1.5 font-compact text-xs font-bold text-[var(--sp-brand)] transition-opacity hover:opacity-75 sm:inline-flex"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <Link
        href="/catalog"
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-surface)] font-compact text-xs font-bold text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] sm:hidden"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function CatalogHome({
  products,
  categories,
  banners,
  locale,
  catalogPdfUrl,
  dataUnavailable = false,
}: CatalogHomeProps) {
  const t = useTranslations('homeCatalog');
  const { getLocalizedText } = useLanguage();
  const { contacts } = useSiteSettings();

  const categoryCards = categories
    .map((category) => {
      const categoryProducts = products.filter(
        (product) => product.categoryId === category.id
      );
      return {
        category,
        count: categoryProducts.length,
        image: category.image || categoryProducts[0]?.mainImage,
      };
    })
    .filter((item) => item.count > 0)
    .slice(0, 10);

  const popularProducts = products.filter((product) => product.featured).slice(0, 8);
  const ownProductionProducts = products
    .filter(
      (product) =>
        product.ownProduction && product.categorySlug !== 'branding-polygraphy'
    )
    .slice(0, 4);

  return (
    <div className="bg-[var(--sp-canvas)]">
      <section className="mx-auto max-w-7xl px-4 pb-7 pt-5 md:pb-9 md:pt-7">
        <PromoCarousel banners={banners} locale={locale} />
      </section>

      <section className="border-y border-[var(--sp-line)] bg-[var(--sp-surface)] py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)] md:text-[28px]">
                {t('categoriesTitle')}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--sp-ink-secondary)]">{t('categoriesDescription')}</p>
            </div>
            <Link
              href="/catalog"
              className="hidden shrink-0 items-center gap-1.5 font-compact text-xs font-bold text-[var(--sp-brand)] transition-opacity hover:opacity-75 sm:inline-flex"
            >
              {t('allCategories')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {categoryCards.length > 0 ? (
            <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
              <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto py-1 pl-[max(1rem,calc((100vw-80rem)/2+1rem))] pr-4">
                {categoryCards.map(({ category, count, image }) => (
                  <Link
                    key={category.id}
                    href={`/catalog/${category.slug}`}
                    className="group relative min-h-[176px] min-w-[184px] max-w-[184px] snap-start overflow-hidden rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4 transition-[border-color,box-shadow] hover:border-[var(--sp-line-strong)] hover:shadow-[var(--sp-shadow-raised)] md:min-h-[196px] md:min-w-[212px] md:max-w-[212px]"
                  >
                    <div className="relative z-10 max-w-[85%]">
                      <h3 className="line-clamp-2 font-compact text-sm font-bold leading-snug text-[var(--sp-ink)]">
                        {getLocalizedText(category.titleRu, category.titleUz, category.titleEn)}
                      </h3>
                      <p className="mt-1 text-[11px] text-[var(--sp-ink-tertiary)]">
                        {t('itemsCount', { count })}
                      </p>
                    </div>
                    {image ? (
                      <div className="absolute bottom-[-5%] right-[-4%] h-[69%] w-[75%]">
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="212px"
                          className="object-contain object-right-bottom"
                        />
                      </div>
                    ) : (
                      <PackageSearch className="absolute bottom-5 right-5 h-16 w-16 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--sp-line-strong)] bg-[var(--sp-surface-inset)] px-6 py-10 text-center text-sm text-[var(--sp-ink-secondary)]">
              {dataUnavailable ? t('errorDescription') : t('emptyCatalogDescription')}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl divide-y divide-[var(--sp-line)] px-4">
        <ProductShelf
          title={t('popularTitle')}
          description={t('popularDescription')}
          products={popularProducts}
          actionLabel={t('viewAllProducts')}
        />
        <ProductShelf
          title={t('ownProductionTitle')}
          description={t('ownProductionDescription')}
          products={ownProductionProducts}
          actionLabel={t('viewOwnProduction')}
        />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-3 md:pb-16 md:pt-5">
        <div className="relative overflow-hidden rounded-2xl bg-[var(--sp-cta-bg)] px-5 py-7 text-[var(--sp-cta-ink)] md:px-10 md:py-10">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_75%_20%,color-mix(in_srgb,var(--sp-cta-action)_22%,transparent),transparent_48%)]" />
          <div className="relative z-10 grid items-center gap-7 md:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[var(--sp-cta-ink)]">
                <span className="flex size-8 items-center justify-center rounded-md bg-[var(--sp-cta-ink)] text-[var(--sp-cta-bg)]">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-compact text-[11px] font-bold uppercase tracking-[0.12em]">
                  {t('ctaEyebrow')}
                </span>
              </div>
              <h2 className="text-pretty font-extended text-2xl font-bold tracking-[-0.025em] md:text-3xl">
                {t('ctaTitle')}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[color-mix(in_srgb,var(--sp-cta-ink)_78%,transparent)]">
                {t('ctaDescription')}
              </p>
            </div>
            <div className="grid w-full gap-2.5 md:w-72 md:grid-cols-1">
              <Link
                href="/request"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[var(--sp-cta-ink)] bg-[var(--sp-cta-ink)] px-5 font-compact text-xs font-bold text-[var(--sp-cta-bg)] transition-opacity hover:opacity-[0.88] md:min-h-11"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('sendList')}
              </Link>
              {catalogPdfUrl && (
                <a
                  href={catalogPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--sp-cta-ink)_28%,transparent)] bg-[color-mix(in_srgb,var(--sp-cta-ink)_8%,transparent)] px-5 font-compact text-xs font-bold text-[var(--sp-cta-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--sp-cta-ink)_14%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-11"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t('downloadCatalog')}
                </a>
              )}
              <a
                href={contactPhoneHref(contacts.phone1)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--sp-cta-ink)_28%,transparent)] bg-[color-mix(in_srgb,var(--sp-cta-ink)_8%,transparent)] px-5 font-compact text-xs font-bold text-[var(--sp-cta-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--sp-cta-ink)_14%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-11"
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                {t('callSales')}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
