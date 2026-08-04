'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { motion } from 'motion/react';
import { Product } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useFavorites } from '@/context/FavoritesContext';
import {
  HeartIcon,
  ShoppingCartIcon,
  CheckIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import { useToast } from '@/context/ToastContext';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

export function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const { t, getLocalizedText, fixText, language } = useLanguage();
  const copy = {
    ru: ['Товар добавлен в заявку', 'Удалено из избранного', 'Добавлено в избранное', 'сум'],
    uz: ['Mahsulot arizaga qo‘shildi', 'Tanlanganlardan olib tashlandi', 'Tanlanganlarga qo‘shildi', 'so‘m'],
    en: ['Product added to quote', 'Removed from favorites', 'Added to favorites', 'UZS'],
  }[language];
  const { addItem, isInCart } = useRequestCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn);
  const shortDesc = getLocalizedText(product.shortDescriptionRu, product.shortDescriptionUz, product.shortDescriptionEn);
  const favorited = isFavorite(product.id);
  const inCart = isInCart(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.variants?.[0], product.minimumOrder || 1);
    showToast(copy[0], title);
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
    showToast(favorited ? copy[1] : copy[2], title, 'info');
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="bg-[var(--sp-surface)] rounded-lg border border-[var(--sp-line)] p-4 hover:border-[var(--sp-line-strong)] transition-colors flex flex-col md:flex-row items-center gap-5 group"
      >
        <Link href={`/product/${product.slug}`} className="shrink-0 relative">
          <Image
            src={product.mainImage}
            alt={title}
            width={128}
            height={128}
            sizes="128px"
            className="w-32 h-32 object-contain rounded-md bg-[var(--sp-surface)] p-2 group-hover:scale-105 transition-transform duration-300"
          />
          {product.ownProduction && (
            <span className="absolute top-2 left-2 bg-[var(--sp-brand)] text-[var(--sp-on-brand)] text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
              <BuildingOffice2Icon className="w-3 h-3" /> SANPACK
            </span>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-slate-400">
              {t('sku')} {product.sku}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-[var(--sp-brand)] font-semibold flex items-center gap-1">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              {product.stockStatus === 'in_stock' ? t('inStock') : t('outOfStock')}
            </span>
          </div>

          <Link href={`/product/${product.slug}`}>
            <h3 className="text-sm font-semibold text-[var(--sp-ink)] group-hover:text-[var(--sp-brand)] transition-colors mb-1 line-clamp-1 tracking-tight">
              {title}
            </h3>
          </Link>

          <p className="text-xs text-[var(--sp-ink-secondary)] line-clamp-2 mb-3 leading-relaxed">{shortDesc}</p>

          <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
            {Object.entries(product.attributes || {}).map(([key, val]) => (
              <span
                key={key}
                className="bg-[var(--sp-surface-inset)] px-2 py-0.5 rounded font-medium border border-[var(--sp-line)]"
              >
                {fixText(String(val))}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 w-full md:w-auto">
          <div className="text-right">
            <span className="text-base font-semibold text-[var(--sp-brand)] block tracking-tight">
              {product.showPrice && product.price
                ? `${product.price.toLocaleString()} ${copy[3]}`
                : t('priceOnRequest')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('minOrder')} {product.minimumOrder} {product.salesUnit}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleToggleFav}
              className={`p-2 rounded-lg border transition-colors ${
                favorited
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'border-slate-200 text-slate-400 hover:text-rose-500'
              }`}
            >
              {favorited ? (
                <HeartSolidIcon className="w-4 h-4 text-rose-600" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleAddToCart}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
                inCart
                  ? 'bg-[var(--sp-brand-deep)] text-[var(--sp-on-brand-deep)]'
                  : 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] hover:opacity-90'
              }`}
            >
              {inCart ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  <span>{t('inRequestCart')}</span>
                </>
              ) : (
                <>
                  <ShoppingCartIcon className="w-4 h-4" />
                  <span>{t('addToRequest')}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid mode
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      className="bg-[var(--sp-surface)] rounded-lg border border-[var(--sp-line)] p-4 hover:border-[var(--sp-line-strong)] transition-colors flex flex-col justify-between group relative overflow-hidden"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {product.ownProduction && (
              <span className="bg-[var(--sp-surface-inset)] text-[var(--sp-brand)] text-[10px] font-semibold px-2 py-0.5 rounded border border-[var(--sp-line)] flex items-center gap-1">
                <BuildingOffice2Icon className="w-3 h-3" /> SANPACK
              </span>
            )}
            {product.newProduct && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                NEW
              </span>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleToggleFav}
            className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
            title={t('favorites')}
          >
            {favorited ? (
              <HeartSolidIcon className="w-4 h-4 text-rose-600" />
            ) : (
              <HeartIcon className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        {/* Image Container */}
        <Link
          href={`/product/${product.slug}`}
          className="block relative aspect-square bg-[var(--sp-surface)] rounded-md p-2 mb-3 overflow-hidden"
        >
          <Image
            src={product.mainImage}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* SKU & Stock */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-medium">
          <span>
            {t('sku')} {product.sku}
          </span>
          <span className="text-[var(--sp-brand)] font-semibold">
            {product.stockStatus === 'in_stock' ? t('inStock') : t('outOfStock')}
          </span>
        </div>

        {/* Product Title */}
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-sm font-semibold text-[var(--sp-ink)] group-hover:text-[var(--sp-brand)] transition-colors mb-2 line-clamp-2 leading-snug tracking-tight">
            {title}
          </h3>
        </Link>

        {/* Attributes Preview Chips */}
        <div className="flex flex-wrap gap-1 text-[10px] text-slate-600 mb-3">
          {Object.entries(product.attributes || {})
            .slice(0, 3)
            .map(([key, val]) => (
              <span
                key={key}
                className="bg-[var(--sp-surface-inset)] px-2 py-0.5 rounded font-medium text-[var(--sp-ink-secondary)] border border-[var(--sp-line)]"
              >
                {fixText(String(val))}
              </span>
            ))}
        </div>
      </div>

      {/* Footer Price & Add Button */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
        <div>
          <span className="text-sm font-semibold text-[var(--sp-brand)] block tracking-tight">
            {product.showPrice && product.price
              ? `${product.price.toLocaleString()} ${copy[3]}`
              : t('priceOnRequest')}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {t('minOrder')} {product.minimumOrder} {product.salesUnit}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={handleAddToCart}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs ${
            inCart
              ? 'bg-[var(--sp-brand-deep)] text-[var(--sp-on-brand-deep)]'
              : 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] hover:opacity-90'
          }`}
        >
          {inCart ? (
            <>
              <CheckIcon className="w-3.5 h-3.5" />
              <span>{t('inRequestCart')}</span>
            </>
          ) : (
            <>
              <ShoppingCartIcon className="w-3.5 h-3.5" />
              <span>{t('addToRequest')}</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
