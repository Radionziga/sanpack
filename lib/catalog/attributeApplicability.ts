import type { Attribute, Category } from '@/types';
import { getCategoryLineage, getCategoryScopeIds } from './categoryHierarchy';

export function isAttributeApplicableToCategory(
  attribute: Attribute,
  categoryId: string | undefined,
  categories: Category[],
) {
  if (!attribute.categoryIds?.length) return true;
  if (!categoryId) return false;
  const lineage = getCategoryLineage(categoryId, categories);
  return attribute.categoryIds.some((id) => lineage.some((category) => category.id === id));
}

export function getApplicableAttributes(
  attributes: Attribute[],
  categoryId: string | undefined,
  categories: Category[],
) {
  return attributes
    .filter((attribute) => isAttributeApplicableToCategory(attribute, categoryId, categories))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getCategoryDescendantIds(categoryId: string, categories: Category[]) {
  return getCategoryScopeIds(categoryId, categories);
}
