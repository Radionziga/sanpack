'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useFavorites } from '@/context/FavoritesContext';
import {
  AdjustmentsHorizontalIcon,
  HeartIcon,
  ShoppingCartIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import { useToast } from '@/context/ToastContext';
import { getMinimumOrderLabel, getProductOrderRule } from '@/lib/commerce/orderQuantities';
import {
  getProductCatalogPriceText,
  getProductSupportingText,
} from '@/lib/catalog/productPresentation';
import { isProductOrderable } from '@/lib/commerce/productOffer';
import { ProductImage } from '@/components/catalog/ProductImage';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
  eagerImage?: boolean;
}

export function ProductCard({ product, viewMode = 'grid', eagerImage = false }: ProductCardProps) {
  const { t, getLocalizedText, language } = useLanguage();
  const copy = {
    ru: ['Товар добавлен в заявку', 'Удалено из избранного', 'Добавлено в избранное'],
    uz: ['Mahsulot arizaga qo‘shildi', 'Tanlanganlardan olib tashlandi', 'Tanlanganlarga qo‘shildi'],
    en: ['Product added to quote', 'Removed from favorites', 'Added to favorites'],
  }[language];
  const favoriteCopy = {
    ru: ['Добавить в избранное', 'Убрать из избранного'],
    uz: ['Tanlanganlarga qo‘shish', 'Tanlanganlardan olib tashlash'],
    en: ['Add to favorites', 'Remove from favorites'],
  }[language];
  const compactActionCopy = {
    ru: { add: 'В заявку', added: 'Добавлено', choose: 'Выбрать' },
    uz: { add: 'Arizaga', added: 'Qo‘shildi', choose: 'Tanlash' },
    en: { add: 'Add', added: 'Added', choose: 'Choose' },
  }[language];
  const chooseVariantCopy = {
    ru: 'Выбрать вариант',
    uz: 'Variantni tanlash',
    en: 'Choose variant',
  }[language];
  const { addItem, isInCart } = useRequestCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn);
  const supportingText = getProductSupportingText(product, language);
  const favorited = isFavorite(product.id);
  const hasVariants = Boolean(product.variants?.length);
  const orderable = isProductOrderable(product);
  const inCart = isInCart(product.id);
  const orderRule = getProductOrderRule(product, language);
  const minimumOrderLabel = getMinimumOrderLabel(product, language);
  const price = getProductCatalogPriceText(product, language);

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (hasVariants) return;
    addItem(product, undefined, orderRule.minimumQuantity);
    showToast(copy[0], title);
  };

  const handleToggleFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(product.id);
    showToast(favorited ? copy[1] : copy[2], title, 'info');
  };

  const favoriteLabel = favorited ? favoriteCopy[1] : favoriteCopy[0];

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

        </div>

        <div className="flex min-w-[188px] flex-col justify-end gap-4 border-t border-[var(--sp-line-soft)] pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
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
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-semibold shadow-[var(--sp-shadow-soft)] transition-[background-color,transform] active:scale-[0.96] motion-reduce:active:scale-100 ${
                inCart
                  ? 'bg-[var(--sp-brand-deep)] text-[var(--sp-on-brand-deep)]'
                  : 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-deep)]'
              }`}
            >
              {inCart ? <CheckIcon className="size-4" /> : <ShoppingCartIcon className="size-4" />}
              <span>{inCart ? t('inRequestCart') : t('addToRequest')}</span>
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-2 transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--sp-brand)_42%,var(--sp-line))] hover:shadow-[var(--sp-shadow-raised)] motion-reduce:hover:translate-y-0 sm:p-3 md:hover:-translate-y-1">
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
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-[var(--sp-ink)] transition-colors group-hover:text-[var(--sp-brand)] sm:text-base">
            {title}
          </h3>
        </Link>

        {supportingText ? (
          <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-[var(--sp-ink-secondary)] sm:mt-1.5 sm:line-clamp-2 sm:text-xs">
            {supportingText}
          </p>
        ) : null}


        <div className="mt-auto flex flex-col gap-2.5 border-t border-[var(--sp-line-soft)] pt-3 sm:gap-3 sm:pt-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight text-[var(--sp-brand)] sm:text-base">{price}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-[var(--sp-ink-muted)] sm:text-xs">{minimumOrderLabel}</span>
          </div>

          {hasVariants || !orderable ? (
            <Link
              href={`/product/${product.slug}`}
              className="flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-2 text-xs font-semibold text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)] transition-[background-color,transform] hover:bg-[var(--sp-brand-deep)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] motion-reduce:active:scale-100 sm:gap-2 sm:px-4 sm:text-sm lg:w-auto"
            >
              <AdjustmentsHorizontalIcon className="size-4" aria-hidden="true" />
              <span className="sm:hidden">{hasVariants ? compactActionCopy.choose : t('details')}</span>
              <span className="hidden sm:inline">{hasVariants ? chooseVariantCopy : t('details')}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--sp-radius-control)] px-2 text-xs font-semibold shadow-[var(--sp-shadow-soft)] transition-[background-color,transform] active:scale-[0.96] motion-reduce:active:scale-100 sm:gap-2 sm:px-4 sm:text-sm lg:w-auto ${
                inCart
                  ? 'bg-[var(--sp-brand-deep)] text-[var(--sp-on-brand-deep)]'
                  : 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-deep)]'
              }`}
            >
              {inCart ? <CheckIcon className="size-4" /> : <ShoppingCartIcon className="size-4" />}
              <span className="sm:hidden">{inCart ? compactActionCopy.added : compactActionCopy.add}</span>
              <span className="hidden sm:inline">{inCart ? t('inRequestCart') : t('addToRequest')}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
