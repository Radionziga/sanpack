import type { Product, ProductPriceMode, ProductVariant } from '@/types';

export function getProductPriceMode(
  product: Product,
  variant?: ProductVariant,
): ProductPriceMode {
  return variant?.priceMode
    ?? product.priceMode
    ?? (product.showPrice ? 'fixed' : 'request');
}

export function getProductUnitPrice(product: Product, variant?: ProductVariant) {
  return variant?.price ?? product.price;
}

export function isProductOrderable(product: Product, variant?: ProductVariant) {
  return getProductPriceMode(product, variant) !== 'informational';
}
