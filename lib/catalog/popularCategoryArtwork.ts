import type { Category } from '@/types';

const legacyPopularCategoryArtworkById: Record<string, string> = {
  'cat-trash-bags': '/catalog/popular-categories/trash-bags-20260823.webp',
  'cat-tearoff-bags': '/catalog/popular-categories/tearoff-bags-20260828.webp',
  'cat-carrier-bags': '/catalog/popular-categories/carrier-bags-20260828.webp',
  'cat-special-bags': '/catalog/popular-categories/special-bags-20260828.webp',
  'cat-food-packaging': '/catalog/popular-categories/food-packaging-20260828.webp',
  'cat-gloves': '/catalog/popular-categories/gloves-20260828.webp',
  'cat-beef': '/catalog/popular-categories/beef-20260828.webp',
  'cat-chicken': '/catalog/popular-categories/chicken-20260828.webp',
  'cat-fruits': '/catalog/popular-categories/fruits-20260828.webp',
  'cat-vegetables': '/catalog/popular-categories/vegetables-20260828.webp',
  'cat-greens': '/catalog/popular-categories/greens-20260828.webp',
  'cat-groats': '/catalog/popular-categories/groats-20260828.webp',
};

export function getPopularCategoryArtwork(
  category: Pick<Category, 'id' | 'cardImage' | 'banner' | 'image'>,
) {
  return category.cardImage
    || category.banner
    || legacyPopularCategoryArtworkById[category.id]
    || category.image;
}

export interface StorefrontCategoryGroup {
  group: Category;
  categories: Category[];
}

/**
 * Builds the storefront showcase entirely from the category tree. Explicitly
 * featured children win; legacy documents fall back to ordered children so a
 * new group never requires a frontend code change.
 */
export function getStorefrontCategoryGroups(
  categories: Category[],
  limitPerGroup = 6,
): StorefrontCategoryGroup[] {
  const active = categories.filter((category) => category.status === 'active');
  const groups = active
    .filter((category) => !category.parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return groups.map((group) => {
    const children = active
      .filter((category) => category.parentId === group.id)
      .sort((left, right) => {
        const leftOrder = left.featuredSortOrder ?? left.sortOrder;
        const rightOrder = right.featuredSortOrder ?? right.sortOrder;
        return leftOrder - rightOrder;
      });
    const explicitlyFeatured = children.filter((category) => category.featured === true);
    const showcaseCandidates = explicitlyFeatured.length > 0
      ? explicitlyFeatured
      : children;
    return {
      group,
      categories: showcaseCandidates.slice(0, limitPerGroup),
    };
  }).filter((section) => section.categories.length > 0);
}
