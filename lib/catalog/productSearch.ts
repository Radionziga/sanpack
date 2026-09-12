import type { Category, Language, Product, ProductVariant } from '@/types';

function normalizeSearchText(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function localizedVariantTitle(variant: ProductVariant, language: Language) {
  if (language === 'uz') return variant.titleUz || variant.titleRu;
  if (language === 'en') return variant.titleEn || variant.titleRu;
  if (language === 'zh') return variant.titleZh || variant.titleEn || variant.titleRu;
  return variant.titleRu;
}

function categorySearchFields(product: Product, categories: Category[]) {
  const category = categories.find((candidate) => candidate.id === product.categoryId);
  if (!category) return [];
  return [category.titleRu, category.titleUz, category.titleEn, category.titleZh];
}

export interface ProductSearchMatch {
  product: Product;
  variant?: ProductVariant;
  matchedBy: 'product-sku' | 'variant-sku' | 'variant-name' | 'category' | 'product';
}

export function getProductSearchMatch(
  product: Product,
  query: string,
  language: Language = 'ru',
  categories: Category[] = [],
): ProductSearchMatch | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;
  if (normalizeSearchText(product.sku).includes(normalizedQuery)) {
    return { product, matchedBy: 'product-sku' };
  }
  const skuVariant = product.variants?.find((variant) => normalizeSearchText(variant.sku).includes(normalizedQuery));
  if (skuVariant) return { product, variant: skuVariant, matchedBy: 'variant-sku' };
  const namedVariant = product.variants?.find((variant) => [
    variant.titleRu, variant.titleUz, variant.titleEn, variant.titleZh,
  ].some((field) => normalizeSearchText(field).includes(normalizedQuery)));
  if (namedVariant) return { product, variant: namedVariant, matchedBy: 'variant-name' };
  if (categorySearchFields(product, categories).some((field) => normalizeSearchText(field).includes(normalizedQuery))) {
    return { product, matchedBy: 'category' };
  }
  const searchableFields = [
    product.brandName,
    product.titleRu, product.titleUz, product.titleEn, product.titleZh,
    product.shortDescriptionRu, product.shortDescriptionUz, product.shortDescriptionEn, product.shortDescriptionZh,
    product.descriptionRu, product.descriptionUz, product.descriptionEn, product.descriptionZh,
  ];
  return searchableFields.some((field) => normalizeSearchText(field).includes(normalizedQuery))
    ? { product, matchedBy: 'product' }
    : null;
}

export function filterProductsBySearch(
  products: Product[],
  query: string,
  categories: Category[] = [],
): Product[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  return products.filter((product) => getProductSearchMatch(product, normalizedQuery, 'ru', categories));
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
  categories: Category[] = [],
): Product[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return filterProductsBySearch(products, normalizedQuery, categories).sort((left, right) => {
    const leftMatch = getProductSearchMatch(left, normalizedQuery, language, categories);
    const rightMatch = getProductSearchMatch(right, normalizedQuery, language, categories);
    const priority = { 'variant-sku': 0, 'product-sku': 1, 'variant-name': 2, product: 3, category: 4 } as const;
    const leftExactSku = normalizeSearchText(leftMatch?.variant?.sku || left.sku) === normalizedQuery;
    const rightExactSku = normalizeSearchText(rightMatch?.variant?.sku || right.sku) === normalizedQuery;
    if (leftExactSku !== rightExactSku) return leftExactSku ? -1 : 1;
    if (leftMatch && rightMatch && priority[leftMatch.matchedBy] !== priority[rightMatch.matchedBy]) {
      return priority[leftMatch.matchedBy] - priority[rightMatch.matchedBy];
    }
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

export function getSearchMatchLabel(
  product: Product,
  query: string,
  language: Language,
  categories: Category[] = [],
) {
  const match = getProductSearchMatch(product, query, language, categories);
  if (!match?.variant) return undefined;
  return `${localizedVariantTitle(match.variant, language)} · ${match.variant.sku}`;
}
