type ProductWithRuntimeStatus = {
  status?: unknown;
};

const requiredPublishedStringFields = [
  'id',
  'slug',
  'sku',
  'categoryId',
  'titleRu',
  'titleUz',
  'currency',
  'salesUnit',
] as const;

const requiredPublishedBooleanFields = [
  'showPrice',
  'featured',
  'newProduct',
  'ownProduction',
] as const;

/**
 * Firestore documents are schemaless at read time. Keep drafts permissive, but
 * never expose a published document that cannot satisfy the Product runtime
 * contract used by the storefront.
 */
export function getPublishedProductStructuralIssues(product: ProductWithRuntimeStatus) {
  if (product.status !== 'published') return [];

  const issues: string[] = [];
  for (const field of requiredPublishedStringFields) {
    const value = Reflect.get(product, field);
    if (typeof value !== 'string' || !value.trim()) issues.push(field);
  }
  for (const field of requiredPublishedBooleanFields) {
    if (typeof Reflect.get(product, field) !== 'boolean') issues.push(field);
  }
  if (!Array.isArray(Reflect.get(product, 'images'))) issues.push('images');
  if (!Array.isArray(Reflect.get(product, 'variants'))) issues.push('variants');
  const attributes = Reflect.get(product, 'attributes');
  if (
    !attributes
    || typeof attributes !== 'object'
    || Array.isArray(attributes)
  ) issues.push('attributes');
  const stockStatus = Reflect.get(product, 'stockStatus');
  const minimumOrder = Reflect.get(product, 'minimumOrder');
  const sortOrder = Reflect.get(product, 'sortOrder');
  if (typeof stockStatus !== 'string') issues.push('stockStatus');
  if (typeof minimumOrder !== 'number' || minimumOrder <= 0) issues.push('minimumOrder');
  if (typeof sortOrder !== 'number' || !Number.isFinite(sortOrder)) issues.push('sortOrder');

  return issues;
}

export function isPublicProduct(product: ProductWithRuntimeStatus) {
  return product.status === 'published'
    && getPublishedProductStructuralIssues(product).length === 0;
}

export function filterPublicProducts<T extends ProductWithRuntimeStatus>(
  products: readonly T[],
) {
  return products.filter(isPublicProduct);
}

export function findPublicProductBySlug<
  T extends ProductWithRuntimeStatus & { slug: string },
>(products: readonly T[], slug: string) {
  return products.find(
    (product) => product.slug === slug && isPublicProduct(product),
  ) ?? null;
}

export function findPublicProductById<
  T extends ProductWithRuntimeStatus & { id: string },
>(products: readonly T[], id: string) {
  return products.find(
    (product) => product.id === id && isPublicProduct(product),
  ) ?? null;
}
