import { describe, expect, it } from 'vitest';
import type { Category, Product } from '@/types';
import { filterAndSortAdminProducts } from '@/lib/admin/productList';

const categories = [
  { id: 'g', slug: 'food', parentId: null, titleRu: 'Продукты', titleUz: 'Mahsulotlar', status: 'active', sortOrder: 1 },
  { id: 'c', slug: 'grocery', parentId: 'g', titleRu: 'Бакалея', titleUz: 'Baqollik', status: 'active', sortOrder: 1 },
  { id: 's', slug: 'flour', parentId: 'c', titleRu: 'Мука', titleUz: 'Un', status: 'active', sortOrder: 1 },
] as Category[];

function product(patch: Partial<Product>): Product {
  return {
    id: 'p', slug: 'p', sku: 'BASE-1', status: 'published', categoryId: 'c', categorySlug: 'grocery',
    titleRu: 'Товар', titleUz: 'Mahsulot', shortDescriptionRu: '', shortDescriptionUz: '',
    descriptionRu: '', descriptionUz: '', images: [], mainImage: '', attributes: {}, variants: [],
    currency: 'UZS', showPrice: true, price: 150, stockStatus: 'in_stock', minimumOrder: 1,
    salesUnit: 'штука', sortOrder: 1, featured: false, ownProduction: false, newProduct: false,
    ...patch,
  } as Product;
}

describe('admin product list', () => {
  it('searches brand and variant SKU', () => {
    const item = product({ brandName: 'Nova Green', variants: [{ id: 'v', sku: 'BLUE-256', titleRu: 'Синий', titleUz: 'Ko‘k', stockStatus: 'in_stock', attributes: {} }] });
    expect(filterAndSortAdminProducts([item], categories, { query: 'nova' })).toEqual([item]);
    expect(filterAndSortAdminProducts([item], categories, { query: 'blue-256' })).toEqual([item]);
  });

  it('filters by descendant category, publication and availability', () => {
    const matching = product({ id: 'ok', categoryId: 's', categorySlug: 'flour' });
    const draft = product({ id: 'draft', categoryId: 's', status: 'draft' });
    const unavailable = product({ id: 'off', categoryId: 's', stockStatus: 'out_of_stock' });
    expect(filterAndSortAdminProducts([matching, draft, unavailable], categories, { categoryId: 'c', status: 'published', stockStatus: 'in_stock' })).toEqual([matching]);
  });

  it('sorts by the effective minimum variant price', () => {
    const lower = product({ id: 'lower', price: 500, variants: [{ id: 'v', sku: 'V', titleRu: 'V', titleUz: 'V', price: 100, stockStatus: 'in_stock', attributes: {} }] });
    const higher = product({ id: 'higher', price: 150 });
    expect(filterAndSortAdminProducts([higher, lower], categories, { sort: 'price_asc' }).map(({ id }) => id)).toEqual(['lower', 'higher']);
  });
});
