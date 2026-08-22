import { describe, expect, it } from 'vitest';
import {
  getPresentedProductAttributes,
  getProductPriceLabel,
  getProductSalesUnitLabel,
} from '@/lib/catalog/productPresentation';
import {
  priceList2026Attributes,
  priceList2026Products,
} from '@/lib/catalog/sanpackPriceLists2026';

const cyrillic = /[А-Яа-яЁё]/u;

function firstLetter(value: string) {
  return value.match(/\p{L}/u)?.[0] || '';
}

describe('2026 seed catalogue localization', () => {
  it('provides distinct Latin-script Uzbek and English titles for every product', () => {
    expect(priceList2026Products).toHaveLength(164);

    for (const product of priceList2026Products) {
      expect(product.titleUz, product.sku).not.toBe(product.titleRu);
      expect(product.titleEn, product.sku).not.toBe(product.titleRu);
      expect(cyrillic.test(product.titleUz), product.sku).toBe(false);
      expect(cyrillic.test(product.titleEn || ''), product.sku).toBe(false);
      expect(firstLetter(product.titleUz), product.sku).toBe(
        firstLetter(product.titleUz).toLocaleUpperCase('uz-UZ'),
      );
      expect(firstLetter(product.titleEn || ''), product.sku).toBe(
        firstLetter(product.titleEn || '').toLocaleUpperCase('en-US'),
      );
      expect(cyrillic.test(product.shortDescriptionUz), product.sku).toBe(false);
      expect(cyrillic.test(product.shortDescriptionEn || ''), product.sku).toBe(false);

      for (const variant of product.variants) {
        expect(cyrillic.test(variant.titleUz), variant.sku).toBe(false);
        expect(cyrillic.test(variant.titleEn || ''), variant.sku).toBe(false);
      }
    }
  });

  it('uses the expected Svalya titles and localized sales units', () => {
    const product = priceList2026Products.find((candidate) => candidate.sku === 'SP-DA-013');
    expect(product).toBeDefined();
    expect(product?.titleUz).toBe('Svalya pishlog‘i, 3 kg');
    expect(product?.titleEn).toBe('Svalya cheese, 3 kg');
    expect(getProductSalesUnitLabel(product!, 'uz')).toBe('qadoq');
    expect(getProductSalesUnitLabel(product!, 'en')).toBe('pack');
    expect(getProductPriceLabel(product!, 'uz')).toBe('Qadoq uchun narx');
    expect(getProductPriceLabel(product!, 'en')).toBe('Price per pack');
  });

  it('does not leak Russian attribute values into Uzbek or English presentation', () => {
    for (const product of priceList2026Products) {
      for (const language of ['uz', 'en'] as const) {
        const attributes = getPresentedProductAttributes(
          product,
          priceList2026Attributes,
          language,
        );
        for (const attribute of attributes) {
          expect(cyrillic.test(attribute.value), `${product.sku}.${language}.${attribute.key}`).toBe(false);
        }
      }
    }
  });
});
