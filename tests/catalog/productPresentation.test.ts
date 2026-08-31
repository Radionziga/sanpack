import { describe, expect, it } from 'vitest';
import { getProductCatalogPriceText } from '@/lib/catalog/productPresentation';
import { createProduct, createVariant } from '@/tests/fixtures/products';

describe('catalog price presentation', () => {
  it('shows the same minimum variant price used by catalog sorting', () => {
    const product = createProduct({
      variants: [
        createVariant({ id: '128', price: 5_000_000 }),
        createVariant({ id: '256', price: 5_800_000 }),
      ],
    });

    expect(getProductCatalogPriceText(product, 'ru')).toBe('от 5 000 000 сум');
    expect(getProductCatalogPriceText(product, 'en')).toBe('from 5,000,000 UZS');
  });

  it('presents a comparison price without hiding the commercial package price', () => {
    const product = createProduct({
      price: 66_000,
      salesUnit: 'упаковка',
      unitCode: 'pack',
      catalogPriceBasis: 'comparison',
      unitPricing: { quantity: 2, unit: 'kilogram', displayUnit: 'kilogram' },
    });

    expect(getProductCatalogPriceText(product, 'ru')).toBe('33 000 сум / кг');
    expect(product.price).toBe(66_000);
    expect(product.salesUnit).toBe('упаковка');
  });

  it('keeps request pricing unchanged for legacy products without a price', () => {
    expect(getProductCatalogPriceText(createProduct({ price: undefined }), 'ru'))
      .toBe('Цена по запросу');
  });
});
