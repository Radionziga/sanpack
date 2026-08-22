type ProductWithRuntimeStatus = {
  status?: unknown;
};

export function isPublicProduct(product: ProductWithRuntimeStatus) {
  return product.status === 'published';
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
