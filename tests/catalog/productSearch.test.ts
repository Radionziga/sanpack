import { describe, expect, it } from 'vitest';
import { filterProductsBySearch, searchAndRankProducts } from '@/lib/catalog/productSearch';
import { createProduct } from '@/tests/fixtures/products';

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
