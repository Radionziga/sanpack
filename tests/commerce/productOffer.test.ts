import { describe, expect, it } from 'vitest';
import {
  getProductPriceMode,
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
});
