import type { Attribute, Category } from '@/types';

export function createCategory(id: string, parentId?: string, overrides: Partial<Category> = {}): Category {
  return { id, parentId, slug: id, titleRu: id, titleUz: `${id} UZ`, titleEn: `${id} EN`, titleZh: `${id} ZH`, status: 'active', sortOrder: 1, ...overrides };
}

export const taxonomyCategories = [
  createCategory('food'), createCategory('grocery', 'food', { featured: true }),
  createCategory('grains', 'grocery'), createCategory('flour', 'grocery'),
  createCategory('dairy', 'food'), createCategory('cheese', 'dairy'),
  createCategory('packaging'), createCategory('bags', 'packaging'),
];

export function createAttribute(id: string, categoryIds: string[]): Attribute {
  return { id, key: id, titleRu: id, titleUz: id, type: 'text', categoryIds,
    filterable: true, required: true, cardVisible: true, productVisible: true, sortOrder: 1 };
}
