import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProduct } from '@/tests/fixtures/products';

const { customerSession, notification, loggedError } = vi.hoisted(() => ({
  customerSession: vi.fn(),
  notification: vi.fn(),
  loggedError: vi.fn(),
}));

vi.mock('@/lib/auth/customerSession', () => ({ getCustomerSession: customerSession }));
vi.mock('@/lib/telegram/notifications', () => ({
  notifyAboutNewOrder: (...args: unknown[]) => notification(...args),
  suppressTestOrderNotification: async () => ({ delivered: false, reason: 'suppressed_test' }),
}));
vi.mock('@/lib/observability/logger', () => ({ logError: (...args: unknown[]) => loggedError(...args) }));

import { getAdminDb } from '@/lib/firebase/admin';
import { GET, POST } from '@/app/api/requests/route';

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const collections = ['products', 'requests', 'requestIdempotency', 'rateLimits'];

function checkoutRequest(idempotencyKey: string) {
  return new Request('https://shop.example/api/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
    body: JSON.stringify({
      contactName: 'Emulator customer',
      phone: '+998901234567',
      deliveryAddress: 'Emulator-only address',
      deliveryDate: '2099-01-01',
      deliveryWindow: '09:00-13:00',
      items: [{ productId: 'product-1', quantity: 1 }],
    }),
  });
}

async function clearCollection(name: string) {
  const snapshot = await getAdminDb().collection(name).get();
  if (snapshot.empty) return;
  const batch = getAdminDb().batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

describe.runIf(emulatorEnabled)('request handler with the Firestore emulator', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    customerSession.mockResolvedValue(null);
    notification.mockResolvedValue({ delivered: true });
    await Promise.all(collections.map(clearCollection));
    const product = JSON.parse(JSON.stringify(createProduct({ price: 66_000 })));
    await getAdminDb().collection('products').doc(product.id).set(product);
  });

  it('atomically persists one canonical request and one notification for concurrent retries', async () => {
    const [first, second] = await Promise.all([
      POST(checkoutRequest('emulator-concurrent-intent-0001')),
      POST(checkoutRequest('emulator-concurrent-intent-0001')),
    ]);

    expect(loggedError.mock.calls).toEqual([]);
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(notification).toHaveBeenCalledTimes(1);
    const orders = await getAdminDb().collection('requests').get();
    expect(orders.size).toBe(1);
    expect(orders.docs[0].data()).toMatchObject({
      total: 66_000,
      customerUid: 'phone:+998901234567',
      notification: { status: 'delivered', delivered: true },
    });
    const receipts = await Promise.all([first.json(), second.json()]);
    expect(receipts[0]).toEqual(receipts[1]);
    expect(receipts[0]).not.toHaveProperty('auditTrail');
    expect(receipts[0]).not.toHaveProperty('notification');
  });

  it('replays the saved receipt after mutable catalog state changes', async () => {
    const first = await POST(checkoutRequest('emulator-replay-intent-0002'));
    const receipt = await first.json();
    expect(loggedError.mock.calls).toEqual([]);
    await getAdminDb().collection('products').doc('product-1').update({ status: 'hidden' });

    const replay = await POST(checkoutRequest('emulator-replay-intent-0002'));

    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(receipt);
    expect(notification).toHaveBeenCalledTimes(1);
    expect((await getAdminDb().collection('requests').get()).size).toBe(1);
  });

  it('returns only the signed customer history and never phone-matches another identity', async () => {
    customerSession.mockResolvedValue({ sub: 'telegram:customer-a', identityUids: ['telegram:customer-a'] });
    const created = await POST(checkoutRequest('emulator-customer-a-intent-0003'));
    expect(loggedError.mock.calls).toEqual([]);
    expect(created.status).toBe(201);

    customerSession.mockResolvedValue({ sub: 'telegram:customer-b', identityUids: ['telegram:customer-b'] });
    const otherHistory = await GET();
    expect(await otherHistory.json()).toEqual([]);

    customerSession.mockResolvedValue({ sub: 'telegram:customer-a', identityUids: ['telegram:customer-a'] });
    const ownerHistory = await GET();
    const body = await ownerHistory.json();
    expect(body).toHaveLength(1);
    expect(body[0]).not.toHaveProperty('customerUid');
    expect(body[0]).not.toHaveProperty('notification');
  });
});
