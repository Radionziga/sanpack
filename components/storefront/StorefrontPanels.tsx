'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Minus,
  PackageOpen,
  PackagePlus,
  Plus,
  Printer,
  ShoppingBasket,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { ProductImage } from '@/components/catalog/ProductImage';
import { formatMoney } from '@/lib/catalog/productPresentation';
import { getProductOrderRule } from '@/lib/commerce/orderQuantities';
import { getCategoryArtwork } from '@/lib/catalog/categoryArtwork';
import {
  getFeaturedCategoryIds,
  getPopularCategoryArtwork,
  storefrontCategoryGroupIds,
} from '@/lib/catalog/popularCategoryArtwork';
import { getCategoryTitle } from '@/lib/i18n/categoryText';
import type { Category } from '@/types';

const panelCopy = {
  ru: {
    catalog: 'Каталог',
    allProducts: 'Все товары',
    viewAll: 'Смотреть все',
    cart: 'Корзина',
    empty: 'В корзине пока ничего нет',
    emptyHint: 'Добавьте товары из каталога — они появятся здесь.',
    items: 'товаров',
    preliminary: 'Предварительная сумма',
    priceOnRequest: 'Цена по запросу',
    checkout: 'Перейти в корзину',
    delivery: 'Доставка по Ташкенту',
    deliveryHint: 'Срок и стоимость уточнит менеджер',
    categories: 'Категории товаров',
    services: 'Сервисы SANPACK',
    branding: 'Полиграфия и брендирование',
    bagDesigner: 'Конструктор пакета',
    decrease: 'Уменьшить количество',
    increase: 'Увеличить количество',
    showCategory: 'Показать раздел',
    hideCategory: 'Скрыть раздел',
  },
  uz: {
    catalog: 'Katalog',
    allProducts: 'Barcha mahsulotlar',
    viewAll: 'Barchasini ko‘rish',
    cart: 'Savat',
    empty: 'Savat hozircha bo‘sh',
    emptyHint: 'Katalogdan mahsulot qo‘shing — ular shu yerda ko‘rinadi.',
    items: 'mahsulot',
    preliminary: 'Dastlabki summa',
    priceOnRequest: 'Narx so‘rov asosida',
    checkout: 'Savatga o‘tish',
    delivery: 'Toshkent bo‘ylab yetkazib berish',
    deliveryHint: 'Muddat va narxni menejer aniqlashtiradi',
    categories: 'Mahsulot toifalari',
    services: 'SANPACK xizmatlari',
    branding: 'Poligrafiya va brendlash',
    bagDesigner: 'Paket konstruktori',
    decrease: 'Miqdorni kamaytirish',
    increase: 'Miqdorni oshirish',
    showCategory: 'Bo‘limni ko‘rsatish',
    hideCategory: 'Bo‘limni yashirish',
  },
  en: {
    catalog: 'Catalogue',
    allProducts: 'All products',
    viewAll: 'View all',
    cart: 'Cart',
    empty: 'Your cart is empty',
    emptyHint: 'Add products from the catalogue and they will appear here.',
    items: 'items',
    preliminary: 'Preliminary total',
    priceOnRequest: 'Price on request',
    checkout: 'Open cart',
    delivery: 'Delivery across Tashkent',
    deliveryHint: 'A manager will confirm timing and cost',
    categories: 'Product categories',
    services: 'SANPACK services',
    branding: 'Printing and branding',
    bagDesigner: 'Bag designer',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
    showCategory: 'Show section',
    hideCategory: 'Hide section',
  },
  zh: {
    catalog: '目录', allProducts: '全部商品', viewAll: '查看全部', cart: '购物车', empty: '购物车为空',
    emptyHint: '从目录中添加商品，它们会显示在这里。', items: '件商品', preliminary: '预估总计',
    priceOnRequest: '价格面议', checkout: '打开购物车', delivery: '塔什干配送',
    deliveryHint: '经理将确认时间和费用', categories: '商品分类', services: 'SANPACK 服务',
    branding: '印刷与品牌定制', bagDesigner: '包装袋设计器', decrease: '减少数量', increase: '增加数量',
    showCategory: '展开分类', hideCategory: '收起分类',
  },
} as const;

interface CategoryNavigationProps {
  categories: Category[];
  activeCategorySlug?: string;
  showFeaturedGroups?: boolean;
}

function CategoryArtwork({ category, size = 40 }: { category: Category; size?: number }) {
  const source = getCategoryArtwork(category);
  if (!source) {
    return (
      <span className="grid size-full place-items-center text-[var(--sp-brand)]" aria-hidden="true">
        <PackageOpen className="size-5" />
      </span>
    );
  }
  return (
    <Image
      src={source}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      className="size-full object-contain"
    />
  );
}

export function StorefrontCategorySidebar({ categories, activeCategorySlug }: CategoryNavigationProps) {
  const { language, getLocalizedText } = useLanguage();
  const siteSettings = useSiteSettings();
  const copy = panelCopy[language];
  const parents = categories
    .filter((category) => !category.parentId && category.status === 'active')
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const activeParentId = parents.find((parent) => (
    parent.slug === activeCategorySlug
    || categories.some((category) => category.parentId === parent.id && category.slug === activeCategorySlug)
  ))?.id;
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    () => new Set(activeParentId ? [activeParentId] : []),
  );
  const categoryTitle = (category: Category) => getCategoryTitle(
    category,
    language,
    getLocalizedText(category.titleRu, category.titleUz, category.titleEn, category.titleZh),
  );

  return (
    <aside aria-label={copy.categories} className="h-full min-w-0">
      <div className="storefront-sidebar-scroll sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain">
        <div className="pl-2 [direction:ltr]">
          <h2 className="mb-3 px-2 text-xl font-extrabold tracking-[-0.035em] text-[var(--sp-ink)]">
            {copy.catalog}
          </h2>
          <nav className="space-y-4">
          <Link
            href="/catalog"
            aria-current={!activeCategorySlug ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-[var(--sp-radius-control)] px-2.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] ${
              !activeCategorySlug
                ? 'bg-[var(--sp-brand-soft)] text-[var(--sp-brand-deep)]'
                : 'text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)]'
            }`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface)] text-[var(--sp-brand)] shadow-[var(--sp-shadow-soft)]">
              <LayoutGrid className="size-4.5" aria-hidden="true" />
            </span>
            <span>{copy.allProducts}</span>
          </Link>

          {parents.map((parent) => {
            const children = categories
              .filter((category) => category.parentId === parent.id && category.status === 'active')
              .sort((left, right) => left.sortOrder - right.sortOrder);
            const parentActive = activeCategorySlug === parent.slug
              || children.some((category) => category.slug === activeCategorySlug);
            const expanded = expandedParents.has(parent.id) || parentActive;
            return (
              <section key={parent.id} aria-labelledby={`storefront-parent-${parent.id}`}>
                <div className={`mb-1 flex min-h-11 items-center rounded-[var(--sp-radius-control)] transition-colors ${
                    parentActive
                      ? 'bg-[var(--sp-brand-soft)] text-[var(--sp-brand-deep)]'
                      : 'text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)]'
                  }`}>
                  <Link
                    href={`/catalog/${parent.slug}`}
                    aria-current={activeCategorySlug === parent.slug ? 'page' : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-l-[var(--sp-radius-control)] py-1.5 pl-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)]"
                  >
                    <span className="size-9 shrink-0 overflow-hidden rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)]">
                      <CategoryArtwork category={parent} />
                    </span>
                    <span id={`storefront-parent-${parent.id}`} className="min-w-0 flex-1 leading-tight">
                      {categoryTitle(parent)}
                    </span>
                  </Link>
                  {children.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedParents((current) => {
                        const next = new Set(current);
                        if (next.has(parent.id)) next.delete(parent.id);
                        else next.add(parent.id);
                        return next;
                      })}
                      aria-expanded={expanded}
                      aria-controls={`storefront-children-${parent.id}`}
                      aria-label={`${expanded ? copy.hideCategory : copy.showCategory}: ${categoryTitle(parent)}`}
                      className="grid size-11 shrink-0 place-items-center rounded-[var(--sp-radius-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)]"
                    >
                      <ChevronDown className={`size-4 opacity-60 transition-transform duration-200 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                <div id={`storefront-children-${parent.id}`} hidden={!expanded} className="space-y-0.5">
                  {children.map((category) => {
                    const active = category.slug === activeCategorySlug;
                    return (
                      <Link
                        key={category.id}
                        href={`/catalog/${category.slug}`}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex min-h-10 items-center gap-2.5 rounded-[var(--sp-radius-control)] px-2 py-1 text-[13px] font-medium leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] ${
                          active
                            ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'
                            : 'text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]'
                        }`}
                      >
                        <span className="size-8 shrink-0 overflow-hidden rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface)] shadow-[0_1px_4px_rgb(21_27_24/7%)]">
                          <CategoryArtwork category={category} size={32} />
                        </span>
                        <span className="min-w-0 flex-1">{categoryTitle(category)}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="border-t border-[var(--sp-line-soft)] pt-4" aria-labelledby="storefront-services-heading">
            <h3 id="storefront-services-heading" className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--sp-ink-muted)]">
              {copy.services}
            </h3>
            <div className="space-y-1">
              <Link href="/branding" className="flex min-h-11 items-center gap-3 rounded-[var(--sp-radius-control)] px-2.5 py-1.5 text-sm font-semibold text-[var(--sp-ink)] transition-colors hover:bg-[var(--sp-surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)]">
                <span className="grid size-9 shrink-0 place-items-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]">
                  <Printer className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 leading-tight">{copy.branding}</span>
                <ChevronRight className="size-4 shrink-0 opacity-55" aria-hidden="true" />
              </Link>
              {(siteSettings.modules?.bagDesigner?.enabled ?? true) ? (
                <Link href="/bag-designer" className="flex min-h-11 items-center gap-3 rounded-[var(--sp-radius-control)] px-2.5 py-1.5 text-sm font-semibold text-[var(--sp-ink)] transition-colors hover:bg-[var(--sp-surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]">
                    <PackagePlus className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">{copy.bagDesigner}</span>
                  <ChevronRight className="size-4 shrink-0 opacity-55" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </section>
          </nav>
        </div>
      </div>
    </aside>
  );
}

export function StorefrontMobileCategoryRail({ categories, activeCategorySlug, showFeaturedGroups = false }: CategoryNavigationProps) {
  const { language, getLocalizedText } = useLanguage();
  const siteSettings = useSiteSettings();
  const copy = panelCopy[language];
  const parents = categories
    .filter((category) => !category.parentId && category.status === 'active')
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const leaves = categories
    .filter((category) => category.parentId && category.status === 'active')
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const groupedLeaves = parents.flatMap((parent) => leaves
    .filter((category) => category.parentId === parent.id)
    .sort((left, right) => left.sortOrder - right.sortOrder));
  const groupedLeafIds = new Set(groupedLeaves.map((category) => category.id));
  const railCategories = [
    ...groupedLeaves,
    ...leaves.filter((category) => !groupedLeafIds.has(category.id)),
  ];
  const featuredLeaves = leaves.filter((category) => getPopularCategoryArtwork(category)).slice(0, 6);
  const visibleLeaves = featuredLeaves.length >= 4 ? featuredLeaves : leaves.slice(0, 6);
  const categoryTitle = (category: Category) => getCategoryTitle(
    category,
    language,
    getLocalizedText(category.titleRu, category.titleUz, category.titleEn, category.titleZh),
  );
  const featuredGroups = storefrontCategoryGroupIds
    .map((groupId) => {
      const group = parents.find((category) => category.id === groupId);
      const categoriesById = new Map(leaves.map((category) => [category.id, category]));
      const groupCategories = getFeaturedCategoryIds(groupId)
        .map((categoryId) => categoriesById.get(categoryId))
        .filter((category): category is Category => Boolean(category));
      return group && groupCategories.length > 0 ? { group, categories: groupCategories } : null;
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  const renderCategoryGrid = (gridCategories: Category[], label: string) => (
    <nav className="grid grid-cols-2 gap-2.5" aria-label={label}>
      {gridCategories.map((category, index) => {
        const active = category.slug === activeCategorySlug;
        const artwork = getPopularCategoryArtwork(category) || getCategoryArtwork(category);
        const wide = index === 0 || index === 5;
        return (
          <Link
            key={category.id}
            href={`/catalog/${category.slug}`}
            aria-current={active ? 'page' : undefined}
            className={`group relative isolate min-h-32 overflow-hidden rounded-[var(--sp-radius-card)] ring-1 ring-inset transition-[box-shadow,transform] active:scale-[0.985] motion-reduce:active:scale-100 ${wide ? 'col-span-2 min-h-40' : ''} ${active ? 'ring-[var(--sp-brand)]' : 'ring-[var(--sp-line)]'}`}
          >
            {artwork ? (
              <Image src={artwork} alt="" fill sizes={wide ? 'calc(100vw - 2rem)' : 'calc(50vw - 1.5rem)'} className="object-cover transition-transform duration-300 group-active:scale-[1.02] motion-reduce:transition-none" />
            ) : (
              <span className="absolute inset-0 bg-[var(--sp-brand-soft)]"><CategoryArtwork category={category} size={160} /></span>
            )}
            <span className="absolute left-3 top-3 z-10 max-w-[58%] text-left text-sm font-extrabold leading-[1.16] text-white">
              <span className="line-clamp-2">{categoryTitle(category)}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <section aria-labelledby="mobile-category-rail-title" className="lg:hidden">
      <nav
        className="no-scrollbar -mx-4 mb-7 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1"
        aria-label={copy.categories}
      >
        <Link
          href="/catalog"
          aria-current={!activeCategorySlug ? 'page' : undefined}
          className={`flex min-h-24 w-32 shrink-0 snap-start flex-col justify-between rounded-[var(--sp-radius-card)] border p-3 transition-[border-color,background-color,transform] active:scale-[0.96] motion-reduce:active:scale-100 ${!activeCategorySlug ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)]' : 'border-[var(--sp-line)] bg-[var(--sp-surface)]'}`}
        >
          <span className="grid size-10 place-items-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] text-[var(--sp-brand)]">
            <LayoutGrid className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xs font-bold leading-[1.2] text-[var(--sp-ink)]">{copy.allProducts}</span>
        </Link>
        {railCategories.map((category) => {
          const active = category.slug === activeCategorySlug;
          return (
            <Link
              key={category.id}
              href={`/catalog/${category.slug}`}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-24 w-32 shrink-0 snap-start flex-col justify-between rounded-[var(--sp-radius-card)] border p-3 transition-[border-color,background-color,transform] active:scale-[0.96] motion-reduce:active:scale-100 ${active ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)]' : 'border-[var(--sp-line)] bg-[var(--sp-surface)]'}`}
            >
              <span className="size-10 overflow-hidden rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)]">
                <CategoryArtwork category={category} />
              </span>
              <span className="line-clamp-2 text-xs font-bold leading-[1.2] text-[var(--sp-ink)]">{categoryTitle(category)}</span>
            </Link>
          );
        })}
        <Link href="/branding" className="flex min-h-24 w-32 shrink-0 snap-start flex-col justify-between rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3 transition-transform active:scale-[0.96] motion-reduce:active:scale-100">
          <span className="grid size-10 place-items-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]"><Printer className="size-5" aria-hidden="true" /></span>
          <span className="line-clamp-2 text-xs font-bold leading-[1.2] text-[var(--sp-ink)]">{copy.branding}</span>
        </Link>
        {(siteSettings.modules?.bagDesigner?.enabled ?? true) ? (
          <Link href="/bag-designer" className="flex min-h-24 w-32 shrink-0 snap-start flex-col justify-between rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3 transition-transform active:scale-[0.96] motion-reduce:active:scale-100">
            <span className="grid size-10 place-items-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]"><PackagePlus className="size-5" aria-hidden="true" /></span>
            <span className="line-clamp-2 text-xs font-bold leading-[1.2] text-[var(--sp-ink)]">{copy.bagDesigner}</span>
          </Link>
        ) : null}
      </nav>

      {showFeaturedGroups ? (
        <div className="space-y-8">
          {featuredGroups.map(({ group, categories: groupCategories }, index) => (
            <section key={group.id} aria-labelledby={index === 0 ? 'mobile-category-rail-title' : `mobile-category-group-${group.id}`}>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 id={index === 0 ? 'mobile-category-rail-title' : `mobile-category-group-${group.id}`} className="text-xl font-extrabold tracking-[-0.03em] text-[var(--sp-ink)]">
                  {categoryTitle(group)}
                </h2>
                <Link href={`/catalog/${group.slug}`} className="text-xs font-bold text-[var(--sp-brand)]">{copy.viewAll}</Link>
              </div>
              {renderCategoryGrid(groupCategories, categoryTitle(group))}
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="mobile-category-rail-title" className="text-xl font-extrabold tracking-[-0.03em] text-[var(--sp-ink)]">
              {copy.catalog}
            </h2>
            <Link href="/catalog" className="text-xs font-bold text-[var(--sp-brand)]">{copy.allProducts}</Link>
          </div>
          {renderCategoryGrid(visibleLeaves, copy.categories)}
        </>
      )}
    </section>
  );
}

export function StorefrontCartSidebar() {
  const { language, getLocalizedText } = useLanguage();
  const { items, totalAmount, updateQuantity, removeItem } = useRequestCart();
  const copy = panelCopy[language];
  const hasRequestOnlyPrice = items.some((item) => item.price === undefined);

  return (
    <aside aria-label={copy.cart} className="h-full min-w-0">
      <div className="sticky top-28 overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] shadow-[var(--sp-shadow-soft)]">
        <div className="border-b border-[var(--sp-line-soft)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold tracking-[-0.025em] text-[var(--sp-ink)]">{copy.cart}</h2>
            {items.length > 0 ? (
              <span className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] px-2 py-1 text-[11px] font-bold text-[var(--sp-brand-deep)]">
                {items.length} {copy.items}
              </span>
            ) : null}
          </div>
          <div className="mt-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-3 py-2.5">
            <p className="text-xs font-bold text-[var(--sp-ink)]">{copy.delivery}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--sp-ink-secondary)]">{copy.deliveryHint}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <span className="mx-auto grid size-20 place-items-center rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)] text-[var(--sp-ink-muted)]">
              <ShoppingBasket className="size-9" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <p className="mt-5 text-sm font-bold text-[var(--sp-ink)]">{copy.empty}</p>
            <p className="mx-auto mt-1.5 max-w-[220px] text-xs leading-5 text-[var(--sp-ink-secondary)]">{copy.emptyHint}</p>
          </div>
        ) : (
          <>
            <ul className="max-h-[42dvh] divide-y divide-[var(--sp-line-soft)] overflow-y-auto px-4">
              {items.map((item) => {
                const title = getLocalizedText(item.productTitleRu, item.productTitleUz, item.productTitleEn, item.productTitleZh);
                const orderRule = item.product ? getProductOrderRule(item.product, language, item.variant) : null;
                const quantityStep = orderRule?.quantityStep ?? 1;
                const minimumQuantity = orderRule?.minimumQuantity ?? quantityStep;
                const quantityText = new Intl.NumberFormat(
                  language === 'uz' ? 'uz-UZ' : language === 'en' ? 'en-US' : 'ru-RU',
                  { maximumFractionDigits: 3 },
                ).format(item.quantity);
                return (
                  <li key={`${item.productId}:${item.variantId ?? ''}`} className="flex gap-3 py-3">
                    <Link href={`/product/${item.productSlug}`} className="relative size-14 shrink-0 overflow-hidden rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)]">
                      <ProductImage source={item.image} alt={title} sizes="56px" variant="compact" imageClassName="object-contain" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link href={`/product/${item.productSlug}`} className="line-clamp-2 text-xs font-semibold leading-4 text-[var(--sp-ink)] hover:text-[var(--sp-brand)]">{title}</Link>
                      <p className="mt-1 text-xs font-bold tabular-nums text-[var(--sp-brand)]">
                        {item.price === undefined ? copy.priceOnRequest : formatMoney(item.price * item.quantity, language, 'UZS')}
                      </p>
                      <div className="mt-1.5 ml-auto grid h-9 w-[6.25rem] grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] overflow-hidden rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-line)] bg-[var(--sp-control)]" role="group" aria-label={title}>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity <= minimumQuantity) removeItem(item.productId, item.variantId);
                            else updateQuantity(item.productId, item.quantity - quantityStep, item.variantId);
                          }}
                          className="grid size-9 place-items-center transition-colors hover:bg-[var(--sp-surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]"
                          aria-label={copy.decrease}
                        >
                          <Minus className="size-3" aria-hidden="true" />
                        </button>
                        <span className="grid min-w-0 place-items-center text-xs font-bold tabular-nums" aria-live="polite">{quantityText}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + quantityStep, item.variantId)}
                          className="grid size-9 place-items-center transition-colors hover:bg-[var(--sp-surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]"
                          aria-label={copy.increase}
                        >
                          <Plus className="size-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-[var(--sp-line)] p-4">
              <div className="flex items-end justify-between gap-3">
                <span className="text-xs text-[var(--sp-ink-secondary)]">{copy.preliminary}</span>
                <strong className="text-lg tabular-nums text-[var(--sp-ink)]">
                  {totalAmount > 0 ? formatMoney(totalAmount, language, 'UZS') : copy.priceOnRequest}
                </strong>
              </div>
              {hasRequestOnlyPrice ? <p className="mt-1 text-[10px] text-[var(--sp-ink-muted)]">+ {copy.priceOnRequest.toLowerCase()}</p> : null}
              <Link href="/request" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-bold text-[var(--sp-on-brand)] transition-[background-color,opacity] hover:bg-[var(--sp-brand-deep)] active:opacity-85">
                {copy.checkout}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
