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
import type { Category, Product } from '@/types';

interface CatalogHomeProps {
  products: Product[];
  categories: Category[];
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
          <h2 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[#14231C] md:text-[28px]">
            {title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[#69776F]">{description}</p>
        </div>
        <Link
          href="/catalog"
          className="hidden shrink-0 items-center gap-1.5 font-compact text-xs font-bold text-[#0F6E43] transition-colors hover:text-[#084F30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E43] sm:inline-flex"
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
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#BFCBC4] bg-white font-compact text-xs font-bold text-[#173A28] transition-colors hover:border-[#0F6E43] hover:text-[#0F6E43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E43] sm:hidden"
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
  catalogPdfUrl,
  dataUnavailable = false,
}: CatalogHomeProps) {
  const t = useTranslations('homeCatalog');
  const { getLocalizedText } = useLanguage();

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

  const heroProducts = products
    .filter(
      (product) =>
        product.ownProduction &&
        product.categorySlug !== 'branding-polygraphy' &&
        Boolean(product.mainImage)
    )
    .slice(0, 3);
  const popularProducts = products.filter((product) => product.featured).slice(0, 8);
  const ownProductionProducts = products
    .filter(
      (product) =>
        product.ownProduction && product.categorySlug !== 'branding-polygraphy'
    )
    .slice(0, 4);

  return (
    <div className="bg-[#F4F7F5]">
      <section className="mx-auto max-w-7xl px-4 pb-7 pt-5 md:pb-9 md:pt-7">
        <div className="relative min-h-[310px] overflow-hidden rounded-2xl bg-[#0B5D3B] text-white shadow-[0_16px_45px_rgba(11,93,59,0.14)] md:min-h-[350px]">
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(5,51,30,0.96)_0%,rgba(11,93,59,0.94)_48%,rgba(31,124,78,0.78)_100%)]" />
          <div className="absolute -right-16 -top-32 h-96 w-96 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-20 h-72 w-72 rounded-full border border-white/10" />

          <div className="relative z-10 grid min-h-[310px] items-center gap-8 px-6 py-8 md:min-h-[350px] md:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] md:px-10 lg:px-14">
            <div className="max-w-xl">
              <div className="mb-3 flex items-center gap-2 font-compact text-[11px] font-bold uppercase tracking-[0.13em] text-[#DCE9AF]">
                <span className="h-px w-7 bg-[#DCE9AF]" />
                {t('bannerEyebrow')}
              </div>
              <h1 className="text-pretty font-extended text-3xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-4xl lg:text-[43px]">
                {t('bannerTitle')}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/72 md:text-[15px]">
                {t('bannerDescription')}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link
                  href="/catalog"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#DCE9AF] px-4 font-compact text-xs font-bold text-[#173A28] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('openCatalog')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                {catalogPdfUrl && (
                  <a
                    href={catalogPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/8 px-4 font-compact text-xs font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t('downloadCatalog')}
                  </a>
                )}
              </div>
            </div>

            <div className="relative hidden h-[290px] md:block" aria-hidden="true">
              {heroProducts.length > 0 ? (
                heroProducts.map((product, index) => {
                  const positions = [
                    'left-[2%] top-[21%] h-[70%] w-[40%] -rotate-6',
                    'left-[30%] top-[2%] h-[86%] w-[43%] rotate-2',
                    'right-[0%] top-[24%] h-[66%] w-[36%] rotate-6',
                  ];
                  return (
                    <div
                      key={product.id}
                      className={`absolute ${positions[index]} drop-shadow-[0_24px_22px_rgba(3,35,20,0.34)]`}
                    >
                      <Image
                        src={product.mainImage}
                        alt=""
                        fill
                        priority={index === 1}
                        sizes="(min-width: 1280px) 280px, 22vw"
                        className="object-contain"
                      />
                    </div>
                  );
                })
              ) : (
                <div className="absolute inset-0">
                  <Image
                    src="/catalog/page_1.png"
                    alt=""
                    fill
                    priority
                    sizes="45vw"
                    className="object-contain drop-shadow-[0_24px_22px_rgba(3,35,20,0.34)]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#DDE5E0] bg-white py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[#14231C] md:text-[28px]">
                {t('categoriesTitle')}
              </h2>
              <p className="mt-1.5 text-sm text-[#69776F]">{t('categoriesDescription')}</p>
            </div>
            <Link
              href="/catalog"
              className="hidden shrink-0 items-center gap-1.5 font-compact text-xs font-bold text-[#0F6E43] transition-colors hover:text-[#084F30] sm:inline-flex"
            >
              {t('allCategories')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {categoryCards.length > 0 ? (
            <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-2">
              {categoryCards.map(({ category, count, image }) => (
                <Link
                  key={category.id}
                  href={`/catalog/${category.slug}`}
                  className="group relative min-h-[176px] min-w-[184px] max-w-[184px] snap-start overflow-hidden rounded-xl border border-[#E0E7E3] bg-[#F5F7F6] p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#AAC0B3] hover:shadow-[0_12px_30px_rgba(20,35,28,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E43] md:min-h-[196px] md:min-w-[212px] md:max-w-[212px]"
                >
                  <div className="relative z-10 max-w-[85%]">
                    <h3 className="line-clamp-2 font-compact text-sm font-bold leading-snug text-[#14231C]">
                      {getLocalizedText(category.titleRu, category.titleUz, category.titleEn)}
                    </h3>
                    <p className="mt-1 text-[11px] text-[#708078]">
                      {t('itemsCount', { count })}
                    </p>
                  </div>
                  {image ? (
                    <div className="absolute bottom-[-8%] right-[-7%] h-[72%] w-[78%] transition-transform duration-300 group-hover:scale-[1.04]">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="212px"
                        className="object-contain object-right-bottom"
                      />
                    </div>
                  ) : (
                    <PackageSearch className="absolute bottom-5 right-5 h-16 w-16 text-[#B9C8BF]" aria-hidden="true" />
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#BFCBC4] bg-[#F7F9F8] px-6 py-10 text-center text-sm text-[#69776F]">
              {dataUnavailable ? t('errorDescription') : t('emptyCatalogDescription')}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl divide-y divide-[#DDE5E0] px-4">
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
        <div className="relative overflow-hidden rounded-2xl bg-[#15251D] px-6 py-8 text-white md:px-10 md:py-10">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_75%_20%,rgba(220,233,175,0.18),transparent_48%)]" />
          <div className="relative z-10 grid items-center gap-7 md:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[#DCE9AF]">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span className="font-compact text-[11px] font-bold uppercase tracking-[0.12em]">
                  {t('ctaEyebrow')}
                </span>
              </div>
              <h2 className="text-pretty font-extended text-2xl font-bold tracking-[-0.025em] md:text-3xl">
                {t('ctaTitle')}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
                {t('ctaDescription')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 md:justify-end">
              <Link
                href="/request"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#DCE9AF] px-4 font-compact text-xs font-bold text-[#173A28] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('sendList')}
              </Link>
              <a
                href="tel:+998998510506"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 px-4 font-compact text-xs font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
