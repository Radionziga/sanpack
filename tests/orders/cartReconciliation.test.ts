import { describe, expect, it } from 'vitest';
import { reconcileCartItems } from '@/lib/orders/cartReconciliation';
import { initialProducts } from '@/lib/seedData';

describe('cart reconciliation', () => {
  it('reports changed price and quantity without silently submitting stale snapshots', () => {
    const product = { ...initialProducts[0], price: 80, minimumOrder: 10, quantityStep: 5 };
    const result = reconcileCartItems([{
      productId: product.id, productTitleRu: product.titleRu, productSlug: product.slug,
      sku: product.sku, quantity: 1, unit: product.salesUnit || 'шт', price: 100,
    }], [product]);
    expect(result.items[0].quantity).toBe(10);
    expect(result.items[0].price).toBe(80);
    expect(result.issues.map((issue) => issue.kind)).toEqual(expect.arrayContaining(['quantity_changed', 'price_changed']));
  });

  it('blocks removed variants', () => {
    const product = { ...initialProducts[0], variants: [] };
    expect(reconcileCartItems([{
      productId: product.id, productTitleRu: product.titleRu, productSlug: product.slug,
      sku: product.sku, variantId: 'gone', quantity: 1, unit: 'шт', price: 1,
    }], [product]).issues[0].kind).toBe('variant_removed');
  });
});
