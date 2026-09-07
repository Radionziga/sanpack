import type { Product, RequestItem } from '@/types';
import { normalizeOrderQuantity } from '@/lib/commerce/orderQuantities';
import { getProductOrderUnitPrice, getProductPriceMode } from '@/lib/commerce/productOffer';

export interface CartReconciliationIssue {
  productId: string;
  kind: 'unavailable' | 'variant_removed' | 'quantity_changed' | 'price_changed';
}

export function reconcileCartItems(items: RequestItem[], products: Product[]) {
  const issues: CartReconciliationIssue[] = [];
  const nextItems: RequestItem[] = [];
  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || product.status !== 'published') {
      issues.push({ productId: item.productId, kind: 'unavailable' });
      continue;
    }
    const variant = item.variantId
      ? product.variants?.find((candidate) => candidate.id === item.variantId)
      : undefined;
    if (item.variantId && !variant) {
      issues.push({ productId: item.productId, kind: 'variant_removed' });
      continue;
    }
    const quantity = normalizeOrderQuantity(product, item.quantity, variant);
    const price = getProductOrderUnitPrice(product, variant, quantity);
    if (quantity !== item.quantity) issues.push({ productId: item.productId, kind: 'quantity_changed' });
    if (price !== item.price) issues.push({ productId: item.productId, kind: 'price_changed' });
    nextItems.push({
      ...item,
      productTitleRu: product.titleRu,
      productTitleUz: product.titleUz,
      productTitleEn: product.titleEn,
      productTitleZh: product.titleZh,
      productSlug: product.slug,
      variantTitleRu: variant?.titleRu,
      variantTitleUz: variant?.titleUz,
      variantTitleEn: variant?.titleEn,
      variantTitleZh: variant?.titleZh,
      sku: variant?.sku || product.sku,
      image: variant?.image || product.mainImage,
      quantity,
      price,
      priceMode: getProductPriceMode(product, variant),
      product,
      variant,
    });
  }
  return { items: nextItems, issues };
}
