import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProduct } from '@/tests/fixtures/products';

const { adminSession, db, liveNotify, testSink } = vi.hoisted(() => ({
  adminSession: vi.fn(), db: vi.fn(), liveNotify: vi.fn(), testSink: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({ getAdminSession: adminSession }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: db }));
vi.mock('@/lib/security/distributedRateLimit', () => ({ checkDistributedRateLimit: async () => ({ allowed: true, retryAfter: 0 }) }));
vi.mock('@/lib/telegram/notifications', () => ({
  notifyAboutNewOrder: (...args: unknown[]) => liveNotify(...args),
  suppressTestOrderNotification: (...args: unknown[]) => testSink(...args),
}));
import { DELETE, GET, POST } from '@/app/api/admin/order-tests/route';

const stores = new Map<string, Map<string, Record<string, unknown>>>();
let autoId = 0;
let transactionQueue = Promise.resolve();

function collectionStore(name: string) {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name)!;
}

function createDatabase() {
  const collection = (name: string) => ({
    doc: (providedId?: string) => {
      const id = providedId || `${name}-${++autoId}`;
      const store = collectionStore(name);
      return {
        id,
        kind: name,
        get: async () => ({ id, exists: store.has(id), data: () => store.get(id) }),
        update: async (patch: Record<string, unknown>) => store.set(id, { ...(store.get(id) || {}), ...patch }),
      };
    },
    orderBy: () => ({
      limit: () => ({
        get: async () => ({
          docs: [...collectionStore(name).entries()].map(([id, data]) => ({ id, data: () => data })),
        }),
      }),
    }),
  });
  return {
    collection,
    runTransaction: async (callback: (transaction: {
      get: (reference: { get: () => Promise<unknown> }) => Promise<unknown>;
      create: (reference: { id: string; kind: string }, data: Record<string, unknown>) => void;
      delete: (reference: { id: string; kind: string }) => void;
    }) => Promise<unknown>) => {
      const previous = transactionQueue;
      let release: () => void = () => undefined;
      transactionQueue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        return await callback({
          get: (reference) => reference.get(),
          create: (reference, data) => collectionStore(reference.kind).set(reference.id, data),
          delete: (reference) => { collectionStore(reference.kind).delete(reference.id); },
        });
      } finally { release(); }
    },
  };
}

function createRequest(key = 'isolated-test-key-0001', quantity = 1) {
  return new Request('https://shop.example/api/admin/order-tests', {
    method: 'POST',
    headers: { origin: 'https://shop.example', 'content-type': 'application/json' },
    body: JSON.stringify({
      confirmation: 'CREATE_ISOLATED_TEST_REQUEST',
      idempotencyKey: key,
      items: [{ productId: 'product-1', quantity }],
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks(); stores.clear(); autoId = 0; transactionQueue = Promise.resolve();
  adminSession.mockResolvedValue({ uid: 'operator-1', role: 'sales_manager', email: 'operator@example.com' });
  liveNotify.mockResolvedValue({ delivered: true });
  testSink.mockResolvedValue({ delivered: false, reason: 'suppressed_test' });
  collectionStore('products').set('product-1', { ...createProduct() });
  db.mockReturnValue(createDatabase());
});

describe('isolated order and notification smoke workflow', () => {
  it('requires an authenticated order operator', async () => {
    adminSession.mockResolvedValueOnce(null);
    expect((await POST(createRequest())).status).toBe(401);
    adminSession.mockResolvedValueOnce({ uid: 'viewer', role: 'viewer' });
    expect((await POST(createRequest())).status).toBe(403);
  });

  it('uses canonical pricing in isolated collections and never calls Telegram', async () => {
    const response = await POST(createRequest());
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      requestNumber: expect.stringMatching(/^TEST-/),
      total: 100,
      notification: { status: 'suppressed', channel: 'test_sink', reason: 'suppressed_test' },
      test: { isolated: true, createdBy: 'operator-1' },
    });
    expect(body).not.toHaveProperty('auditTrail');
    expect(body).not.toHaveProperty('customerUid');
    expect(collectionStore('requests').size).toBe(0);
    expect(collectionStore('testRequests').size).toBe(1);
    expect(liveNotify).not.toHaveBeenCalled();
    expect(testSink).toHaveBeenCalledTimes(1);
  });

  it('replays one test intent without duplicate record or notification side effect', async () => {
    expect((await POST(createRequest())).status).toBe(201);
    expect((await POST(createRequest())).status).toBe(200);
    expect(collectionStore('testRequests').size).toBe(1);
    expect(testSink).toHaveBeenCalledTimes(1);
    expect((await POST(createRequest('isolated-test-key-0001', 2))).status).toBe(409);
  });

  it('lists only isolated records and deletes exactly one confirmed test with its intent', async () => {
    const created = await (await POST(createRequest())).json();
    const listed = await GET();
    expect(listed.status).toBe(200);
    expect(await listed.json()).toHaveLength(1);

    const mismatch = await DELETE(new Request('https://shop.example/api/admin/order-tests', {
      method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE_ISOLATED_TEST_REQUEST', requestId: created.id, requestNumber: 'TEST-WRONG' }),
    }));
    expect(mismatch.status).toBe(409);
    expect(collectionStore('testRequests').size).toBe(1);

    const removed = await DELETE(new Request('https://shop.example/api/admin/order-tests', {
      method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE_ISOLATED_TEST_REQUEST', requestId: created.id, requestNumber: created.requestNumber }),
    }));
    expect(removed.status).toBe(200);
    expect(collectionStore('testRequests').size).toBe(0);
    expect(collectionStore('testRequestIdempotency').size).toBe(0);
  });
});
