import { describe, expect, it } from 'vitest';
import { getProductCommercialDetails } from '@/lib/commerce/productCommercial';
import { createProduct, createVariant } from '@/tests/fixtures/products';

describe('product commercial details', () => {
  it('puts package composition and the real minimum purchase amount together', () => {
    const product = createProduct({
      price: 1_100,
      salesUnit: 'шт',
      unitCode: 'piece',
      orderPackaging: {
        enabled: true,
        nameRu: 'коробка',
        nameEn: 'box',
        unitsPerPackage: 1_000,
        minimumPackages: 1,
        packageStep: 1,
      },
      wholesaleTiers: [{ minQuantity: 10_000, price: 980 }],
    });

    expect(getProductCommercialDetails(product, 'ru')).toEqual({
      packaging: '1 коробка = 1 000 штук',
      minimum: 'Минимум 1 коробка · 1 100 000 сум',
      minimumAmount: 1_100_000,
      wholesale: ['От 10 коробок — 980 сум / шт'],
    });
  });

  it('uses variant quantity and price overrides without a second pricing rule', () => {
    const product = createProduct({ minimumOrder: 10, quantityStep: 5, price: 100 });
    const variant = createVariant({ price: 250, minQuantity: 3, quantityStep: 2 });

    expect(getProductCommercialDetails(product, 'en', variant)).toMatchObject({
      packaging: undefined,
      minimum: 'Minimum 3 pieces · 750 UZS',
      minimumAmount: 750,
    });
  });

  it('never invents a zero amount for a request-price product', () => {
    const product = createProduct({ showPrice: false, priceMode: 'request', price: undefined });
    const details = getProductCommercialDetails(product, 'ru');
    expect(details.minimum).toBe('Минимум 1 штука');
    expect(details.minimum).not.toContain('0');
  });
});
