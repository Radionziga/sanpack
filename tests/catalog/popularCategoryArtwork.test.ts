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

  it('provides dedicated artwork for every featured food category', () => {
    for (const id of getFeaturedCategoryIds('cat-food')) {
      expect(getPopularCategoryArtwork({ id })).toMatch(/^\/catalog\/popular-categories\/.+\.webp$/);
    }
  });

  it('returns no featured categories for an unknown group', () => {
    expect(getFeaturedCategoryIds('cat-unknown')).toEqual([]);
  });
});
