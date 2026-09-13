import { describe, expect, it } from 'vitest';
import { reconcileCartItems } from '@/lib/orders/cartReconciliation';
import { initialProducts } from '@/lib/seedData';
import { getOrderRuleSnapshot } from '@/lib/commerce/orderQuantities';

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

  it('requires a fresh selection when a simple product becomes variant-based', () => {
    const product = { ...initialProducts[0], variants: [{
      id: 'new-variant', sku: 'NEW-VARIANT', titleRu: 'Новый вариант', titleUz: 'Yangi variant',
      attributes: {}, price: 10, stockStatus: 'in_stock' as const,
    }] };
    const result = reconcileCartItems([{
      productId: product.id, productTitleRu: product.titleRu, productSlug: product.slug,
      sku: product.sku, quantity: 1, unit: 'шт', price: 1,
    }], [product]);
    expect(result.issues).toEqual([{ productId: product.id, kind: 'variant_required' }]);
    expect(result.items).toHaveLength(0);
  });

  it('removes products that became informational instead of treating them as request-price lines', () => {
    const product = { ...initialProducts[0], priceMode: 'informational' as const };
    const result = reconcileCartItems([{
      productId: product.id, productTitleRu: product.titleRu, productSlug: product.slug,
      sku: product.sku, quantity: 1, unit: 'шт', price: 1,
    }], [product]);
    expect(result.issues).toEqual([{ productId: product.id, kind: 'informational' }]);
    expect(result.items).toHaveLength(0);
  });

  it('keeps a current request-price line without manufacturing a zero price', () => {
    const product = { ...initialProducts[0], priceMode: 'request' as const, price: undefined };
    const result = reconcileCartItems([{
      productId: product.id, productTitleRu: product.titleRu, productSlug: product.slug,
      sku: product.sku, quantity: 2, unit: product.salesUnit || 'шт', price: 100,
    }], [product]);
    expect(result.items[0]).toMatchObject({ price: undefined, priceMode: 'request' });
    expect(result.issues).toEqual([expect.objectContaining({ kind: 'price_changed', previousPrice: 100 })]);
  });

  it('reports packaging rule changes while preserving the historical snapshot', () => {
    const previousProduct = { ...initialProducts[0], orderPackaging: { enabled: true, unitsPerPackage: 10, minimumPackages: 1, packageStep: 1, nameRu: 'коробка' } };
    const currentProduct = { ...previousProduct, orderPackaging: { ...previousProduct.orderPackaging!, unitsPerPackage: 12 } };
    const historicalRule = getOrderRuleSnapshot(previousProduct);
    const historicalItem = {
      productId: previousProduct.id, productTitleRu: previousProduct.titleRu, productSlug: previousProduct.slug,
      sku: previousProduct.sku, quantity: 10, unit: previousProduct.salesUnit || 'шт', price: previousProduct.price,
      orderRule: historicalRule,
    };
    const result = reconcileCartItems([historicalItem], [currentProduct]);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'packaging_changed' })]));
    expect(result.items[0].orderRule?.unitsPerPackage).toBe(12);
    expect(historicalItem.orderRule.unitsPerPackage).toBe(10);
  });
});
