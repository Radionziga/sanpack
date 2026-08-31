import { describe, expect, it } from 'vitest';
import { hasRequiredProductOrVariantAttribute } from '@/lib/catalog/productAttributeRequirements';
import { createProduct, createVariant } from '@/tests/fixtures/products';

describe('required product or variant attributes', () => {
  it('accepts a shared product-level value', () => {
    expect(hasRequiredProductOrVariantAttribute(createProduct({ attributes: { brand: 'Example' } }), 'brand')).toBe(true);
  });

  it('accepts a value provided by every variant', () => {
    const product = createProduct({
      variants: [
        createVariant({ id: '128', attributes: { storage: 128 } }),
        createVariant({ id: '256', attributes: { storage: 256 } }),
      ],
    });
    expect(hasRequiredProductOrVariantAttribute(product, 'storage')).toBe(true);
  });

  it('rejects a required value missing from one variant', () => {
    const product = createProduct({
      variants: [
        createVariant({ id: '128', attributes: { storage: 128 } }),
        createVariant({ id: 'missing', attributes: {} }),
      ],
    });
    expect(hasRequiredProductOrVariantAttribute(product, 'storage')).toBe(false);
  });
});
