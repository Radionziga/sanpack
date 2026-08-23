'use client';

import { Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Product, ProductVariant } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useToast } from '@/context/ToastContext';
import { getProductOrderRule } from '@/lib/commerce/orderQuantities';
import { formatProductQuantity } from '@/lib/catalog/productPresentation';

interface ProductCartControlProps {
  product: Product;
  variant?: ProductVariant;
  className?: string;
  size?: 'card' | 'detail';
  initialQuantity?: number;
}

const labels = {
  ru: {
    add: 'В корзину',
    added: 'Товар добавлен в корзину',
    decrease: 'Уменьшить количество',
    increase: 'Увеличить количество',
  },
  uz: {
    add: 'Savatga',
    added: 'Mahsulot savatga qo‘shildi',
    decrease: 'Miqdorni kamaytirish',
    increase: 'Miqdorni oshirish',
  },
  en: {
    add: 'Add to cart',
    added: 'Product added to cart',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
  },
} as const;

export function ProductCartControl({
  product,
  variant,
  className = '',
  size = 'card',
  initialQuantity,
}: ProductCartControlProps) {
  const { language, getLocalizedText } = useLanguage();
  const { items, addItem, updateQuantity, removeItem } = useRequestCart();
  const { showToast } = useToast();
  const copy = labels[language];
  const orderRule = getProductOrderRule(product, language, variant);
  const item = items.find(
    (candidate) => candidate.productId === product.id && candidate.variantId === variant?.id,
  );
  const controlHeight = size === 'detail' ? 'min-h-12' : 'min-h-11';
  const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn);

  if (!item) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          addItem(product, variant, initialQuantity ?? orderRule.minimumQuantity);
          showToast(copy.added, title);
        }}
        className={`${controlHeight} flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-3 text-xs font-semibold text-[var(--sp-on-brand)] transition-[background-color,opacity] hover:bg-[var(--sp-brand-deep)] active:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] sm:text-sm ${className}`}
      >
        <ShoppingCart className="size-4" aria-hidden="true" />
        <span>{copy.add}</span>
      </button>
    );
  }

  const quantityText = formatProductQuantity(product, item.quantity, language);

  return (
    <div
      className={`${controlHeight} grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-stretch overflow-hidden rounded-[var(--sp-radius-control)] bg-[var(--sp-control)] text-[var(--sp-ink)] ring-1 ring-inset ring-[var(--sp-line-strong)] ${className}`}
      role="group"
      aria-label={title}
    >
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.quantity <= orderRule.minimumQuantity) {
            removeItem(product.id, variant?.id);
            return;
          }
          updateQuantity(product.id, item.quantity - orderRule.quantityStep, variant?.id);
        }}
        aria-label={copy.decrease}
        className="flex min-h-11 cursor-pointer items-center justify-center transition-colors hover:bg-[var(--sp-surface-inset)] active:bg-[var(--sp-line)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="flex min-w-0 items-center justify-center px-1 text-center text-xs font-bold tabular-nums sm:text-sm" aria-live="polite">
        <span className="truncate">{quantityText}</span>
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          updateQuantity(product.id, item.quantity + orderRule.quantityStep, variant?.id);
        }}
        aria-label={copy.increase}
        className="flex min-h-11 cursor-pointer items-center justify-center transition-colors hover:bg-[var(--sp-surface-inset)] active:bg-[var(--sp-line)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
