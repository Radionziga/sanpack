import type { Product, ProductAttributeValue } from '@/types';

export function hasProductAttributeValue(value: ProductAttributeValue | undefined) {
  return value !== undefined
    && value !== ''
    && (!Array.isArray(value) || value.length > 0);
}

/**
 * A required definition may describe a shared product property or a property
 * that distinguishes every sellable variant. This keeps one Attribute CMS and
 * avoids forcing variant facets to be duplicated onto Product.
 */
export function hasRequiredProductOrVariantAttribute(
  product: Partial<Product>,
  key: string,
) {
  if (hasProductAttributeValue(product.attributes?.[key])) return true;
  const variants = product.variants || [];
  return variants.length > 0
    && variants.every((variant) => hasProductAttributeValue(variant.attributes?.[key]));
}
