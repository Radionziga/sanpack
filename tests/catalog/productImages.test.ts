import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasProductImage, PRODUCT_IMAGE_PLACEHOLDER } from '@/lib/catalog/productImages';
import { getSeedProductImage } from '@/lib/catalog/seedProductImages';
import { priceList2026Products } from '@/lib/catalog/sanpackPriceLists2026';

describe('product images', () => {
  it('treats empty and legacy placeholder sources as unavailable', () => {
    expect(hasProductImage()).toBe(false);
    expect(hasProductImage('')).toBe(false);
    expect(hasProductImage(PRODUCT_IMAGE_PLACEHOLDER)).toBe(false);
    expect(hasProductImage(`${PRODUCT_IMAGE_PLACEHOLDER}?v=2`)).toBe(false);
  });

  it('keeps actual local and remote product images', () => {
    expect(hasProductImage('/catalog/extracted_p12_img1.jpeg')).toBe(true);
    expect(hasProductImage('https://firebasestorage.googleapis.com/product.webp')).toBe(true);
  });

  it('maps reviewed seed products without inventing an image for unknown SKUs', () => {
    expect(getSeedProductImage('SP-TB-001')).toBe('/catalog/sanpack_trash_bag_roll_6_nobg.png');
    expect(getSeedProductImage('SP-DA-013')).toBe('/catalog/extracted_p9_img7.jpeg');
    expect(getSeedProductImage('SP-NOT-MAPPED')).toBeUndefined();
  });

  it('only references product images that exist in the local public catalogue', () => {
    const mappedProducts = priceList2026Products.filter((product) => product.mainImage);
    expect(mappedProducts.length).toBeGreaterThan(80);
    expect(priceList2026Products.some((product) => !product.mainImage)).toBe(true);

    for (const product of mappedProducts) {
      expect(
        existsSync(join(process.cwd(), 'public', product.mainImage)),
        `${product.sku} references missing ${product.mainImage}`,
      ).toBe(true);
    }
  });
});
