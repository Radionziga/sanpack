'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { RequestItem, Product, ProductVariant } from '@/types';

interface RequestCartContextType {
  items: RequestItem[];
  addItem: (product: Product, variant?: ProductVariant, quantity?: number, comment?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  updateComment: (productId: string, comment: string, variantId?: string) => void;
  clearCart: () => void;
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
    return Array.isArray(parsed) ? parsed as RequestItem[] : [];
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
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === product.id && i.variantId === (variant?.id || undefined)
      );

      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        if (comment) updated[existingIdx].comment = comment;
        return updated;
      }

      const newItem: RequestItem = {
        productId: product.id,
        productTitleRu: product.titleRu,
        productTitleUz: product.titleUz,
        productTitleEn: product.titleEn,
        productSlug: product.slug,
        variantId: variant?.id,
        variantTitleRu: variant?.titleRu,
        variantTitleUz: variant?.titleUz,
        variantTitleEn: variant?.titleEn,
        sku: variant?.sku || product.sku,
        quantity: Math.max(quantity, product.minimumOrder || 1),
        unit: product.salesUnit || 'шт',
        price: variant?.price || product.price,
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
          ? { ...i, quantity }
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
