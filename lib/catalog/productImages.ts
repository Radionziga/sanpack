export const PRODUCT_IMAGE_PLACEHOLDER = '/catalog/product-placeholder.svg';

export function hasProductImage(source?: string | null): source is string {
  if (!source) return false;

  const path = source.split(/[?#]/, 1)[0];
  return path !== PRODUCT_IMAGE_PLACEHOLDER;
}
