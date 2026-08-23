export const PRODUCT_IMAGE_PLACEHOLDER = '/catalog/product-placeholder.svg';

export const GENERATED_PRODUCT_IMAGES: Readonly<Record<string, string>> = {
  'price-2026-gn-027': '/catalog/generated-products/price-2026-gn-027.webp',
  'price-2026-pg-007': '/catalog/generated-products/price-2026-pg-007.webp',
  'price-2026-tb-004': '/catalog/generated-products/price-2026-tb-004.webp',
  'price-2026-vb-001': '/catalog/generated-products/price-2026-vb-001.webp',
  'price-2026-vb-002': '/catalog/generated-products/price-2026-vb-002.webp',
  'price-2026-vb-003': '/catalog/generated-products/price-2026-vb-003.webp',
};

export function hasProductImage(source?: string | null): source is string {
  if (!source) return false;

  const path = source.split(/[?#]/, 1)[0];
  return path !== PRODUCT_IMAGE_PLACEHOLDER;
}

export function withGeneratedProductImage<
  T extends { id: string; mainImage?: string; mainImagePath?: string; images?: string[] },
>(product: T): T {
  if (hasProductImage(product.mainImage)) return product;
  const generatedImage = GENERATED_PRODUCT_IMAGES[product.id];
  if (!generatedImage) return product;

  return {
    ...product,
    mainImage: generatedImage,
    mainImagePath: generatedImage,
    images: [generatedImage],
  };
}
