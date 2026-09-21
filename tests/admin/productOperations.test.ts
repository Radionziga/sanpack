import { describe, expect, it } from 'vitest';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import { taxonomyCategories, createAttribute } from '@/tests/fixtures/categories';
import { createProductDuplicateDraft, duplicateVariantDraft, getProductReadiness } from '@/lib/admin/productOperations';

describe('Product Operations readiness', () => {
  it('separates publishing blockers from recommendations', () => {
    const product = createProduct({ categoryId: 'grains', sku: '', price: undefined, mainImage: '', titleEn: '', attributes: {} });
    const result = getProductReadiness(product, taxonomyCategories, [createAttribute('weight', ['grocery'])]);
    expect(result.readyToPublish).toBe(false);
    expect(result.blockers.map(({ code }) => code)).toEqual(expect.arrayContaining(['missing_sku', 'missing_price', 'attribute_weight']));
    expect(result.recommendations.map(({ code }) => code)).toContain('missing_image');
  });

  it('accepts request-price products without a numeric price', () => {
    const product = createProduct({ categoryId: 'grocery', priceMode: 'request', price: undefined, mainImage: '/media/p.webp', shortDescriptionRu: 'Описание' });
    expect(getProductReadiness(product, taxonomyCategories, []).blockers).toEqual([]);
  });

  it('blocks a Variant SKU that duplicates the Product SKU', () => {
    const product = createProduct({ sku: 'SAME-SKU', variants: [createVariant({ sku: 'same-sku' })] });
    expect(getProductReadiness(product, taxonomyCategories, []).blockers.map(({ code }) => code))
      .toContain('duplicate_variant_sku_0');
  });
});

describe('Product Operations duplication', () => {
  it('creates a distinct unpublished Product and Variant identity without copying SKUs or media files', () => {
    const source = createProduct({
      id: 'source', sku: 'SOURCE-SKU', status: 'published', mainImage: 'https://cdn/image.webp', mainImagePath: 'media/image.webp',
      attributes: { weight: 25 }, variants: [createVariant({ id: 'source-variant', sku: 'SOURCE-VARIANT' })],
    });
    const duplicate = createProductDuplicateDraft(source, {
      id: 'copy', slug: 'test-product-copy-1', now: '2026-09-21T10:00:00.000Z', actor: 'admin', createVariantId: () => 'copy-variant',
    });
    expect(duplicate).toMatchObject({ id: 'copy', status: 'draft', sku: '', slug: 'test-product-copy-1', mainImage: source.mainImage, mainImagePath: source.mainImagePath, attributes: source.attributes });
    expect(duplicate.variants[0]).toMatchObject({ id: 'copy-variant', sku: '', price: source.variants[0].price });
    expect(source).toMatchObject({ id: 'source', sku: 'SOURCE-SKU', status: 'published' });
  });

  it('duplicates a Variant structure with a new identity and blank SKU', () => {
    const source = createVariant({ attributes: { weight: 10 }, minQuantity: 2, image: '/media/v.webp' });
    const duplicate = duplicateVariantDraft(source);
    expect(duplicate.id).not.toBe(source.id);
    expect(duplicate).toMatchObject({ sku: '', attributes: source.attributes, minQuantity: 2, image: source.image });
    expect(source.sku).toBe('SKU-VARIANT');
  });
});
