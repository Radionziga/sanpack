import { describe, expect, it } from 'vitest';
import { PRODUCT_IMAGE_PLACEHOLDER } from '@/lib/catalog/productImages';
import { getProductGalleryImages } from '@/lib/catalog/productGallery';

describe('product gallery images', () => {
  it('puts the selected variant image first and removes duplicates', () => {
    expect(
      getProductGalleryImages(['/product.jpg', '/detail.jpg'], '/detail.jpg'),
    ).toEqual(['/detail.jpg', '/product.jpg']);
  });

  it('keeps the product image available when a variant has no dedicated photo', () => {
    expect(getProductGalleryImages(['/product.jpg'], undefined)).toEqual(['/product.jpg']);
  });

  it('removes empty and legacy placeholder sources', () => {
    expect(
      getProductGalleryImages(['', PRODUCT_IMAGE_PLACEHOLDER, '/product.jpg'], null),
    ).toEqual(['/product.jpg']);
  });
});
