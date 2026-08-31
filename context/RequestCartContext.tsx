'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { RequestItem, Product, ProductVariant } from '@/types';
import { normalizeOrderQuantity } from '@/lib/commerce/orderQuantities';
import {
  getProductPriceMode,
  getProductOrderUnitPrice,
  isProductOrderable,
} from '@/lib/commerce/productOffer';
import { getSeedProductTranslation } from '@/lib/catalog/seedProductLocalization';

interface RequestCartContextType {
  items: RequestItem[];
  addItem: (product: Product, variant?: ProductVariant, quantity?: number, comment?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  updateComment: (productId: string, comment: string, variantId?: string) => void;
  clearCart: () => void;
  isHydrated: boolean;
  itemCount: number;
  totalAmount: number;
  isInCart: (productId: string, variantId?: string) => boolean;
}

const RequestCartContext = createContext<RequestCartContextType | undefined>(undefined);

const LOCAL_STORAGE_CART_KEY = 'sanpack_request_cart_v1';

function readStoredItems(): RequestItem[] {
  try {
    const data = window.localStorage.getItem(LOCAL_STORAGE_CART_KEY);
    if (!data) return [];

    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RequestItem[]).map((item) => {
      let restored = item;
      if (!item.productTitleZh?.trim()) {
        const seedCode = item.product?.sku?.replace(/^SP-/i, '');
        const translation = seedCode ? getSeedProductTranslation(seedCode) : undefined;
        if (translation?.zh) {
          restored = {
            ...restored,
            productTitleZh: translation.zh,
            product: item.product ? { ...item.product, titleZh: translation.zh } : item.product,
          };
        }
      }
      return restored.product
        ? {
            ...restored,
            price: getProductOrderUnitPrice(
              restored.product,
              restored.variant,
              restored.quantity,
            ),
          }
        : restored;
    });
  } catch {
    return [];
  }
}

export function RequestCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Reading browser storage is necessarily a post-mount synchronization step.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStoredItems());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(items));
  }, [isHydrated, items]);

  const addItem = (
    product: Product,
    variant?: ProductVariant,
    quantity: number = 1,
    comment?: string
  ) => {
    if (product.variants?.length && !variant) return;
    if (!isProductOrderable(product, variant)) return;
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === product.id && i.variantId === (variant?.id || undefined)
      );

      if (existingIdx !== -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const nextQuantity = normalizeOrderQuantity(
          existing.product || product,
          existing.quantity + quantity,
          existing.variant || variant,
        );
        existing.quantity = nextQuantity;
        existing.price = getProductOrderUnitPrice(
          existing.product || product,
          existing.variant || variant,
          nextQuantity,
        );
        if (comment) updated[existingIdx].comment = comment;
        return updated;
      }

      const normalizedQuantity = normalizeOrderQuantity(product, quantity, variant);
      const newItem: RequestItem = {
        productId: product.id,
        productTitleRu: product.titleRu,
        productTitleUz: product.titleUz,
        productTitleEn: product.titleEn,
        productTitleZh: product.titleZh,
        productSlug: product.slug,
        variantId: variant?.id,
        variantTitleRu: variant?.titleRu,
        variantTitleUz: variant?.titleUz,
        variantTitleEn: variant?.titleEn,
        variantTitleZh: variant?.titleZh,
        sku: variant?.sku || product.sku,
        quantity: normalizedQuantity,
        unit: product.salesUnit || 'шт',
        price: getProductOrderUnitPrice(product, variant, normalizedQuantity),
        priceMode: getProductPriceMode(product, variant),
        comment,
        image: variant?.image || product.mainImage,
        product,
        variant,
      };

      return [...prev, newItem];
    });
  };

  const removeItem = (productId: string, variantId?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? (() => {
              const normalizedQuantity = i.product
                ? normalizeOrderQuantity(i.product, quantity, i.variant)
                : Math.max(1, quantity);
              return {
                ...i,
                quantity: normalizedQuantity,
                price: i.product
                  ? getProductOrderUnitPrice(i.product, i.variant, normalizedQuantity)
                  : i.price,
              };
            })()
          : i
      )
    );
  };

  const updateComment = (productId: string, comment: string, variantId?: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, comment }
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalAmount = items.reduce((acc, curr) => acc + (curr.price || 0) * curr.quantity, 0);

  const isInCart = (productId: string, variantId?: string) => {
    return items.some((i) => i.productId === productId && i.variantId === variantId);
  };

  return (
    <RequestCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateComment,
        clearCart,
        isHydrated,
        itemCount,
        totalAmount,
        isInCart,
      }}
    >
      {children}
    </RequestCartContext.Provider>
  );
}

export function useRequestCart() {
  const context = useContext(RequestCartContext);
  if (!context) {
    throw new Error('useRequestCart must be used within a RequestCartProvider');
  }
  return context;
}
