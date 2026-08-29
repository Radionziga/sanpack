import { describe, expect, it } from 'vitest';
import {
  getApplicableAttributes,
  isAttributeApplicableToCategory,
} from '@/lib/catalog/attributeApplicability';
import type { Attribute, Category } from '@/types';

const categories: Category[] = [
  { id: 'food', slug: 'food', titleRu: 'Еда', titleUz: 'Oziq-ovqat', status: 'active', sortOrder: 1 },
  { id: 'dairy', parentId: 'food', slug: 'dairy', titleRu: 'Молочное', titleUz: 'Sut', status: 'active', sortOrder: 2 },
];

function attribute(id: string, categoryIds?: string[], sortOrder = 1): Attribute {
  return {
    id, key: id, titleRu: id, titleUz: id, type: 'text', filterable: true,
    required: false, cardVisible: true, productVisible: true, categoryIds, sortOrder,
  };
}

describe('category-aware attributes', () => {
  it('treats an empty category list as universal', () => {
    expect(isAttributeApplicableToCategory(attribute('brand'), 'dairy', categories)).toBe(true);
  });

  it('inherits attributes assigned to a parent group', () => {
    expect(isAttributeApplicableToCategory(attribute('origin', ['food']), 'dairy', categories)).toBe(true);
  });

  it('hides an attribute assigned to another category', () => {
    expect(isAttributeApplicableToCategory(attribute('thickness', ['packaging']), 'dairy', categories)).toBe(false);
  });

  it('returns only applicable attributes in configured order', () => {
    expect(getApplicableAttributes([
      attribute('fat', ['dairy'], 20),
      attribute('material', ['packaging'], 5),
      attribute('brand', undefined, 10),
    ], 'dairy', categories).map(({ key }) => key)).toEqual(['brand', 'fat']);
  });
});
