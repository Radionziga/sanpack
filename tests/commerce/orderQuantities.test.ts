import { describe, expect, it } from 'vitest';
import {
  getProductOrderRule,
  isValidOrderQuantity,
  normalizeOrderQuantity,
} from '@/lib/commerce/orderQuantities';
import { createProduct, createVariant } from '@/tests/fixtures/products';

describe('product order quantities', () => {
  it('normalizes a regular product from its minimum using its quantity step', () => {
    const product = createProduct({ minimumOrder: 5, quantityStep: 2 });

    expect(getProductOrderRule(product)).toMatchObject({
      minimumQuantity: 5,
      quantityStep: 2,
    });
    expect(normalizeOrderQuantity(product, 1)).toBe(5);
    expect(normalizeOrderQuantity(product, 5)).toBe(5);
    expect(normalizeOrderQuantity(product, 6)).toBe(7);
    expect(normalizeOrderQuantity(product, 7)).toBe(7);
  });

  it('lets variant minimum and step override the product rules', () => {
    const product = createProduct({ minimumOrder: 10, quantityStep: 5 });
    const variant = createVariant({ minQuantity: 3, quantityStep: 0.5 });

    expect(getProductOrderRule(product, 'ru', variant)).toMatchObject({
      minimumQuantity: 3,
      quantityStep: 0.5,
    });
    expect(normalizeOrderQuantity(product, 3.1, variant)).toBe(3.5);
  });

  it('converts package minimum and step into sellable units', () => {
    const product = createProduct({
      minimumOrder: 1,
      quantityStep: 1,
      orderPackaging: {
        enabled: true,
        nameRu: 'коробка',
        unitsPerPackage: 20,
        minimumPackages: 2,
        packageStep: 3,
      },
    });

    expect(getProductOrderRule(product)).toMatchObject({
      unitsPerPackage: 20,
      minimumPackages: 2,
      packageStep: 3,
      minimumQuantity: 40,
      quantityStep: 60,
    });
    expect(normalizeOrderQuantity(product, 41)).toBe(100);
    expect(normalizeOrderQuantity(product, 160)).toBe(160);
  });

  it('accepts floating-point noise on a valid fractional step', () => {
    const product = createProduct({ minimumOrder: 0.1, quantityStep: 0.1 });

    expect(isValidOrderQuantity(product, 0.1 + 0.2)).toBe(true);
    expect(normalizeOrderQuantity(product, 0.1 + 0.2)).toBeCloseTo(0.3);
  });

  it('rejects a fractional quantity outside the configured step', () => {
    const product = createProduct({ minimumOrder: 0.1, quantityStep: 0.1 });

    expect(isValidOrderQuantity(product, 0.35)).toBe(false);
  });

  it.todo('rejects a quantity above maximumOrder in the shared quantity validator');
});
