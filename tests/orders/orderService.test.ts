import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/types';
import { createProduct, createVariant } from '@/tests/fixtures/products';

const { getAdminDbMock } = vi.hoisted(() => ({
  getAdminDbMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: getAdminDbMock,
}));

import { createOrderSnapshots } from '@/lib/orders/orderService';

function provideProducts(products: Product[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  getAdminDbMock.mockReturnValue({
    collection: vi.fn(() => ({
      doc: vi.fn((id: string) => ({
        get: vi.fn(async () => {
          const product = byId.get(id);
          return {
            id,
            exists: Boolean(product),
            data: () => product,
          };
        }),
      })),
    })),
  });
}

describe('order snapshots with product variants', () => {
  beforeEach(() => {
    getAdminDbMock.mockReset();
  });

  it('accepts a known variant and uses its identity, SKU, and price', async () => {
    const variant = createVariant({ id: 'large', sku: 'SKU-LARGE', price: 250 });
    const product = createProduct({ variants: [variant], price: 100 });
    provideProducts([product]);

    const [snapshot] = await createOrderSnapshots([
      { productId: product.id, variantId: variant.id, quantity: 1 },
    ]);

    expect(snapshot).toMatchObject({
      productId: product.id,
      variantId: variant.id,
      sku: 'SKU-LARGE',
      price: 250,
      lineTotal: 250,
    });
  });

  it('rejects a product that requires a variant when variantId is missing', async () => {
    const product = createProduct({ variants: [createVariant()] });
    provideProducts([product]);

    await expect(
      createOrderSnapshots([{ productId: product.id, quantity: 1 }]),
    ).rejects.toThrow('Выберите вариант товара');
  });

  it('rejects an unknown variantId', async () => {
    const product = createProduct({ variants: [createVariant()] });
    provideProducts([product]);

    await expect(
      createOrderSnapshots([
        { productId: product.id, variantId: 'unknown-variant', quantity: 1 },
      ]),
    ).rejects.toThrow('Выбранный вариант');
  });

  it('preserves a zero variant price instead of falling back to the product price', async () => {
    const variant = createVariant({ price: 0 });
    const product = createProduct({ variants: [variant], price: 100 });
    provideProducts([product]);

    const [snapshot] = await createOrderSnapshots([
      { productId: product.id, variantId: variant.id, quantity: 2 },
    ]);

    expect(snapshot.price).toBe(0);
    expect(snapshot.lineTotal).toBe(0);
  });

  it('uses the canonical wholesale tier for the submitted quantity', async () => {
    const product = createProduct({
      price: 66_000,
      wholesaleTiers: [{ minQuantity: 10, price: 60_000 }],
      minimumOrder: 1,
      quantityStep: 1,
    });
    provideProducts([product]);

    const [snapshot] = await createOrderSnapshots([
      { productId: product.id, quantity: 10 },
    ]);

    expect(snapshot.price).toBe(60_000);
    expect(snapshot.lineTotal).toBe(600_000);
  });

  it('never uses comparison pricing as the commercial order price', async () => {
    const product = createProduct({
      price: 66_000,
      unitPricing: { quantity: 2, unit: 'kilogram', displayUnit: 'kilogram' },
    });
    provideProducts([product]);

    const [snapshot] = await createOrderSnapshots([
      { productId: product.id, quantity: 1 },
    ]);

    expect(snapshot.price).toBe(66_000);
    expect(snapshot.lineTotal).toBe(66_000);
  });

  it('rejects an order quantity above the product maximum', async () => {
    const product = createProduct({ maximumOrder: 10 });
    provideProducts([product]);

    await expect(
      createOrderSnapshots([{ productId: product.id, quantity: 11 }]),
    ).rejects.toThrow('Максимальное количество');
  });
});
