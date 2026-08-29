import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getPopularCategoryArtwork,
  getStorefrontCategoryGroups,
} from '@/lib/catalog/popularCategoryArtwork';
import type { Category } from '@/types';

function category(patch: Partial<Category>): Category {
  return {
    id: 'category', slug: 'category', titleRu: 'Категория', titleUz: 'Kategoriya',
    status: 'active', sortOrder: 1, ...patch,
  };
}

describe('storefront category groups', () => {
  it('adds a third group without a frontend ID allowlist', () => {
    const categories = [
      category({ id: 'group-a', slug: 'group-a', sortOrder: 1 }),
      category({ id: 'group-b', slug: 'group-b', sortOrder: 2 }),
      category({ id: 'group-c', slug: 'group-c', sortOrder: 3 }),
      category({ id: 'child-c', slug: 'child-c', parentId: 'group-c', cardImage: '/c.webp' }),
    ];
    expect(getStorefrontCategoryGroups(categories).map(({ group }) => group.id)).toEqual(['group-c']);
  });

  it('uses explicit featured categories and their showcase order', () => {
    const categories = [
      category({ id: 'group', slug: 'group' }),
      category({ id: 'ordinary', slug: 'ordinary', parentId: 'group', sortOrder: 1 }),
      category({ id: 'second', slug: 'second', parentId: 'group', featured: true, featuredSortOrder: 20 }),
      category({ id: 'first', slug: 'first', parentId: 'group', featured: true, featuredSortOrder: 10 }),
    ];
    expect(getStorefrontCategoryGroups(categories)[0].categories.map(({ id }) => id)).toEqual(['first', 'second']);
  });

  it('prefers the Firestore card image and keeps tracked legacy artwork as fallback', () => {
    expect(getPopularCategoryArtwork(category({ id: 'cat-trash-bags', cardImage: '/custom/card.webp' })))
      .toBe('/custom/card.webp');
    const legacy = getPopularCategoryArtwork(category({ id: 'cat-trash-bags' }));
    expect(legacy).toMatch(/^\/catalog\/popular-categories\/.+\.webp$/);
    expect(existsSync(join(process.cwd(), 'public', legacy!.slice(1)))).toBe(true);
  });
});
