import type { Product } from '@/types';

function normalizeSearchText(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

export function filterProductsBySearch(products: Product[], query: string): Product[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return products.filter((product) => {
    const searchableFields = [
      product.sku,
      product.brandName,
      product.titleRu,
      product.titleUz,
      product.titleEn,
      product.shortDescriptionRu,
      product.shortDescriptionUz,
      product.shortDescriptionEn,
      product.descriptionRu,
      product.descriptionUz,
      product.descriptionEn,
    ];
    return searchableFields.some((field) => normalizeSearchText(field).includes(normalizedQuery));
  });
}
