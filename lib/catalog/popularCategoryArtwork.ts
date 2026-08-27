import type { Category } from '@/types';

const popularCategoryArtworkById: Record<string, string> = {
  'cat-trash-bags': '/catalog/popular-categories/trash-bags-20260823.webp',
  'cat-tearoff-bags': '/catalog/popular-categories/tearoff-bags-20260823.webp',
  'cat-carrier-bags': '/catalog/popular-categories/carrier-bags-20260823.webp',
  'cat-special-bags': '/catalog/popular-categories/special-bags-20260823.webp',
  'cat-food-packaging': '/catalog/popular-categories/food-packaging-20260823.webp',
  'cat-gloves': '/catalog/popular-categories/gloves-20260823.webp',
  'cat-beef': '/catalog/popular-categories/beef-20260828.webp',
  'cat-chicken': '/catalog/popular-categories/chicken-20260828.webp',
  'cat-fruits': '/catalog/popular-categories/fruits-20260828.webp',
  'cat-vegetables': '/catalog/popular-categories/vegetables-20260828.webp',
  'cat-greens': '/catalog/popular-categories/greens-20260828.webp',
  'cat-groats': '/catalog/popular-categories/groats-20260828.webp',
};

export const storefrontCategoryGroupIds = ['cat-packaging', 'cat-food'] as const;

const featuredCategoryIdsByGroup: Record<(typeof storefrontCategoryGroupIds)[number], readonly string[]> = {
  'cat-packaging': [
    'cat-trash-bags',
    'cat-tearoff-bags',
    'cat-carrier-bags',
    'cat-special-bags',
    'cat-food-packaging',
    'cat-gloves',
  ],
  'cat-food': [
    'cat-beef',
    'cat-chicken',
    'cat-fruits',
    'cat-vegetables',
    'cat-greens',
    'cat-groats',
  ],
};

export function getPopularCategoryArtwork(category: Pick<Category, 'id'>) {
  return popularCategoryArtworkById[category.id];
}

export function getFeaturedCategoryIds(groupId: string): readonly string[] {
  if (groupId !== 'cat-packaging' && groupId !== 'cat-food') return [];
  return featuredCategoryIdsByGroup[groupId];
}
