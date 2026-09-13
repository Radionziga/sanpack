import type { Product, RequestItem } from '@/types';
import { getOrderRuleSnapshot, normalizeOrderQuantity } from '@/lib/commerce/orderQuantities';
import { getProductOrderUnitPrice, getProductPriceMode } from '@/lib/commerce/productOffer';

export interface CartReconciliationIssue {
  productId: string;
  variantId?: string;
  lineId?: string;
  kind: 'unavailable' | 'variant_required' | 'variant_removed' | 'informational' | 'quantity_changed' | 'price_changed' | 'packaging_changed';
  previousQuantity?: number;
  currentQuantity?: number;
  previousPrice?: number;
  currentPrice?: number;
}

function packagingSignature(rule: RequestItem['orderRule']) {
  if (!rule) return '';
  return JSON.stringify({
    salesUnit: rule.salesUnit,
    packageEnabled: rule.packageEnabled,
    unitsPerPackage: rule.unitsPerPackage,
    minimumPackages: rule.minimumPackages,
    packageStep: rule.packageStep,
    packageNameRu: rule.packageNameRu,
    packageNameUz: rule.packageNameUz,
    packageNameEn: rule.packageNameEn,
    packageNameZh: rule.packageNameZh,
  });
}

export function reconcileCartItems(items: RequestItem[], products: Product[]) {
  const issues: CartReconciliationIssue[] = [];
  const nextItems: RequestItem[] = [];
  for (const item of items) {
    const identity = {
      productId: item.productId,
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(item.lineId ? { lineId: item.lineId } : {}),
    };
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || product.status !== 'published') {
      issues.push({ ...identity, kind: 'unavailable' });
      continue;
    }
    if (product.variants?.length && !item.variantId) {
      issues.push({ ...identity, kind: 'variant_required' });
      continue;
    }
    const variant = item.variantId
      ? product.variants?.find((candidate) => candidate.id === item.variantId)
      : undefined;
    if (item.variantId && !variant) {
      issues.push({ ...identity, kind: 'variant_removed' });
      continue;
    }
    if (getProductPriceMode(product, variant) === 'informational') {
      issues.push({ ...identity, kind: 'informational' });
      continue;
    }
    const quantity = normalizeOrderQuantity(product, item.quantity, variant);
    const price = getProductOrderUnitPrice(product, variant, quantity);
    const orderRule = getOrderRuleSnapshot(product, variant);
    if (quantity !== item.quantity) issues.push({ ...identity, kind: 'quantity_changed', previousQuantity: item.quantity, currentQuantity: quantity });
    if (price !== item.price) issues.push({
      ...identity,
      kind: 'price_changed',
      ...(item.price === undefined ? {} : { previousPrice: item.price }),
      ...(price === undefined ? {} : { currentPrice: price }),
    });
    if (item.orderRule && packagingSignature(item.orderRule) !== packagingSignature(orderRule)) {
      issues.push({ ...identity, kind: 'packaging_changed' });
    }
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
      orderRule,
    });
  }
  return { items: nextItems, issues };
}
