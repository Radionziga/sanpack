import type { Language, Product } from '@/types';

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
      product.titleZh,
      product.shortDescriptionRu,
      product.shortDescriptionUz,
      product.shortDescriptionEn,
      product.shortDescriptionZh,
      product.descriptionRu,
      product.descriptionUz,
      product.descriptionEn,
      product.descriptionZh,
    ];
    return searchableFields.some((field) => normalizeSearchText(field).includes(normalizedQuery));
  });
}

function localizedProductTitle(product: Product, language: Language) {
  if (language === 'uz') return product.titleUz || product.titleRu;
  if (language === 'en') return product.titleEn || product.titleRu;
  if (language === 'zh') return product.titleZh || product.titleEn || product.titleRu;
  return product.titleRu;
}

/** Shared live-search behavior for desktop and mobile storefront chrome. */
export function searchAndRankProducts(
  products: Product[],
  query: string,
  language: Language,
): Product[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return filterProductsBySearch(products, normalizedQuery).sort((left, right) => {
    const leftTitle = normalizeSearchText(localizedProductTitle(left, language));
    const rightTitle = normalizeSearchText(localizedProductTitle(right, language));
    const leftStarts = leftTitle.startsWith(normalizedQuery)
      || leftTitle.split(/\s+/).some((word) => word.startsWith(normalizedQuery));
    const rightStarts = rightTitle.startsWith(normalizedQuery)
      || rightTitle.split(/\s+/).some((word) => word.startsWith(normalizedQuery));
    if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
    return leftTitle.localeCompare(rightTitle);
  });
}
