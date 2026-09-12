'use client';

import { Plus, ShoppingCart } from 'lucide-react';
import type { Product, ProductVariant } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useToast } from '@/context/ToastContext';
import { getProductOrderRule, normalizeOrderQuantity } from '@/lib/commerce/orderQuantities';
import { QuantityControl } from '@/components/commerce/QuantityControl';

interface ProductCartControlProps {
  product: Product;
  variant?: ProductVariant;
  className?: string;
  size?: 'card' | 'detail' | 'market';
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
  zh: { add: '加入购物车', added: '商品已加入购物车', decrease: '减少数量', increase: '增加数量' },
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
  const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn, product.titleZh);
  const variantTitle = variant
    ? getLocalizedText(variant.titleRu, variant.titleUz, variant.titleEn, variant.titleZh)
    : '';
  const quantityAriaLabel = `${language === 'ru' ? 'Количество' : language === 'uz' ? 'Miqdor' : language === 'zh' ? '数量' : 'Quantity'}: ${title}${variantTitle ? ` — ${variantTitle}` : ''}`;

  if (size === 'market') {
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
          aria-label={`${copy.add}: ${title}`}
          title={copy.add}
          className={`flex size-11 cursor-pointer items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface)] text-[var(--sp-brand)] shadow-[0_5px_18px_rgb(21_27_24/16%)] ring-1 ring-inset ring-[var(--sp-line)] transition-[background-color,transform] hover:bg-[var(--sp-brand-soft)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] motion-reduce:active:scale-100 ${className}`}
        >
          <Plus className="size-5" strokeWidth={2.25} aria-hidden="true" />
        </button>
      );
    }

    return (
      <QuantityControl
        value={item.quantity}
        minimum={orderRule.minimumQuantity}
        step={orderRule.quantityStep}
        maximum={orderRule.maximumQuantity}
        normalize={(value) => normalizeOrderQuantity(product, value, variant)}
        onChange={(value) => updateQuantity(product.id, value, variant?.id)}
        onDecreaseAtMinimum={() => removeItem(product.id, variant?.id)}
        ariaLabel={quantityAriaLabel}
        decreaseLabel={copy.decrease}
        increaseLabel={copy.increase}
        className={`w-[8rem] bg-[var(--sp-surface)] shadow-[0_5px_18px_rgb(21_27_24/16%)] ${className}`}
      />
    );
  }

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

  return (
    <QuantityControl
      value={item.quantity}
      minimum={orderRule.minimumQuantity}
      step={orderRule.quantityStep}
      maximum={orderRule.maximumQuantity}
      normalize={(value) => normalizeOrderQuantity(product, value, variant)}
      onChange={(value) => updateQuantity(product.id, value, variant?.id)}
      onDecreaseAtMinimum={() => removeItem(product.id, variant?.id)}
      ariaLabel={quantityAriaLabel}
      decreaseLabel={copy.decrease}
      increaseLabel={copy.increase}
      className={`${controlHeight} ${className}`}
    />
  );
}
