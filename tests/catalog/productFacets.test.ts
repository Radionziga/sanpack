import { describe, expect, it } from 'vitest';
import {
  buildAttributeFacet,
  productMatchesAttributeFilters,
  type CatalogAttributeFilters,
} from '@/lib/catalog/productFacets';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import type { Attribute } from '@/types';

function attribute(key: string, type: Attribute['type']): Attribute {
  return {
    id: `attribute-${key}`,
    key,
    titleRu: key,
    titleUz: key,
    type,
    filterable: true,
    required: false,
    cardVisible: true,
    productVisible: true,
    sortOrder: 1,
  };
}

describe('catalog product and variant facets', () => {
  const smartphone = createProduct({
    id: 'smartphone-x',
    attributes: { ram: 8 },
    variants: [
      createVariant({ id: '128-black', attributes: { storage: 128, color: 'black' } }),
      createVariant({ id: '256-black', attributes: { storage: 256, color: 'black' } }),
      createVariant({ id: '256-blue', attributes: { storage: 256, color: 'blue' } }),
      createVariant({ id: '512-white', attributes: { storage: 512, color: 'white' } }),
    ],
  });

  it('finds a product by a value stored only on variants', () => {
    expect(productMatchesAttributeFilters(smartphone, {
      storage: { kind: 'range', min: 256, max: 256 },
    })).toBe(true);
    expect(productMatchesAttributeFilters(smartphone, {
      color: { kind: 'options', values: ['blue'] },
    })).toBe(true);
    expect(productMatchesAttributeFilters(smartphone, {
      storage: { kind: 'range', min: 1024 },
    })).toBe(false);
  });

  it('requires multiple variant filters to match the same variant', () => {
    expect(productMatchesAttributeFilters(smartphone, {
      storage: { kind: 'range', min: 256, max: 256 },
      color: { kind: 'options', values: ['blue'] },
    })).toBe(true);
    expect(productMatchesAttributeFilters(smartphone, {
      storage: { kind: 'range', min: 512, max: 512 },
      color: { kind: 'options', values: ['blue'] },
    })).toBe(false);
  });

  it('combines shared product attributes with one variant configuration', () => {
    expect(productMatchesAttributeFilters(smartphone, {
      ram: { kind: 'range', min: 8, max: 8 },
      color: { kind: 'options', values: ['black'] },
    })).toBe(true);
  });

  it('builds one option count per product from product and variant values', () => {
    const secondPhone = createProduct({
      id: 'smartphone-y',
      attributes: {},
      variants: [createVariant({ attributes: { color: 'blue' } })],
    });
    expect(buildAttributeFacet(attribute('color', 'color'), [smartphone, secondPhone]).options)
      .toEqual([
        { value: 'black', count: 1 },
        { value: 'blue', count: 2 },
        { value: 'white', count: 1 },
      ]);
  });

  it('does not expose a base value that every variant overrides', () => {
    const product = createProduct({
      id: 'variant-colors',
      attributes: { color: 'legacy-green' },
      variants: [
        createVariant({ id: 'black', attributes: { color: 'black' } }),
        createVariant({ id: 'blue', attributes: { color: 'blue' } }),
      ],
    });

    expect(buildAttributeFacet(attribute('color', 'color'), [product]).options).toEqual([
      { value: 'black', count: 1 },
      { value: 'blue', count: 1 },
    ]);
    expect(productMatchesAttributeFilters(product, {
      color: { kind: 'options', values: ['legacy-green'] },
    })).toBe(false);
  });

  it('handles typed multiselect, boolean and color values and clears inactive filters', () => {
    const product = createProduct({
      attributes: {
        capabilities: ['nfc', 'dual-sim'],
        refurbished: false,
        color: '#0057b8',
      },
    });

    expect(productMatchesAttributeFilters(product, {
      capabilities: { kind: 'options', values: ['nfc'] },
      color: { kind: 'options', values: ['#0057B8'] },
    })).toBe(true);
    expect(productMatchesAttributeFilters(product, {
      refurbished: { kind: 'boolean', value: true },
    })).toBe(false);
    expect(productMatchesAttributeFilters(product, {
      capabilities: { kind: 'options', values: [] },
      color: { kind: 'options', values: [] },
    })).toBe(true);
  });

  it('derives a numeric range from tire variants', () => {
    const tire = createProduct({
      id: 'tire-model-x',
      variants: [
        createVariant({ attributes: { width: 205, profile: 55, diameter: 16 } }),
        createVariant({ attributes: { width: 225, profile: 45, diameter: 18 } }),
        createVariant({ attributes: { width: 245, profile: 40, diameter: 19 } }),
      ],
    });
    expect(buildAttributeFacet(attribute('width', 'range'), [tire])).toMatchObject({
      minimum: 205,
      maximum: 245,
    });
  });

  it('exposes brandName through a CMS brand attribute without duplicating product data', () => {
    const brandedProduct = createProduct({
      id: 'nova-green-mint',
      brandName: 'Nova Green',
      attributes: {},
    });

    expect(buildAttributeFacet(attribute('brand', 'select'), [brandedProduct]).options)
      .toEqual([{ value: 'Nova Green', count: 1 }]);
    expect(productMatchesAttributeFilters(brandedProduct, {
      brand: { kind: 'options', values: ['nova green'] },
    })).toBe(true);
  });

  describe('variant-aware inStockOnly', () => {
    const selectedConfiguration: CatalogAttributeFilters = {
      storage: { kind: 'range', min: 256, max: 256 },
      color: { kind: 'options', values: ['black'] },
    };

    it('rejects a product when the only matching variant has zero stock', () => {
      const product = createProduct({
        variants: [
          createVariant({
            id: '256-black',
            stockStatus: 'in_stock',
            stockQuantity: 0,
            attributes: { storage: 256, color: 'black' },
          }),
          createVariant({
            id: '128-blue',
            stockStatus: 'in_stock',
            stockQuantity: 10,
            attributes: { storage: 128, color: 'blue' },
          }),
        ],
      });

      expect(productMatchesAttributeFilters(product, selectedConfiguration, { inStockOnly: true }))
        .toBe(false);
    });

    it('returns a product when the matching variant has stock', () => {
      const product = createProduct({
        variants: [
          createVariant({
            id: '256-black',
            stockStatus: 'in_stock',
            stockQuantity: 5,
            attributes: { storage: 256, color: 'black' },
          }),
          createVariant({
            id: '128-blue',
            stockStatus: 'in_stock',
            stockQuantity: 0,
            attributes: { storage: 128, color: 'blue' },
          }),
        ],
      });

      expect(productMatchesAttributeFilters(product, selectedConfiguration, { inStockOnly: true }))
        .toBe(true);
    });

    it('accepts any in-stock variant that matches a partial variant filter', () => {
      const product = createProduct({
        variants: [
          createVariant({
            id: '256-black',
            stockStatus: 'in_stock',
            stockQuantity: 0,
            attributes: { storage: 256, color: 'black' },
          }),
          createVariant({
            id: '256-blue',
            stockStatus: 'in_stock',
            stockQuantity: 5,
            attributes: { storage: 256, color: 'blue' },
          }),
        ],
      });

      expect(productMatchesAttributeFilters(product, {
        storage: { kind: 'range', min: 256, max: 256 },
      }, { inStockOnly: true })).toBe(true);
    });

    it('keeps an in-stock simple product without variants', () => {
      const product = createProduct({
        variants: [],
        stockStatus: 'in_stock',
        stockQuantity: 5,
      });

      expect(productMatchesAttributeFilters(product, {}, { inStockOnly: true })).toBe(true);
    });

    it('rejects a zero-stock simple product without variants', () => {
      const product = createProduct({
        variants: [],
        stockStatus: 'in_stock',
        stockQuantity: 0,
      });

      expect(productMatchesAttributeFilters(product, {}, { inStockOnly: true })).toBe(false);
    });

    it('keeps legacy variants that express availability through stockStatus only', () => {
      const product = createProduct({
        stockStatus: 'in_stock',
        stockQuantity: 0,
        variants: [
          createVariant({
            stockStatus: 'in_stock',
            stockQuantity: undefined,
            attributes: { storage: 256, color: 'black' },
          }),
        ],
      });

      expect(productMatchesAttributeFilters(product, selectedConfiguration, { inStockOnly: true }))
        .toBe(true);
    });
  });
});
