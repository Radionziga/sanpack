import { describe, expect, it } from 'vitest';
import { filterProductsBySearch } from '@/lib/catalog/productSearch';
import { createProduct } from '@/tests/fixtures/products';

const products = [
  createProduct({
    id: 'napkins',
    sku: 'SP-PG-002',
    titleRu: 'Салфетки V',
    titleUz: 'V salfetkalari',
    titleEn: 'V napkins',
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
  });

  it('matches SKU and brand without case sensitivity', () => {
    expect(filterProductsBySearch(products, 'sp-pg-002').map((product) => product.id)).toEqual(['napkins']);
    expect(filterProductsBySearch(products, 'BULUT').map((product) => product.id)).toEqual(['napkins']);
  });

  it('returns no results for an empty query', () => {
    expect(filterProductsBySearch(products, '   ')).toEqual([]);
  });
});
