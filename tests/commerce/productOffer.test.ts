import { describe, expect, it } from 'vitest';
import {
  getEffectiveCatalogPrice,
  getMinimumComparisonPrice,
  getMinimumSalePrice,
  getNormalizedUnitPrice,
  getProductPriceMode,
  getProductOrderUnitPrice,
  getProductUnitPrice,
  isProductOrderable,
} from '@/lib/commerce/productOffer';
import { createProduct, createVariant } from '@/tests/fixtures/products';

describe('product offer resolution', () => {
  it.each([
    {
      name: 'variant zero price',
      product: createProduct({ price: 100 }),
      variant: createVariant({ price: 0 }),
      expected: 0,
    },
    {
      name: 'product fallback when variant price is absent',
      product: createProduct({ price: 100 }),
      variant: createVariant({ price: undefined }),
      expected: 100,
    },
    {
      name: 'missing price',
      product: createProduct({ price: undefined }),
      variant: undefined,
      expected: undefined,
    },
  ])('resolves $name without truthy fallbacks', ({ product, variant, expected }) => {
    expect(getProductUnitPrice(product, variant)).toBe(expected);
  });

  it.each([
    { productMode: 'request' as const, variantMode: 'fixed' as const, expectedMode: 'fixed', orderable: true },
    { productMode: 'informational' as const, variantMode: undefined, expectedMode: 'informational', orderable: false },
    { productMode: undefined, variantMode: undefined, expectedMode: 'fixed', orderable: true },
  ])(
    'resolves $expectedMode with orderable=$orderable',
    ({ productMode, variantMode, expectedMode, orderable }) => {
      const product = createProduct({ priceMode: productMode });
      const variant = variantMode ? createVariant({ priceMode: variantMode }) : undefined;

      expect(getProductPriceMode(product, variant)).toBe(expectedMode);
      expect(isProductOrderable(product, variant)).toBe(orderable);
    },
  );

  it('uses the minimum variant price for both preview and sorting', () => {
    const product = createProduct({
      price: 999,
      variants: [
        createVariant({ id: 'r16', price: 100 }),
        createVariant({ id: 'r18', price: 150 }),
        createVariant({ id: 'r19', price: 180 }),
      ],
    });

    expect(getMinimumSalePrice(product)).toMatchObject({ amount: 100, basis: 'sale', isFrom: true });
    expect(getEffectiveCatalogPrice(product)?.amount).toBe(100);
  });

  it('resolves wholesale tiers from quantity without changing the catalog preview', () => {
    const product = createProduct({
      price: 100,
      wholesaleTiers: [
        { minQuantity: 10, price: 90 },
        { minQuantity: 50, price: 75 },
      ],
    });

    expect(getProductOrderUnitPrice(product, undefined, 1)).toBe(100);
    expect(getProductOrderUnitPrice(product, undefined, 10)).toBe(90);
    expect(getProductOrderUnitPrice(product, undefined, 75)).toBe(75);
    expect(getMinimumSalePrice(product)?.amount).toBe(100);
  });

  it('uses variant tiers when present and otherwise inherits product tiers', () => {
    const product = createProduct({
      wholesaleTiers: [{ minQuantity: 10, price: 90 }],
    });
    const inherited = createVariant({ price: 125, wholesaleTiers: [] });
    const overridden = createVariant({
      price: 125,
      wholesaleTiers: [{ minQuantity: 10, price: 80 }],
    });

    expect(getProductOrderUnitPrice(product, inherited, 10)).toBe(90);
    expect(getProductOrderUnitPrice(product, overridden, 10)).toBe(80);
  });

  it('normalizes compatible mass units without changing the sellable price', () => {
    expect(getNormalizedUnitPrice(66_000, {
      quantity: 2,
      unit: 'kilogram',
      displayUnit: 'kilogram',
    })).toEqual({ amount: 33_000, unit: 'kilogram' });
    expect(getNormalizedUnitPrice(15_500, {
      quantity: 500,
      unit: 'gram',
      displayUnit: 'kilogram',
    })).toEqual({ amount: 31_000, unit: 'kilogram' });
  });

  it.each([
    {
      name: 'milliliters to liters',
      price: 15_000,
      unitPricing: { quantity: 500, unit: 'milliliter' as const, displayUnit: 'liter' as const },
      expected: { amount: 30_000, unit: 'liter' },
    },
    {
      name: 'liters to liters',
      price: 24_000,
      unitPricing: { quantity: 2, unit: 'liter' as const, displayUnit: 'liter' as const },
      expected: { amount: 12_000, unit: 'liter' },
    },
    {
      name: 'pieces',
      price: 12_000,
      unitPricing: { quantity: 6, unit: 'piece' as const, displayUnit: 'piece' as const },
      expected: { amount: 2_000, unit: 'piece' },
    },
    {
      name: 'meters',
      price: 21_000,
      unitPricing: { quantity: 3.5, unit: 'meter' as const, displayUnit: 'meter' as const },
      expected: { amount: 6_000, unit: 'meter' },
    },
    {
      name: 'square meters',
      price: 36_000,
      unitPricing: { quantity: 1.5, unit: 'square_meter' as const, displayUnit: 'square_meter' as const },
      expected: { amount: 24_000, unit: 'square_meter' },
    },
  ])('normalizes $name', ({ price, unitPricing, expected }) => {
    expect(getNormalizedUnitPrice(price, unitPricing)).toEqual(expected);
  });

  it.each([
    { price: 1_000, unitPricing: { quantity: 0, unit: 'kilogram' as const } },
    { price: 1_000, unitPricing: { quantity: -1, unit: 'kilogram' as const } },
    { price: -1, unitPricing: { quantity: 1, unit: 'kilogram' as const } },
    { price: 1_000, unitPricing: { quantity: 1, unit: 'kilogram' as const, displayUnit: 'liter' as const } },
  ])('rejects invalid or incompatible comparison pricing %#', ({ price, unitPricing }) => {
    expect(getNormalizedUnitPrice(price, unitPricing)).toBeUndefined();
  });

  it('finds the minimum normalized unit price across butter variants', () => {
    const product = createProduct({
      catalogPriceBasis: 'comparison',
      variants: [
        createVariant({
          id: '1-kg',
          price: 165_000,
          unitPricing: { quantity: 1, unit: 'kilogram' },
        }),
        createVariant({
          id: '25-kg',
          price: 3_625_000,
          unitPricing: { quantity: 25, unit: 'kilogram' },
        }),
      ],
    });

    expect(getMinimumComparisonPrice(product)).toMatchObject({
      amount: 145_000,
      unit: 'kilogram',
      basis: 'comparison',
      isFrom: true,
    });
    expect(getEffectiveCatalogPrice(product)?.amount).toBe(145_000);
    expect(getProductUnitPrice(product, product.variants[1])).toBe(3_625_000);
  });

  it('compares compatible variants through one common display unit', () => {
    const product = createProduct({
      catalogPriceBasis: 'comparison',
      unitPricing: { quantity: 1, unit: 'kilogram', displayUnit: 'kilogram' },
      variants: [
        createVariant({
          id: '500-g',
          price: 90_000,
          unitPricing: { quantity: 500, unit: 'gram', displayUnit: 'gram' },
        }),
        createVariant({
          id: '1-kg',
          price: 165_000,
          unitPricing: { quantity: 1, unit: 'kilogram', displayUnit: 'kilogram' },
        }),
      ],
    });

    expect(getMinimumComparisonPrice(product)).toMatchObject({
      amount: 165_000,
      unit: 'kilogram',
    });
  });

  it('falls back to the sale price when comparison units are incompatible', () => {
    const product = createProduct({
      catalogPriceBasis: 'comparison',
      variants: [
        createVariant({ price: 100, unitPricing: { quantity: 1, unit: 'kilogram' } }),
        createVariant({ id: 'volume', price: 80, unitPricing: { quantity: 1, unit: 'liter' } }),
      ],
    });

    expect(getMinimumComparisonPrice(product)).toBeUndefined();
    expect(getEffectiveCatalogPrice(product)).toMatchObject({ amount: 80, basis: 'sale' });
  });
});
