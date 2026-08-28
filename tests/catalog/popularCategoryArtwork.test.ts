import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getFeaturedCategoryIds,
  getPopularCategoryArtwork,
  storefrontCategoryGroupIds,
} from '@/lib/catalog/popularCategoryArtwork';

describe('popular category artwork', () => {
  it('keeps packaging and food as groups with six featured categories each', () => {
    expect(storefrontCategoryGroupIds).toEqual(['cat-packaging', 'cat-food']);
    expect(getFeaturedCategoryIds('cat-packaging')).toHaveLength(6);
    expect(getFeaturedCategoryIds('cat-food')).toEqual([
      'cat-beef',
      'cat-chicken',
      'cat-fruits',
      'cat-vegetables',
      'cat-greens',
      'cat-groats',
    ]);
  });

  it('provides an existing artwork file for every featured category', () => {
    for (const groupId of storefrontCategoryGroupIds) {
      for (const id of getFeaturedCategoryIds(groupId)) {
        const artwork = getPopularCategoryArtwork({ id });
        expect(artwork).toMatch(/^\/catalog\/popular-categories\/.+\.webp$/);
        expect(existsSync(join(process.cwd(), 'public', artwork!.slice(1)))).toBe(true);
      }
    }
  });

  it('returns no featured categories for an unknown group', () => {
    expect(getFeaturedCategoryIds('cat-unknown')).toEqual([]);
  });
});
