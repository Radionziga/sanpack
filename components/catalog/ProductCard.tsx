'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { Attribute, Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useFavorites } from '@/context/FavoritesContext';
import {
  AdjustmentsHorizontalIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import { useToast } from '@/context/ToastContext';
import { getMinimumOrderLabel } from '@/lib/commerce/orderQuantities';
import {
  getProductCatalogPriceText,
  getProductSupportingText,
  getPresentedProductAttributes,
} from '@/lib/catalog/productPresentation';
import { isProductOrderable } from '@/lib/commerce/productOffer';
import { ProductImage } from '@/components/catalog/ProductImage';
import { ProductCartControl } from '@/components/catalog/ProductCartControl';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
  eagerImage?: boolean;
  appearance?: 'default' | 'market';
  attributeDefinitions?: Attribute[];
}

export function ProductCard({ product, viewMode = 'grid', eagerImage = false, appearance = 'default', attributeDefinitions = [] }: ProductCardProps) {
  const { t, getLocalizedText, language } = useLanguage();
  const copy = {
    ru: ['Товар добавлен в заявку', 'Удалено из избранного', 'Добавлено в избранное'],
    uz: ['Mahsulot arizaga qo‘shildi', 'Tanlanganlardan olib tashlandi', 'Tanlanganlarga qo‘shildi'],
    en: ['Product added to quote', 'Removed from favorites', 'Added to favorites'],
    zh: ['商品已加入购物车', '已取消收藏', '已加入收藏'],
  }[language];
  const favoriteCopy = {
    ru: ['Добавить в избранное', 'Убрать из избранного'],
    uz: ['Tanlanganlarga qo‘shish', 'Tanlanganlardan olib tashlash'],
    en: ['Add to favorites', 'Remove from favorites'],
    zh: ['加入收藏', '取消收藏'],
  }[language];
  const compactActionCopy = {
    ru: { choose: 'Выбрать' },
    uz: { choose: 'Tanlash' },
    en: { choose: 'Choose' },
    zh: { choose: '选择' },
  }[language];
  const chooseVariantCopy = {
    ru: 'Выбрать вариант',
    uz: 'Variantni tanlash',
    en: 'Choose variant',
    zh: '选择规格',
  }[language];
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn, product.titleZh);
  const supportingText = getProductSupportingText(product, language);
  const favorited = isFavorite(product.id);
  const hasVariants = Boolean(product.variants?.length);
  const orderable = isProductOrderable(product);
  const minimumOrderLabel = getMinimumOrderLabel(product, language);
  const price = getProductCatalogPriceText(product, language);
  const cardAttributes = getPresentedProductAttributes(product, attributeDefinitions, language)
    .filter((presented) => attributeDefinitions.find((definition) => definition.key === presented.key)?.cardVisible)
    .slice(0, 2);
  const cardAttributeText = cardAttributes.map((attribute) => attribute.value).join(' · ');

  const handleToggleFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(product.id);
    showToast(favorited ? copy[1] : copy[2], title, 'info');
  };

  const favoriteLabel = favorited ? favoriteCopy[1] : favoriteCopy[0];

  if (appearance === 'market' && viewMode === 'grid') {
    return (
      <article className="group min-w-0">
        <div className="relative aspect-square overflow-hidden rounded-[var(--sp-radius-card)] bg-[var(--sp-surface-inset)]">
          <Link href={`/product/${product.slug}`} className="absolute inset-0 overflow-hidden rounded-[inherit]">
            <ProductImage
              source={product.mainImage}
              alt={title}
              sizes="(max-width: 767px) calc(50vw - 22px), (max-width: 1279px) 33vw, 220px"
              loading={eagerImage ? 'eager' : 'lazy'}
              fetchPriority={eagerImage ? 'high' : undefined}
              imageClassName="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          </Link>
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={favoriteLabel}
            title={favoriteLabel}
            className="absolute right-2 top-2 grid size-11 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface)]/94 text-[var(--sp-brand)] shadow-[0_5px_18px_rgb(21_27_24/16%)] ring-1 ring-inset ring-[var(--sp-line)] backdrop-blur-sm transition-[background-color,transform] hover:bg-[var(--sp-brand-soft)] active:scale-[0.96] motion-reduce:active:scale-100"
          >
            {favorited ? <HeartSolidIcon className="size-5" /> : <HeartIcon className="size-5" />}
          </button>
          <div className="absolute bottom-2 right-2 z-10">
            {hasVariants || !orderable ? (
              <Link
                href={`/product/${product.slug}`}
                aria-label={hasVariants ? chooseVariantCopy : t('details')}
                title={hasVariants ? chooseVariantCopy : t('details')}
                className="grid size-11 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface)] text-[var(--sp-brand)] shadow-[0_5px_18px_rgb(21_27_24/16%)] ring-1 ring-inset ring-[var(--sp-line)] transition-[background-color,transform] hover:bg-[var(--sp-brand-soft)] active:scale-[0.96] motion-reduce:active:scale-100"
              >
                <AdjustmentsHorizontalIcon className="size-5" aria-hidden="true" />
              </Link>
            ) : <ProductCartControl product={product} size="market" />}
          </div>
        </div>

        <div className="px-0.5 pb-1 pt-2.5">
          <p className="text-base font-extrabold leading-none tracking-[-0.025em] text-[var(--sp-ink)]">{price}</p>
          <Link href={`/product/${product.slug}`}>
            <h3 className="mt-1.5 line-clamp-2 min-h-[2.4rem] text-sm font-semibold leading-[1.25] tracking-[-0.015em] text-[var(--sp-ink)] transition-colors group-hover:text-[var(--sp-brand)]">
              {title}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-[var(--sp-ink-muted)]">{minimumOrderLabel}</p>
          {cardAttributeText ? <p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--sp-ink-muted)]">{cardAttributeText}</p> : null}
        </div>
      </article>
    );
  }

  if (viewMode === 'list') {
    return (
      <article className="group grid gap-4 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--sp-brand)_42%,var(--sp-line))] hover:shadow-[var(--sp-shadow-raised)] motion-reduce:hover:translate-y-0 md:grid-cols-[168px_minmax(0,1fr)_auto] md:items-stretch">
        <div className="relative">
          <Link
            href={`/product/${product.slug}`}
            className="relative block aspect-[4/3] overflow-hidden rounded-[var(--sp-radius-control-inner)] bg-white md:aspect-square"
          >
            <ProductImage
              source={product.mainImage}
              alt={title}
              sizes="(max-width: 767px) 100vw, 168px"
              loading={eagerImage ? 'eager' : 'lazy'}
              fetchPriority={eagerImage ? 'high' : undefined}
              imageClassName="object-contain transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          </Link>
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={favoriteLabel}
            title={favoriteLabel}
            className="absolute right-2.5 top-2.5 flex size-11 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] text-[var(--sp-brand)] shadow-[var(--sp-shadow-soft)] transition-[background-color,border-color,transform] hover:border-[var(--sp-brand)] hover:bg-[var(--sp-brand-soft)] active:scale-[0.96] motion-reduce:active:scale-100"
          >
            {favorited ? <HeartSolidIcon className="size-5" /> : <HeartIcon className="size-5" />}
          </button>
        </div>

        <div className="flex min-w-0 flex-col py-1">
          <Link href={`/product/${product.slug}`} className="w-fit max-w-full">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-[var(--sp-ink)] transition-colors group-hover:text-[var(--sp-brand)]">
              {title}
            </h3>
          </Link>

          {supportingText ? (
            <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-relaxed text-[var(--sp-ink-secondary)]">
              {supportingText}
            </p>
          ) : null}
          {cardAttributeText ? <p className="mt-1 line-clamp-1 text-xs text-[var(--sp-ink-muted)]">{cardAttributeText}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[var(--sp-ink-muted)]">
            {product.brandName ? <span className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] px-2.5 py-1">{product.brandName}</span> : null}
            {product.sku ? <span className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] px-2.5 py-1 tabular-nums">{product.sku}</span> : null}
            <span className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] px-2.5 py-1 text-[var(--sp-brand-deep)]">{minimumOrderLabel}</span>
          </div>

        </div>

        <div className="flex min-w-[188px] flex-col justify-between gap-4 border-t border-[var(--sp-line-soft)] pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <div>
            <span className="block text-base font-semibold tracking-tight text-[var(--sp-brand)]">{price}</span>
            <span className="mt-0.5 block text-xs text-[var(--sp-ink-muted)]">{minimumOrderLabel}</span>
          </div>
          {hasVariants || !orderable ? (
            <Link
              href={`/product/${product.slug}`}
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)] transition-[background-color,transform] hover:bg-[var(--sp-brand-deep)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] motion-reduce:active:scale-100"
            >
              <AdjustmentsHorizontalIcon className="size-4" aria-hidden="true" />
              <span>{hasVariants ? chooseVariantCopy : t('details')}</span>
            </Link>
          ) : <ProductCartControl product={product} />}
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-2 transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_srgb,var(--sp-brand)_42%,var(--sp-line))] hover:shadow-[var(--sp-shadow-soft)] sm:p-3">
      <div className="relative">
        <Link
          href={`/product/${product.slug}`}
          className="relative block aspect-square overflow-hidden rounded-[var(--sp-radius-control-inner)] bg-white"
        >
          <ProductImage
            source={product.mainImage}
            alt={title}
            sizes="(max-width: 767px) calc(50vw - 24px), (max-width: 1024px) 33vw, 280px"
            loading={eagerImage ? 'eager' : 'lazy'}
            fetchPriority={eagerImage ? 'high' : undefined}
            imageClassName="object-contain transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </Link>

        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={favoriteLabel}
          title={favoriteLabel}
          className="absolute right-1.5 top-1.5 flex size-11 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] text-[var(--sp-brand)] shadow-[var(--sp-shadow-soft)] transition-[background-color,border-color,transform] hover:border-[var(--sp-brand)] hover:bg-[var(--sp-brand-soft)] active:scale-[0.96] motion-reduce:active:scale-100 sm:right-2.5 sm:top-2.5"
        >
          {favorited ? <HeartSolidIcon className="size-5" /> : <HeartIcon className="size-5" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col px-0.5 pb-0.5 pt-2.5 sm:px-1 sm:pb-1 sm:pt-4">
        <Link href={`/product/${product.slug}`} className="w-fit max-w-full">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug tracking-tight text-[var(--sp-ink)] transition-colors group-hover:text-[var(--sp-brand)] sm:min-h-[2.75rem] sm:text-base">
            {title}
          </h3>
        </Link>

        {supportingText ? (
          <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-[var(--sp-ink-secondary)] sm:mt-1.5 sm:line-clamp-2 sm:text-xs">
            {supportingText}
          </p>
        ) : null}
        {cardAttributeText ? <p className="mt-1 line-clamp-1 text-[11px] text-[var(--sp-ink-muted)]">{cardAttributeText}</p> : null}


        <div className="mt-auto flex flex-col gap-2.5 border-t border-[var(--sp-line-soft)] pt-3 sm:gap-3 sm:pt-4">
          <div className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight text-[var(--sp-brand)] sm:text-base">{price}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-[var(--sp-ink-muted)] sm:text-xs">{minimumOrderLabel}</span>
          </div>

          {hasVariants || !orderable ? (
            <Link
              href={`/product/${product.slug}`}
              className="flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-2 text-xs font-semibold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)] transition-[background-color,transform] hover:bg-[var(--sp-brand-deep)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] motion-reduce:active:scale-100 sm:gap-2 sm:px-4 sm:text-sm"
            >
              <AdjustmentsHorizontalIcon className="size-4" aria-hidden="true" />
              <span className="sm:hidden">{hasVariants ? compactActionCopy.choose : t('details')}</span>
              <span className="hidden sm:inline">{hasVariants ? chooseVariantCopy : t('details')}</span>
            </Link>
          ) : <ProductCartControl product={product} />}
        </div>
      </div>
    </article>
  );
}
