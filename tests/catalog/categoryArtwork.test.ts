import { describe, expect, it } from 'vitest';
import { getCategoryArtwork } from '@/lib/catalog/categoryArtwork';
import type { Category } from '@/types';

function category(overrides: Partial<Category>): Category {
  return {
    id: 'category',
    slug: 'category',
    titleRu: 'Категория',
    titleUz: 'Kategoriya',
    status: 'active',
    sortOrder: 1,
    ...overrides,
  };
}

describe('catalog navigation artwork', () => {
  it('keeps an explicitly managed navigation image as the source of truth', () => {
    expect(getCategoryArtwork(category({
      id: 'cat-trash-bags',
      navigationImage: 'https://example.com/navigation.webp',
      image: '/catalog/categories/trash_bags.webp',
    }))).toBe('https://example.com/navigation.webp');
  });

  it('uses the original product icon before the large green category image', () => {
    expect(getCategoryArtwork(category({
      id: 'cat-trash-bags',
      image: '/catalog/categories/trash_bags.webp',
    }))).toBe('/catalog/category-icons-v3/trash-bags.webp');
  });

  it('falls back to the category image for a new category without curated artwork', () => {
    expect(getCategoryArtwork(category({
      id: 'new-category',
      image: '/catalog/categories/new-category.webp',
    }))).toBe('/catalog/categories/new-category.webp');
  });
});
