import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { encryptSecret } from '@/lib/telegram/secrets';
import { issueCustomerSessionToken } from '@/lib/auth/customerSession';
import { getTelegramOidcIdentity, upsertTelegramCustomer } from '@/lib/customer/telegramIdentity';
import { createProduct } from '@/tests/fixtures/products';

const { notification } = vi.hoisted(() => ({ notification: vi.fn() }));
vi.mock('@/lib/telegram/notifications', () => ({
  notifyAboutNewOrder: (...args: unknown[]) => notification(...args),
  suppressTestOrderNotification: async () => ({ delivered: false, reason: 'suppressed_test' }),
}));

import { GET, POST } from '@/app/api/requests/route';

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const BOT_TOKEN = '123456:emulator-only-not-a-real-telegram-token';
const collections = [
  'customers', 'customerSessions', 'products', 'requests', 'requestIdempotency',
  'rateLimits', 'privateSettings',
];

async function clearCollection(name: string) {
  const snapshot = await getAdminDb().collection(name).get();
  if (snapshot.empty) return;
  const batch = getAdminDb().batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

function signedInitData(id: string) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: `emulator-${id}`,
    user: JSON.stringify({ id: Number(id), first_name: `Telegram ${id}`, username: `user_${id}` }),
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set('hash', createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

function orderRequest(idempotencyKey: string, options: { initData?: string; cookie?: string; extra?: object } = {}) {
  return new Request('https://shop.example/api/requests', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: JSON.stringify({
      contactName: 'Identity emulator', phone: '+998901234567',
      deliveryAddress: 'Emulator-only address', deliveryDate: '2099-01-01',
      deliveryWindow: '09:00-13:00', items: [{ productId: 'product-1', quantity: 1 }],
      ...(options.initData ? { telegramInitData: options.initData } : {}),
      ...(options.extra || {}),
    }),
  });
}

function sessionCookie(token: string) {
  return `__sanpack_customer=${encodeURIComponent(token)}`;
}

describe.runIf(emulatorEnabled)('proof-only Telegram checkout identity with Firestore emulator', () => {
  beforeAll(() => {
    process.env.TELEGRAM_CONFIG_ENCRYPTION_KEY = 'emulator-only-customer-session-key';
  });

  beforeEach(async () => {
    notification.mockReset();
    notification.mockResolvedValue({ delivered: true });
    await Promise.all(collections.map(clearCollection));
    const product = JSON.parse(JSON.stringify(createProduct({ price: 66_000 })));
    await getAdminDb().collection('products').doc(product.id).set(product);
    await getAdminDb().collection('privateSettings').doc('telegram').set({
      storefront: { enabled: true, tokenEncrypted: encryptSecret(BOT_TOKEN) },
    });
  });

  afterAll(async () => {
    await Promise.all(collections.map(clearCollection));
  });

  it('keeps a legacy primary across proof-only checkout, login, history and replay', async () => {
    const legacyUid = 'telegram:legacy-oidc-777';
    await getAdminDb().collection('customers').doc(legacyUid).set({
      uid: legacyUid, provider: 'telegram', telegramId: '777', name: 'Legacy customer',
      identityUids: [legacyUid], createdAt: '2026-01-01T00:00:00.000Z',
    });
    const key = 'emulator-proof-checkout-identity-0001';
    const first = await POST(orderRequest(key, { initData: signedInitData('777') }));
    expect(first.status).toBe(201);
    const receipt = await first.json();

    const storedOrder = (await getAdminDb().collection('requests').doc(receipt.id).get()).data();
    expect(storedOrder?.customerUid).toBe(legacyUid);
    expect((await getAdminDb().collection('customers').doc('telegram:777').get()).exists).toBe(false);

    const login = await upsertTelegramCustomer(getTelegramOidcIdentity({
      sub: 'legacy-oidc-777', id: 777, name: 'Legacy customer',
    }));
    expect(login.uid).toBe(legacyUid);
    expect(login.identityUids).toEqual(expect.arrayContaining([legacyUid, 'telegram:777']));
    const token = await issueCustomerSessionToken({
      sub: login.uid, telegramId: login.telegramId, name: login.name,
      identityUids: login.identityUids,
    });
    const cookie = sessionCookie(token);

    const history = await GET(new Request('https://shop.example/api/requests', { headers: { cookie } }));
    expect(history.status).toBe(200);
    expect(await history.json()).toEqual([receipt]);

    const replay = await POST(orderRequest(key, { cookie }));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(receipt);
    expect(notification).toHaveBeenCalledTimes(1);
    expect((await getAdminDb().collection('requests').get()).size).toBe(1);
  });

  it('does not accept another account, phone or client-forged aliases as ownership', async () => {
    const key = 'emulator-proof-checkout-identity-0002';
    const first = await POST(orderRequest(key, { initData: signedInitData('777') }));
    expect(first.status).toBe(201);

    const other = await upsertTelegramCustomer({ telegramId: '888', displayName: 'Other customer' });
    const otherToken = await issueCustomerSessionToken({
      sub: other.uid, telegramId: other.telegramId, name: other.name,
      identityUids: other.identityUids,
    });
    const otherCookie = sessionCookie(otherToken);
    expect((await POST(orderRequest(key, { cookie: otherCookie }))).status).toBe(409);
    const otherHistory = await GET(new Request('https://shop.example/api/requests', {
      headers: { cookie: otherCookie },
    }));
    expect(await otherHistory.json()).toEqual([]);

    const forged = await POST(orderRequest('emulator-proof-checkout-identity-0003', {
      cookie: otherCookie,
      extra: { customerUid: 'telegram:777', identityUids: ['telegram:777'] },
    }));
    expect(forged.status).toBe(400);
    expect(notification).toHaveBeenCalledTimes(1);
  });
});
