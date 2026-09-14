import { describe, expect, it } from 'vitest';
import { filterProductsBySearch, searchAndRankProducts } from '@/lib/catalog/productSearch';
import { createProduct, createVariant } from '@/tests/fixtures/products';

const products = [
  createProduct({
    id: 'napkins',
    sku: 'SP-PG-002',
    titleRu: 'Салфетки V',
    titleUz: 'V salfetkalari',
    titleEn: 'V napkins',
    titleZh: 'V 型餐巾纸',
    descriptionZh: '适合餐饮服务',
    brandName: 'Bulut',
  }),
  createProduct({
    id: 'cheese',
    sku: 'SP-DA-013',
    titleRu: 'Сыр Svalya',
    titleUz: 'Svalya pishlog‘i',
    titleEn: 'Svalya cheese',
  }),
];

describe('catalog product search', () => {
  it('matches product content in every supported language', () => {
    expect(filterProductsBySearch(products, 'салфетки').map((product) => product.id)).toEqual(['napkins']);
    expect(filterProductsBySearch(products, 'salfetkalari').map((product) => product.id)).toEqual(['napkins']);
    expect(filterProductsBySearch(products, 'cheese').map((product) => product.id)).toEqual(['cheese']);
    expect(filterProductsBySearch(products, '餐饮').map((product) => product.id)).toEqual(['napkins']);
  });

  it('matches SKU and brand without case sensitivity', () => {
    expect(filterProductsBySearch(products, 'sp-pg-002').map((product) => product.id)).toEqual(['napkins']);
    expect(filterProductsBySearch(products, 'BULUT').map((product) => product.id)).toEqual(['napkins']);
  });

  it('finds and prioritizes the exact matching variant SKU', () => {
    const variantProduct = createProduct({
      id: 'variant-product',
      sku: 'SP-FP-005',
      variants: [createVariant({ sku: 'SP-FP-005-800', titleRu: '800 мл', titleEn: '800 ml' })],
    });
    const partialProduct = createProduct({ id: 'partial-product', sku: 'OTHER-SP-FP-005-800-X' });

    expect(searchAndRankProducts([partialProduct, variantProduct], 'SP-FP-005-800', 'ru')
      .map((product) => product.id)).toEqual(['variant-product', 'partial-product']);
    expect(filterProductsBySearch([variantProduct], '005-800').map((product) => product.id)).toEqual(['variant-product']);
  });

  it('matches localized variant names and category names without leaking across products', () => {
    const variantProduct = createProduct({
      id: 'variant-product',
      categoryId: 'dairy',
      variants: [createVariant({ titleUz: 'Oilaviy qadoq', sku: 'DAIRY-FAMILY' })],
    });
    const unrelated = createProduct({ id: 'unrelated', categoryId: 'bakery', sku: 'OTHER' });
    const categories = [
      { id: 'dairy', slug: 'dairy', titleRu: 'Молочное', titleUz: 'Sut mahsulotlari', status: 'active' as const, sortOrder: 1 },
      { id: 'bakery', slug: 'bakery', titleRu: 'Выпечка', titleUz: 'Pishiriqlar', status: 'active' as const, sortOrder: 2 },
    ];

    expect(filterProductsBySearch([variantProduct, unrelated], 'Oilaviy').map((product) => product.id)).toEqual(['variant-product']);
    expect(filterProductsBySearch([variantProduct, unrelated], 'Молочное', categories).map((product) => product.id)).toEqual(['variant-product']);
  });

  it('matches a parent category name for products assigned to its subcategories', () => {
    const produce = createProduct({ id: 'cucumber', categoryId: 'vegetables', sku: 'VEG-001' });
    const unrelated = createProduct({ id: 'napkins', categoryId: 'paper', sku: 'PAPER-001' });
    const categories = [
      { id: 'food', slug: 'food', titleRu: 'Продукты питания', titleUz: 'Oziq-ovqat', status: 'active' as const, sortOrder: 1 },
      { id: 'fresh', parentId: 'food', slug: 'fresh', titleRu: 'Овощи, фрукты и зелень', titleUz: 'Sabzavotlar va mevalar', status: 'active' as const, sortOrder: 1 },
      { id: 'vegetables', parentId: 'fresh', slug: 'vegetables', titleRu: 'Овощи', titleUz: 'Sabzavotlar', status: 'active' as const, sortOrder: 1 },
      { id: 'packaging', slug: 'packaging', titleRu: 'Упаковка', titleUz: 'Qadoqlash', status: 'active' as const, sortOrder: 2 },
      { id: 'paper', parentId: 'packaging', slug: 'paper', titleRu: 'Бумажная продукция', titleUz: 'Qog‘oz mahsulotlar', status: 'active' as const, sortOrder: 1 },
    ];

    expect(filterProductsBySearch([produce, unrelated], 'Овощи, фрукты и зелень', categories)
      .map((product) => product.id)).toEqual(['cucumber']);
  });

  it('returns no results for an empty query', () => {
    expect(filterProductsBySearch(products, '   ')).toEqual([]);
  });

  it('ranks a localized title prefix before a description-only match', () => {
    const descriptionMatch = createProduct({
      id: 'description-match',
      titleZh: '其他产品',
      descriptionZh: '餐巾纸产品',
    });

    expect(searchAndRankProducts([...products, descriptionMatch], '餐巾纸', 'zh')
      .map((product) => product.id)).toEqual(['napkins', 'description-match']);
  });
});
