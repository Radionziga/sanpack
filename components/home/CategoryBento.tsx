import Image from 'next/image';
import { ArrowUpRight, PackageSearch } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { Category, Language } from '@/types';

export interface CategoryBentoItem {
  category: Category;
  count: number;
  image?: string;
}

interface CategoryBentoProps {
  parentItems: CategoryBentoItem[];
  childItems: CategoryBentoItem[];
  locale: Language;
  getLocalizedText: (ru?: string, uz?: string, en?: string) => string;
  dataUnavailable?: boolean;
}

const copy = {
  ru: {
    eyebrow: 'Каталог SANPACK',
    title: 'Всё нужное — по категориям',
    description: 'Выберите направление: внутри — актуальные товары, цены и условия поставки.',
    open: 'Открыть категорию',
    all: 'Весь каталог',
    items: 'товаров',
    empty: 'Категории появятся здесь после публикации в админ-панели.',
    error: 'Не удалось загрузить категории. Попробуйте обновить страницу немного позже.',
  },
  uz: {
    eyebrow: 'SANPACK katalogi',
    title: 'Kerakli mahsulotlar — toifalar bo‘yicha',
    description: 'Yo‘nalishni tanlang: ichida dolzarb mahsulotlar, narxlar va yetkazib berish shartlari mavjud.',
    open: 'Toifani ochish',
    all: 'Barcha katalog',
    items: 'mahsulot',
    empty: 'Toifalar admin panelda e’lon qilingandan keyin shu yerda ko‘rinadi.',
    error: 'Toifalarni yuklab bo‘lmadi. Sahifani birozdan keyin yangilang.',
  },
  en: {
    eyebrow: 'SANPACK catalogue',
    title: 'Everything you need, organised by category',
    description: 'Choose a direction to see current products, prices and supply terms.',
    open: 'Open category',
    all: 'Full catalogue',
    items: 'items',
    empty: 'Categories will appear here once they are published in the admin panel.',
    error: 'Categories could not be loaded. Please refresh the page a little later.',
  },
} satisfies Record<Language, Record<string, string>>;

const featuredSizes = [
  'col-span-2 row-span-3 md:col-span-4 md:row-span-4 lg:col-span-7 lg:row-span-4',
  'col-span-2 row-span-2 md:col-span-2 md:row-span-4 lg:col-span-5 lg:row-span-4',
];

const childSizes = [
  'col-span-1 row-span-2 md:col-span-3 md:row-span-3 lg:col-span-3',
  'col-span-1 row-span-2 md:col-span-3 md:row-span-3 lg:col-span-3',
  'col-span-2 row-span-2 md:col-span-3 md:row-span-3 lg:col-span-6',
  'col-span-1 row-span-2 md:col-span-2 md:row-span-3 lg:col-span-4',
  'col-span-1 row-span-2 md:col-span-2 md:row-span-3 lg:col-span-4',
  'col-span-2 row-span-2 md:col-span-2 md:row-span-3 lg:col-span-4',
];

const featuredArtwork = {
  food: '/catalog/bento/food-essentials-v2.png',
  packaging: '/catalog/bento/packaging-sage-v2.png',
};

function isFoodCategory(category: Category) {
  const searchValue = `${category.id} ${category.slug} ${category.titleRu} ${category.titleUz} ${category.titleEn ?? ''}`.toLowerCase();
  return /food|produkt|питан|oziq/.test(searchValue);
}

function getFeaturedArtwork(category: Category, index: number) {
  if (isFoodCategory(category)) return featuredArtwork.food;
  if (index === 0 || /pack|упаков|qadoq/.test(`${category.slug} ${category.titleRu} ${category.titleUz}`.toLowerCase())) {
    return featuredArtwork.packaging;
  }
  return category.image;
}

export function CategoryBento({
  parentItems,
  childItems,
  locale,
  getLocalizedText,
  dataUnavailable = false,
}: CategoryBentoProps) {
  const text = copy[locale];
  const featured = parentItems.slice(0, 2);

  return (
    <section aria-labelledby="home-category-heading" className="bg-[var(--sp-surface)] py-8 md:py-12 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <header className="mb-6 flex items-end justify-between gap-5 md:mb-8">
          <div className="max-w-3xl">
            <p className="mb-2 font-compact text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sp-brand)]">
              {text.eyebrow}
            </p>
            <h2 id="home-category-heading" className="text-2xl font-bold leading-tight tracking-[-0.035em] text-[var(--sp-ink)] sm:text-3xl lg:text-[2.35rem]">
              {text.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-ink-secondary)] sm:text-base">
              {text.description}
            </p>
          </div>
          <Link
            href="/catalog"
            className="hidden min-h-11 shrink-0 items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-4 text-sm font-semibold text-[var(--sp-ink)] transition-[background-color,border-color,color] hover:border-[var(--sp-brand)] hover:bg-[var(--sp-brand-soft)] hover:text-[var(--sp-brand)] sm:inline-flex"
          >
            {text.all}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </header>

        {featured.length > 0 || childItems.length > 0 ? (
          <div className="grid auto-rows-[84px] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[96px] md:grid-cols-6 md:auto-rows-[88px] md:gap-4 lg:grid-cols-12 lg:auto-rows-[92px]">
            {featured.map((item, index) => {
              const title = getLocalizedText(item.category.titleRu, item.category.titleUz, item.category.titleEn);
              const description = getLocalizedText(item.category.descriptionRu, item.category.descriptionUz, item.category.descriptionEn);
              const image = getFeaturedArtwork(item.category, index);

              return (
                <Link
                  key={item.category.id}
                  href={`/catalog/${item.category.slug}`}
                  aria-label={`${text.open}: ${title}`}
                  className={`group relative isolate overflow-hidden rounded-[var(--sp-radius-card)] bg-[var(--sp-category-green)] shadow-[var(--sp-shadow-soft)] ring-1 ring-inset ring-[var(--sp-line)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--sp-shadow-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] motion-reduce:hover:translate-y-0 ${featuredSizes[index]}`}
                >
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      priority={index === 0}
                      sizes={index === 0 ? '(max-width: 767px) 100vw, (max-width: 1023px) 66vw, 58vw' : '(max-width: 767px) 100vw, (max-width: 1023px) 34vw, 42vw'}
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : null}
                  <div className="sp-bento-feature-overlay absolute inset-0" aria-hidden="true" />
                  <div className="relative z-10 flex h-full max-w-[68%] flex-col justify-between p-4 sm:p-5 lg:p-6">
                    <div>
                      <span className="inline-flex min-h-7 items-center rounded-[var(--sp-radius-control-inner)] bg-white/72 px-2.5 text-[11px] font-semibold text-[var(--sp-bento-feature-ink)] backdrop-blur-md">
                        {item.count} {text.items}
                      </span>
                      <h3 className="mt-3 text-xl font-bold leading-[1.08] tracking-[-0.035em] text-[var(--sp-bento-feature-ink)] sm:text-2xl lg:text-3xl">
                        {title}
                      </h3>
                      {description ? (
                        <p className="mt-2 line-clamp-2 max-w-md text-xs leading-5 text-[color-mix(in_srgb,var(--sp-bento-feature-ink)_74%,transparent)] sm:text-sm">
                          {description}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[var(--sp-bento-feature-ink)] sm:text-sm">
                      {text.open}
                      <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              );
            })}

            {childItems.map((item, index) => {
              const title = getLocalizedText(item.category.titleRu, item.category.titleUz, item.category.titleEn);
              const image = item.image || item.category.image;
              const size = childSizes[index % childSizes.length];

              return (
                <Link
                  key={item.category.id}
                  href={`/catalog/${item.category.slug}`}
                  aria-label={`${text.open}: ${title}`}
                  className={`group relative isolate overflow-hidden rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)] shadow-[var(--sp-shadow-soft)] ring-1 ring-inset ring-[var(--sp-line)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--sp-shadow-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] motion-reduce:hover:translate-y-0 ${size}`}
                >
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      loading={index < 4 ? 'eager' : 'lazy'}
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 50vw, 33vw"
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-[var(--sp-ink-muted)]">
                      <PackageSearch className="size-12" aria-hidden="true" />
                    </div>
                  )}
                  <div className="sp-bento-category-overlay absolute inset-0" aria-hidden="true" />
                  <div className="relative z-10 flex h-full flex-col justify-between p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-3 max-w-[85%] text-base font-bold leading-[1.12] tracking-[-0.025em] text-white drop-shadow-sm sm:text-lg">
                        {title}
                      </h3>
                      <ArrowUpRight className="size-4 shrink-0 text-white/85 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden="true" />
                    </div>
                    <span className="w-fit rounded-[var(--sp-radius-control-inner)] bg-black/25 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm sm:text-[11px]">
                      {item.count} {text.items}
                    </span>
                  </div>
                </Link>
              );
            })}

            <Link
              href="/catalog"
              className="col-span-2 row-span-1 flex min-h-11 items-center justify-center gap-2 rounded-[var(--sp-radius-card)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)] transition-[background-color,transform] hover:bg-[var(--sp-brand-deep)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] sm:hidden"
            >
              {text.all}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="rounded-[var(--sp-radius-card)] border border-dashed border-[var(--sp-line-strong)] bg-[var(--sp-surface-inset)] px-6 py-12 text-center text-sm text-[var(--sp-ink-secondary)]">
            {dataUnavailable ? text.error : text.empty}
          </div>
        )}
      </div>
    </section>
  );
}
