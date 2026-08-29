import type { Attribute, Category } from '@/types';

function getCategoryLineage(categoryId: string, categories: Category[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const lineage = new Set<string>();
  let current = byId.get(categoryId);

  while (current && !lineage.has(current.id)) {
    lineage.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return lineage;
}

export function isAttributeApplicableToCategory(
  attribute: Attribute,
  categoryId: string | undefined,
  categories: Category[],
) {
  if (!attribute.categoryIds?.length) return true;
  if (!categoryId) return false;
  const lineage = getCategoryLineage(categoryId, categories);
  return attribute.categoryIds.some((id) => lineage.has(id));
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
  const descendants = new Set([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && descendants.has(category.parentId) && !descendants.has(category.id)) {
        descendants.add(category.id);
        changed = true;
      }
    }
  }
  return descendants;
}
