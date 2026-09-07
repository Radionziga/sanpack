import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import type { Product } from '@/types';
const { db, customer, created } = vi.hoisted(() => ({ db: vi.fn(), customer: vi.fn(), created: vi.fn() }));
const idempotencyStore = new Map<string, Record<string, unknown>>();
const orderStore = new Map<string, Record<string, unknown>>();
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: db }));
vi.mock('@/lib/auth/customerSession', () => ({ getCustomerSession: customer }));
vi.mock('@/lib/security/distributedRateLimit', () => ({ checkDistributedRateLimit: async () => ({ allowed: true }) }));
vi.mock('@/lib/telegram/notifications', () => ({ notifyAboutNewOrder: async () => ({ delivered: false }) }));
import { POST, GET } from '@/app/api/requests/route';

const base = { contactName: 'Test customer', phone: '+998901234567', deliveryAddress: 'Tashkent fixture address', deliveryDate: '2026-09-01', deliveryWindow: '09:00-13:00' };
function request(items: unknown[], extras = {}) {
  return new Request('https://shop.example/api/requests', { method: 'POST', headers: { 'idempotency-key': 'test-checkout-intent-0001' }, body: JSON.stringify({ ...base, items, ...extras }) });
}
function supply(product: Product) {
  const database = {
    collection: (name: string) => ({
      doc: (id?: string) => name === 'products'
        ? { id, kind: name, get: async () => ({ id, exists: id === product.id, data: () => product }) }
        : name === 'requestIdempotency'
          ? { id, kind: name, get: async () => ({ id, exists: idempotencyStore.has(id!), data: () => idempotencyStore.get(id!) }) }
          : { id: id || 'new-order', kind: name, get: async () => ({ id, exists: orderStore.has(id || 'new-order'), data: () => orderStore.get(id || 'new-order') }), update: async () => undefined },
    }),
    runTransaction: async (callback: (transaction: { get: (reference: { get: () => Promise<unknown> }) => Promise<unknown>; create: (reference: { id?: string }, data: unknown) => void }) => Promise<unknown>) => callback({
      get: (reference) => reference.get(),
      create: (reference: { id?: string; kind?: string }, data: unknown) => {
        if (reference.kind === 'requestIdempotency') idempotencyStore.set(reference.id!, data as Record<string, unknown>);
        if (reference.kind === 'requests') { orderStore.set(reference.id!, data as Record<string, unknown>); created(data); }
      },
    }),
  };
  db.mockReturnValue(database);
}
beforeEach(() => { vi.clearAllMocks(); idempotencyStore.clear(); orderStore.clear(); customer.mockResolvedValue(null); supply(createProduct()); });
describe('public checkout adversarial HTTP contract', () => {
  it('cannot evade maximum quantity by duplicating the same configuration', async () => {
    supply(createProduct({ maximumOrder: 10 }));
    expect((await POST(request([{ productId: 'product-1', quantity: 10 }, { productId: 'product-1', quantity: 10 }]))).status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });
  it('queries customer history by signed identity, not contact phone', async () => {
    customer.mockResolvedValue({ sub: 'telegram:123' });
    const where = vi.fn(() => ({ orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) }));
    db.mockReturnValue({ collection: () => ({ where }) });
    expect((await GET()).status).toBe(200);
    expect(where).toHaveBeenCalledWith('customerUid', '==', 'telegram:123');
  });
  it.each(['unitPrice', 'price', 'lineTotal', 'wholesaleTiers'])('rejects client %s on a line before writes', async (field) => {
    expect((await POST(request([{ productId: 'product-1', quantity: 1, [field]: 1 }]))).status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });
  it('rejects client total, path injection and unknown products', async () => {
    expect((await POST(request([{ productId: 'product-1', quantity: 1 }], { total: 1 }))).status).toBe(400);
    expect((await POST(request([{ productId: 'p/private/x', quantity: 1 }]))).status).toBe(400);
    expect((await POST(request([{ productId: 'missing', quantity: 1 }]))).status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });
  it.each(['draft', 'archived'] as const)('rejects %s products', async (status) => {
    supply(createProduct({ status }));
    expect((await POST(request([{ productId: 'product-1', quantity: 1 }]))).status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });
  it('requires a real variant and rejects informational products', async () => {
    supply(createProduct({ variants: [createVariant()] }));
    for (const variantId of [undefined, 'unknown']) {
      expect((await POST(request([{ productId: 'product-1', quantity: 1, variantId }]))).status).toBe(400);
    }
    supply(createProduct({ priceMode: 'informational' }));
    expect((await POST(request([{ productId: 'product-1', quantity: 1 }]))).status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1, 3, 12])('rejects invalid minimum/step/maximum quantity %s', async (quantity) => {
    supply(createProduct({ minimumOrder: 2, quantityStep: 2, maximumOrder: 10 }));
    expect((await POST(request([{ productId: 'product-1', quantity }]))).status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });
  it('saves sale price (not comparison price) from current database data', async () => {
    supply(createProduct({ price: 66_000, salesUnit: 'упаковка', unitPricing: { quantity: 2, unit: 'kilogram', displayUnit: 'kilogram' } }));
    const response = await POST(request([{ productId: 'product-1', quantity: 1 }]));
    expect(response.status).toBe(201);
    expect(created.mock.calls[0][0]).toMatchObject({ total: 66_000, items: [{ quantity: 1, price: 66_000, lineTotal: 66_000, unit: 'упаковка' }] });
  });
  it('replays the same checkout intent without creating a duplicate request', async () => {
    const first = await POST(request([{ productId: 'product-1', quantity: 1 }]));
    const second = await POST(request([{ productId: 'product-1', quantity: 1 }]));
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(created).toHaveBeenCalledTimes(1);
    expect((await second.json()).requestNumber).toBe((await first.json()).requestNumber);
  });
  it('uses current variant tiers and enforces variant maximum', async () => {
    supply(createProduct({ variants: [createVariant({ price: 250, wholesaleTiers: [{ minQuantity: 2, price: 200 }], maxQuantity: 3 })] }));
    expect((await POST(request([{ productId: 'product-1', variantId: 'variant-1', quantity: 4 }]))).status).toBe(400);
    expect((await POST(request([{ productId: 'product-1', variantId: 'variant-1', quantity: 2 }]))).status).toBe(201);
    expect(created.mock.calls[0][0]).toMatchObject({ total: 400, items: [{ price: 200 }] });
  });
  it('keeps request-price lines unpriced and phone is not history authentication', async () => {
    supply(createProduct({ priceMode: 'request', price: 123 }));
    expect((await POST(request([{ productId: 'product-1', quantity: 1 }]))).status).toBe(201);
    expect(created.mock.calls[0][0].items[0].price).toBeUndefined();
    expect((await GET()).status).toBe(401);
  });
});
