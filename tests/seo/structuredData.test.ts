import { describe, expect, it } from 'vitest';
import { buildProductStructuredData } from '@/lib/seo/productStructuredData';
import { createProduct, createVariant } from '@/tests/fixtures/products';

describe('truthful Product structured data', () => {
  const identity = {
    name: 'Test product',
    description: 'Commercial product description.',
    url: 'https://sanpack.uz/en/product/test-product',
  };

  it('uses the real minimum sale offer for a fixed-price Product', () => {
    const data = buildProductStructuredData(createProduct({
      price: 150,
      variants: [createVariant({ price: 125 })],
    }), identity);
    expect(data.offers).toMatchObject({
      '@type': 'Offer',
      price: 125,
      priceCurrency: 'UZS',
      availability: 'https://schema.org/InStock',
      url: identity.url,
    });
  });

  it.each(['request', 'informational'] as const)('does not invent a numeric Offer for %s pricing', (priceMode) => {
    const data = buildProductStructuredData(createProduct({ priceMode, price: 0 }), identity);
    expect(data.offers).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('aggregateRating');
    expect(JSON.stringify(data)).not.toContain('review');
  });
});
