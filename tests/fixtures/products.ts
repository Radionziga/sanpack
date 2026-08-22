import type { Product, ProductVariant } from '@/types';

export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    slug: 'test-product',
    sku: 'SKU-BASE',
    status: 'published',
    categoryId: 'category-1',
    categorySlug: 'test-category',
    titleRu: 'Тестовый товар',
    titleUz: 'Test mahsuloti',
    titleEn: 'Test product',
    shortDescriptionRu: '',
    shortDescriptionUz: '',
    shortDescriptionEn: '',
    descriptionRu: '',
    descriptionUz: '',
    descriptionEn: '',
    images: [],
    mainImage: '',
    attributes: {},
    variants: [],
    price: 100,
    currency: 'UZS',
    showPrice: true,
    stockStatus: 'in_stock',
    minimumOrder: 1,
    salesUnit: 'шт',
    featured: false,
    newProduct: false,
    ownProduction: false,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 'variant-1',
    sku: 'SKU-VARIANT',
    titleRu: 'Вариант',
    titleUz: 'Variant',
    titleEn: 'Variant',
    price: 125,
    stockStatus: 'in_stock',
    attributes: {},
    ...overrides,
  };
}
