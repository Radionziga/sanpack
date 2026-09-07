import type { Category, Product } from '@/types';
import { getCategoryScopeIds, resolveProductCategory } from '@/lib/catalog/categoryHierarchy';
import { getEffectiveCatalogPrice } from '@/lib/commerce/productOffer';

export type AdminProductSort = 'catalog' | 'updated' | 'name' | 'sku' | 'price_asc' | 'price_desc';

export interface AdminProductListFilters {
  query?: string;
  categoryId?: string;
  status?: Product['status'] | '';
  stockStatus?: Product['stockStatus'] | '';
  sort?: AdminProductSort;
}

function productMatchesQuery(product: Product, query: string) {
  const normalized = query.trim().toLocaleLowerCase('ru');
  if (!normalized) return true;
  const values = [
    product.titleRu,
    product.titleUz,
    product.titleEn,
    product.titleZh,
    product.sku,
    product.brandName,
    ...(product.variants || []).flatMap((variant) => [
      variant.sku,
      variant.titleRu,
      variant.titleUz,
      variant.titleEn,
      variant.titleZh,
    ]),
  ];
  return values.some((value) => value?.toLocaleLowerCase('ru').includes(normalized));
}

export function filterAndSortAdminProducts(
  products: Product[],
  categories: Category[],
  filters: AdminProductListFilters,
) {
  const categoryScope = filters.categoryId
    ? getCategoryScopeIds(filters.categoryId, categories)
    : undefined;
  const filtered = products.filter((product) => {
    if (!productMatchesQuery(product, filters.query || '')) return false;
    if (filters.status && product.status !== filters.status) return false;
    if (filters.stockStatus) {
      const statuses = product.variants?.length
        ? product.variants.map((variant) => variant.stockStatus ?? product.stockStatus)
        : [product.stockStatus];
      if (!statuses.includes(filters.stockStatus)) return false;
    }
    if (categoryScope) {
      const category = resolveProductCategory(product, categories);
      if (!category || !categoryScope.has(category.id)) return false;
    }
    return true;
  });

  const sort = filters.sort || 'catalog';
  return filtered.toSorted((left, right) => {
    if (sort === 'name') return left.titleRu.localeCompare(right.titleRu, 'ru');
    if (sort === 'sku') return left.sku.localeCompare(right.sku, 'ru');
    if (sort === 'updated') return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
    if (sort === 'price_asc' || sort === 'price_desc') {
      const leftPrice = getEffectiveCatalogPrice(left)?.amount ?? Number.POSITIVE_INFINITY;
      const rightPrice = getEffectiveCatalogPrice(right)?.amount ?? Number.POSITIVE_INFINITY;
      return (leftPrice - rightPrice) * (sort === 'price_desc' ? -1 : 1);
    }
    return (left.sortOrder || 0) - (right.sortOrder || 0);
  });
}
