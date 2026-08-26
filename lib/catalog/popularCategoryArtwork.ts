import type { Category } from '@/types';

const popularCategoryArtworkById: Record<string, string> = {
  'cat-trash-bags': '/catalog/popular-categories/trash-bags-20260823.webp',
  'cat-tearoff-bags': '/catalog/popular-categories/tearoff-bags-20260823.webp',
  'cat-carrier-bags': '/catalog/popular-categories/carrier-bags-20260823.webp',
  'cat-special-bags': '/catalog/popular-categories/special-bags-20260823.webp',
  'cat-food-packaging': '/catalog/popular-categories/food-packaging-20260823.webp',
  'cat-gloves': '/catalog/popular-categories/gloves-20260823.webp',
};

export function getPopularCategoryArtwork(category: Category) {
  return popularCategoryArtworkById[category.id];
}
