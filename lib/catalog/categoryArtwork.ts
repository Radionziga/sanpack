import type { Category } from '@/types';

const categoryArtworkById: Record<string, string> = {
  'cat-beef': '/catalog/category-icons-v3/beef.webp',
  'cat-berries': '/catalog/category-icons-v3/berries.webp',
  'cat-carrier-bags': '/catalog/category-icons-v3/carrier-bags.webp',
  'cat-chicken': '/catalog/category-icons-v3/chicken.webp',
  'cat-cleaning': '/catalog/category-icons-v3/cleaning.webp',
  'cat-dairy': '/catalog/category-icons-v3/dairy.webp',
  'cat-eggs': '/catalog/category-icons-v3/eggs.webp',
  'cat-flour': '/catalog/category-icons-v3/flour.webp',
  'cat-food': '/catalog/category-icons-v3/food.webp',
  'cat-food-packaging': '/catalog/category-icons-v3/food-packaging.webp',
  'cat-fruits': '/catalog/category-icons-v3/fruits.webp',
  'cat-gloves': '/catalog/category-icons-v3/gloves.webp',
  'cat-greens': '/catalog/category-icons-v3/greens.webp',
  'cat-groats': '/catalog/category-icons-v3/groats.webp',
  'cat-microgreens': '/catalog/category-icons-v3/microgreens.webp',
  'cat-oils': '/catalog/category-icons-v3/oils.webp',
  'cat-packaging': '/catalog/category-icons-v3/packaging.webp',
  'cat-paper-goods': '/catalog/category-icons-v3/paper-goods.webp',
  'cat-special-bags': '/catalog/category-icons-v3/special-bags.webp',
  'cat-sugar': '/catalog/category-icons-v3/sugar.webp',
  'cat-tearoff-bags': '/catalog/category-icons-v3/tearoff-bags.webp',
  'cat-trash-bags': '/catalog/category-icons-v3/trash-bags.webp',
  'cat-vegetables': '/catalog/category-icons-v3/vegetables.webp',
};

export function getCategoryArtwork(category: Category) {
  return categoryArtworkById[category.id] ?? category.image;
}
