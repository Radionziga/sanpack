import type { Category, Product } from '@/types';

// One existing Category collection: root Group (0), Category (1), optional
// Subcategory (2). No persisted depth/path or arbitrary-depth taxonomy.
export const MAX_CATEGORY_DEPTH = 2;
export const RESERVED_CATEGORY_SLUGS = new Set(['print']);

function lineageFromMap(id: string, byId: Map<string, Category>): Category[] {
  const lineage: Category[] = [];
  const visited = new Set<string>();
  let current = byId.get(id);
  while (current) {
    if (visited.has(current.id) || lineage.length > MAX_CATEGORY_DEPTH) return [];
    visited.add(current.id);
    lineage.unshift(current);
    if (!current.parentId) return lineage;
    current = byId.get(current.parentId);
  }
  return []; // Missing parent: fail closed, don't invent a root.
}

export function getCategoryLineage(id: string, categories: Category[]): Category[] {
  return lineageFromMap(id, new Map(categories.map((category) => [category.id, category])));
}

export function getCategoryDepth(id: string, categories: Category[]) {
  const lineage = getCategoryLineage(id, categories);
  return lineage.length ? lineage.length - 1 : undefined;
}

export function getVisibleCategories(categories: Category[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categories.filter((category) => {
    const lineage = lineageFromMap(category.id, byId);
    return lineage.length > 0 && lineage.every((node) => node.status === 'active');
  });
}

export function getOrderedCategories(categories: Category[]) {
  const children = (id?: string) => categories
    .filter((category) => (category.parentId || undefined) === id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return children().flatMap((group) => [group, ...children(group.id)
    .flatMap((category) => [category, ...children(category.id)])]);
}

export function getCategoryLabel(id: string, categories: Category[], title: (category: Category) => string = (category) => category.titleRu) {
  return getCategoryLineage(id, categories).map(title).join(' / ');
}

export function isProductCategory(id: string, categories: Category[]) {
  const depth = getCategoryDepth(id, categories);
  return depth === 1 || depth === 2;
}

export function getCategoryScopeIds(id: string, categories: Category[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return new Set(categories.filter((category) => (
    lineageFromMap(category.id, byId).some((ancestor) => ancestor.id === id)
  )).map((category) => category.id));
}

export function resolveProductCategory(product: Pick<Product, 'categoryId' | 'categorySlug'>, categories: Category[]) {
  // categoryId wins over a stale denormalized categorySlug after a move/rename.
  return categories.find((category) => category.id === product.categoryId)
    ?? categories.find((category) => category.slug === product.categoryId || category.slug === product.categorySlug);
}

export function getProductsInCategoryScope<T extends Pick<Product, 'categoryId' | 'categorySlug'>>(
  products: T[], categories: Category[], categoryId: string,
): T[] {
  const scope = getCategoryScopeIds(categoryId, categories);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  return products.filter((product) => {
    const category = byId.get(product.categoryId) ?? bySlug.get(product.categoryId) ?? bySlug.get(product.categorySlug);
    return category !== undefined && scope.has(category.id);
  });
}

/** Group/Category keep flat URLs; only Subcategory omits Group and nests. */
export function getCategoryPath(category: Category, categories: Category[]) {
  const lineage = getCategoryLineage(category.id, categories);
  if (!lineage.length) return '/catalog';
  return `/catalog/${(lineage.length === 3 ? lineage.slice(1) : [category]).map((node) => node.slug).join('/')}`;
}

/** UI breadcrumbs intentionally omit the merchandising Group above a Category. */
export function getCategoryBreadcrumbs(category: Category, categories: Category[]) {
  const lineage = getCategoryLineage(category.id, categories);
  return (lineage.length > 1 ? lineage.slice(1) : lineage)
    .map((node) => ({ category: node, href: getCategoryPath(node, categories) }));
}

export function resolveCategoryRoute(segments: string[], categories: Category[]) {
  if (segments.length < 1 || segments.length > 2) return null;
  const visible = getVisibleCategories(categories);
  const category = visible.find((node) => node.slug === segments.at(-1));
  if (!category) return null;
  const path = getCategoryPath(category, categories);
  if (segments.length === 2 && path !== `/catalog/${segments.join('/')}`) return null;
  return { category, path, redirect: segments.length === 1 && getCategoryDepth(category.id, categories) === 2 };
}

/** Validate the resulting subtree, including a move that would deepen children. */
export function validateCategoryPlacement(id: string, parentId: string | null | undefined, categories: Category[]): string | null {
  if (parentId === id) return 'Категория не может быть родителем самой себя.';
  if (parentId && !categories.some((category) => category.id === parentId)) return 'Родительская категория не существует.';
  const existing = categories.find((category) => category.id === id);
  const proposed = { ...existing, id, parentId } as Category;
  const next = [...categories.filter((category) => category.id !== id), proposed];
  const byId = new Map(next.map((category) => [category.id, category]));
  // Every existing descendant is affected by reparenting, not only this node.
  const affected = new Set([id]);
  for (let changed = true; changed;) {
    changed = false;
    for (const category of next) {
      if (category.parentId && affected.has(category.parentId) && !affected.has(category.id)) {
        affected.add(category.id);
        changed = true;
      }
    }
  }
  for (const affectedId of affected) {
    const visited = new Set<string>();
    let current = byId.get(affectedId);
    let depth = 0;
    while (current) {
      if (visited.has(current.id)) return 'Перемещение создаёт цикл. Нельзя выбрать своего потомка.';
      visited.add(current.id);
      if (!current.parentId) break;
      depth += 1;
      current = byId.get(current.parentId);
      if (!current) return 'Нарушена цепочка родителей категории.';
    }
    if (depth > MAX_CATEGORY_DEPTH) return 'Допустимы только три уровня: группа → категория → подкатегория.';
  }
  return null;
}

export function validateCategorySave(id: string, category: Partial<Category>, categories: Category[]): string | null {
  const placementError = validateCategoryPlacement(id, category.parentId, categories);
  if (placementError) return placementError;
  if (category.slug && RESERVED_CATEGORY_SLUGS.has(category.slug)) return 'Этот URL зарезервирован для страницы каталога.';
  if (category.slug && categories.some((node) => node.id !== id && node.slug === category.slug)) return 'Категория с таким URL уже существует.';
  return null;
}
