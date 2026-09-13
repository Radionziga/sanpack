import { describe, expect, it } from 'vitest';
import { projectCustomerOrder } from '@/lib/orders/customerOrderProjection';

describe('customer order projection', () => {
  it('does not expose admin identity, audit or notification internals', () => {
    const projected = projectCustomerOrder({
      id: 'o1', requestNumber: 'ORD-1', contactName: 'A', phone: '+998', items: [],
      status: 'new', createdAt: '2026-01-01', customerUid: 'secret',
      auditTrail: [{ id: 'a', action: 'created', actorUid: 'admin', actorLabel: 'owner@example.com', createdAt: 'x', summary: 'x', revision: 1 }],
      notification: { delivered: true },
    } as never);
    expect(projected).not.toHaveProperty('customerUid');
    expect(projected).not.toHaveProperty('auditTrail');
    expect(projected).not.toHaveProperty('notification');
  });

  it('keeps the customer-safe ordering-rule snapshot but removes embedded catalog records', () => {
    const projected = projectCustomerOrder({
      id: 'o2', requestNumber: 'ORD-2', contactName: 'A', phone: '+998',
      status: 'new', createdAt: '2026-01-01', items: [{
        productId: 'p1', productTitleRu: 'Товар', productSlug: 'tovar', sku: 'SKU', quantity: 10, unit: 'шт',
        orderRule: { salesUnit: 'шт', minimumQuantity: 10, quantityStep: 10, packageEnabled: true, unitsPerPackage: 10, minimumPackages: 1, packageStep: 1 },
        product: { private: 'catalog internals' }, variant: { private: 'variant internals' },
      }],
    } as never);
    expect(projected.items[0].orderRule).toMatchObject({ minimumQuantity: 10, unitsPerPackage: 10 });
    expect(projected.items[0]).not.toHaveProperty('product');
    expect(projected.items[0]).not.toHaveProperty('variant');
  });
});
