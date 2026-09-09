import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import type { Product } from '@/types';
const { db, customer, created, notified, verifyMiniApp } = vi.hoisted(() => ({ db: vi.fn(), customer: vi.fn(), created: vi.fn(), notified: vi.fn(), verifyMiniApp: vi.fn() }));
const idempotencyStore = new Map<string, Record<string, unknown>>();
const orderStore = new Map<string, Record<string, unknown>>();
let transactionQueue = Promise.resolve();
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: db }));
vi.mock('@/lib/auth/customerSession', () => ({ getCustomerSession: customer }));
vi.mock('@/lib/security/distributedRateLimit', () => ({ checkDistributedRateLimit: async () => ({ allowed: true }) }));
vi.mock('@/lib/telegram/notifications', () => ({
  notifyAboutNewOrder: (order: unknown) => notified(order),
  suppressTestOrderNotification: async () => ({ delivered: false, reason: 'suppressed_test' }),
}));
vi.mock('@/lib/telegram/settings', () => ({ getTelegramPrivateSettings: async () => ({ storefront: { enabled: true, tokenEncrypted: 'encrypted' } }) }));
vi.mock('@/lib/telegram/secrets', () => ({ decryptSecret: () => 'token' }));
vi.mock('@/lib/telegram/miniApp', () => ({ verifyTelegramInitData: (...args: unknown[]) => verifyMiniApp(...args) }));
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
          : { id: id || 'new-order', kind: name, get: async () => ({ id, exists: orderStore.has(id || 'new-order'), data: () => orderStore.get(id || 'new-order') }), update: async (patch: Record<string, unknown>) => orderStore.set(id || 'new-order', { ...(orderStore.get(id || 'new-order') || {}), ...patch }) },
    }),
    runTransaction: async (callback: (transaction: { get: (reference: { get: () => Promise<unknown> }) => Promise<unknown>; create: (reference: { id?: string }, data: unknown) => void }) => Promise<unknown>) => {
      const previous = transactionQueue;
      let release: () => void = () => undefined;
      transactionQueue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        return await callback({
          get: (reference) => reference.get(),
          create: (reference: { id?: string; kind?: string }, data: unknown) => {
            if (reference.kind === 'requestIdempotency') idempotencyStore.set(reference.id!, data as Record<string, unknown>);
            if (reference.kind === 'requests') { orderStore.set(reference.id!, data as Record<string, unknown>); created(data); }
          },
        });
      } finally {
        release();
      }
    },
  };
  db.mockReturnValue(database);
}
beforeEach(() => {
  vi.clearAllMocks(); idempotencyStore.clear(); orderStore.clear(); transactionQueue = Promise.resolve();
  customer.mockResolvedValue(null);
  notified.mockResolvedValue({ delivered: false, reason: 'not_configured' });
  verifyMiniApp.mockReturnValue({ id: '123', firstName: 'Fixture' });
  supply(createProduct());
});
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
  it('reads legacy identity aliases without exposing another customer history', async () => {
    customer.mockResolvedValue({ sub: 'telegram:canonical', identityUids: ['telegram:canonical', 'telegram:legacy'] });
    const queried: string[] = [];
    const where = vi.fn((_field: string, _operator: string, uid: string) => {
      queried.push(uid);
      return { orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) };
    });
    db.mockReturnValue({ collection: () => ({ where }) });
    expect((await GET()).status).toBe(200);
    expect(queried).toEqual(['telegram:canonical', 'telegram:legacy']);
    expect(queried).not.toContain('telegram:other-customer');
  });
  it.each(['unitPrice', 'price', 'lineTotal', 'wholesaleTiers'])('rejects client %s on a line before writes', async (field) => {
    expect((await POST(request([{ productId: 'product-1', quantity: 1, [field]: 1 }]))).status).toBe(400);
    expect(created).not.toHaveBeenCalled();
  });
  it.each(['testMode', 'suppressNotification', 'notificationDestination'])('rejects public notification control field %s', async (field) => {
    expect((await POST(request([{ productId: 'product-1', quantity: 1 }], { [field]: true }))).status).toBe(400);
    expect(created).not.toHaveBeenCalled();
    expect(notified).not.toHaveBeenCalled();
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
    expect(notified).toHaveBeenCalledTimes(1);
    expect((await second.json()).requestNumber).toBe((await first.json()).requestNumber);
  });
  it('replays a lost response after the Product becomes hidden', async () => {
    const first = await POST(request([{ productId: 'product-1', quantity: 1 }]));
    const receipt = await first.json();
    supply(createProduct({ status: 'hidden' }));
    const replay = await POST(request([{ productId: 'product-1', quantity: 1 }]));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(receipt);
    expect(created).toHaveBeenCalledTimes(1);
    expect(notified).toHaveBeenCalledTimes(1);
  });
  it('replays an intent written by the previous payload-hash format', async () => {
    const keyHash = createHash('sha256').update('test-checkout-intent-0001').digest('hex');
    const parsedInput = { ...base, notes: '', items: [{ productId: 'product-1', quantity: 1 }] };
    const payloadHash = createHash('sha256').update(JSON.stringify({
      customer: '+998901234567', input: parsedInput,
    })).digest('hex');
    idempotencyStore.set(keyHash, { payloadHash, requestId: 'legacy-order' });
    orderStore.set('legacy-order', {
      id: 'legacy-order', requestNumber: 'ORD-LEGACY', contactName: base.contactName,
      phone: '+998 90 123 45 67', phoneNormalized: '+998901234567', customerUid: 'phone:+998901234567',
      deliveryAddress: base.deliveryAddress, deliveryDate: base.deliveryDate, deliveryWindow: base.deliveryWindow,
      notes: '', items: [], status: 'new', currency: 'UZS', subtotal: 0, adjustment: 0, total: 0,
      revision: 1, auditTrail: [], createdAt: '2026-01-01T00:00:00.000Z',
    });
    supply(createProduct({ status: 'hidden' }));
    const replay = await POST(request([{ productId: 'product-1', quantity: 1 }]));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ id: 'legacy-order', requestNumber: 'ORD-LEGACY' });
    expect(created).not.toHaveBeenCalled();
    expect(notified).not.toHaveBeenCalled();
  });
  it('returns the same safe customer DTO for first response and replay', async () => {
    const first = await POST(request([{ productId: 'product-1', quantity: 1 }]));
    const firstBody = await first.json();
    const replayBody = await (await POST(request([{ productId: 'product-1', quantity: 1 }]))).json();
    for (const body of [firstBody, replayBody]) {
      expect(body).not.toHaveProperty('auditTrail');
      expect(body).not.toHaveProperty('customerUid');
      expect(body).not.toHaveProperty('notification');
      expect(body.items[0]).not.toHaveProperty('product');
      expect(body.items[0]).not.toHaveProperty('variant');
    }
    expect(replayBody).toEqual(firstBody);
  });
  it('rejects the same key for a changed intent or different customer identity', async () => {
    expect((await POST(request([{ productId: 'product-1', quantity: 1 }]))).status).toBe(201);
    const changed = await POST(request([{ productId: 'product-1', quantity: 2 }]));
    expect(changed.status).toBe(409);
    expect(await changed.json()).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    customer.mockResolvedValue({ sub: 'telegram:different', telegramId: 'different' });
    expect((await POST(request([{ productId: 'product-1', quantity: 1 }]))).status).toBe(409);
    expect(created).toHaveBeenCalledTimes(1);
    expect(notified).toHaveBeenCalledTimes(1);
  });
  it('atomically collapses concurrent identical requests and notification side effects', async () => {
    const [first, second] = await Promise.all([
      POST(request([{ productId: 'product-1', quantity: 1 }])),
      POST(request([{ productId: 'product-1', quantity: 1 }])),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(created).toHaveBeenCalledTimes(1);
    expect(notified).toHaveBeenCalledTimes(1);
  });
  it('does not mix a signed browser customer with another Mini App identity', async () => {
    customer.mockResolvedValue({ sub: 'telegram:123', telegramId: '123', name: 'A' });
    verifyMiniApp.mockReturnValue({ id: '456', firstName: 'B' });
    const response = await POST(request([{ productId: 'product-1', quantity: 1 }], { telegramInitData: 'signed-for-b' }));
    expect(response.status).toBe(409);
    expect(created).not.toHaveBeenCalled();
  });
  it('rejects invalid Mini App identity instead of silently downgrading to guest checkout', async () => {
    verifyMiniApp.mockImplementation(() => { throw new Error('bad signature'); });
    const response = await POST(request([{ productId: 'product-1', quantity: 1 }], { telegramInitData: 'tampered' }));
    expect(response.status).toBe(401);
    expect(created).not.toHaveBeenCalled();
  });
  it('keeps a browser Telegram session source distinct from Mini App source', async () => {
    customer.mockResolvedValue({ sub: 'telegram:123', telegramId: '123', name: 'A' });
    expect((await POST(request([{ productId: 'product-1', quantity: 1 }]))).status).toBe(201);
    expect(created.mock.calls[0][0]).toMatchObject({ source: 'web', customerUid: 'telegram:123' });
  });
  it('keeps an accepted request when Telegram delivery fails and records failure state', async () => {
    notified.mockRejectedValueOnce(new Error('Telegram unavailable'));
    const response = await POST(request([{ productId: 'product-1', quantity: 1 }]));
    expect(response.status).toBe(201);
    expect(created).toHaveBeenCalledTimes(1);
    expect(notified).toHaveBeenCalledTimes(1);
    expect(orderStore.get('new-order')?.notification).toMatchObject({ status: 'failed', reason: 'delivery_failed' });
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
