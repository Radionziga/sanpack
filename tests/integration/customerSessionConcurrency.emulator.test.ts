import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  createCustomerSessionToken,
  issueCustomerSessionToken,
  verifyActiveCustomerSessionToken,
  verifyCustomerSessionToken,
} from '@/lib/auth/customerSession';
import { DELETE as logout, GET as getProfile, PUT as updateProfile } from '@/app/api/auth/customer/route';
import { GET as getHistory } from '@/app/api/requests/route';

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const collections = ['customers', 'customerSessions', 'requests'];

async function clearCollection(name: string) {
  const snapshot = await getAdminDb().collection(name).get();
  if (snapshot.empty) return;
  const batch = getAdminDb().batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

function cookie(token: string) {
  return `${CUSTOMER_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

async function newSession() {
  const token = await issueCustomerSessionToken({
    sub: 'telegram:777', telegramId: '777', name: 'Session customer',
    identityUids: ['telegram:777'], phone: '+998901111111',
  });
  return { token, session: (await verifyCustomerSessionToken(token))! };
}

function delayedProfileRequest(token: string) {
  const body = JSON.stringify({
    name: 'Concurrent profile', phone: '+998902222222', company: '', address: '', inn: '',
  });
  let release!: () => void;
  let signalRead!: () => void;
  const readStarted = new Promise<void>((resolve) => { signalRead = resolve; });
  const released = new Promise<void>((resolve) => { release = resolve; });
  let delivered = false;
  const reader = {
    async read() {
      if (delivered) return { done: true as const, value: undefined };
      signalRead();
      await released;
      delivered = true;
      return { done: false as const, value: new TextEncoder().encode(body) };
    },
    async cancel() {},
    releaseLock() {},
  };
  const request = {
    url: 'https://shop.example/api/auth/customer',
    headers: new Headers({ cookie: cookie(token), 'content-type': 'application/json' }),
    body: { getReader: () => reader },
  } as unknown as Request;
  return { request, readStarted, release };
}

describe.runIf(emulatorEnabled)('customer session handler concurrency with Firestore emulator', () => {
  beforeAll(async () => {
    process.env.TELEGRAM_CONFIG_ENCRYPTION_KEY = 'emulator-only-customer-session-key';
  });

  beforeEach(async () => {
    await Promise.all(collections.map(clearCollection));
  });

  afterAll(async () => {
    await Promise.all(collections.map(clearCollection));
  });

  it('does not report logout success or clear the cookie when Firestore revocation fails', async () => {
    const { token } = await newSession();
    const prototype = Object.getPrototypeOf(getAdminDb().collection('customerSessions').doc('probe')) as {
      delete: () => Promise<unknown>;
    };
    const deletion = vi.spyOn(prototype, 'delete').mockRejectedValueOnce(new Error('emulator deletion unavailable'));

    const response = await logout(new Request('https://shop.example/api/auth/customer', {
      method: 'DELETE', headers: { cookie: cookie(token) },
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
    await expect(verifyActiveCustomerSessionToken(token)).resolves.not.toBeNull();
    deletion.mockRestore();
  });

  it('does not resurrect a session when logout wins after PUT authentication', async () => {
    const { token, session } = await newSession();
    await getAdminDb().collection('customers').doc(session.sub).set({ name: 'Before update' });
    const delayed = delayedProfileRequest(token);
    const pendingUpdate = updateProfile(delayed.request);
    await delayed.readStarted;

    const logoutResponse = await logout(new Request('https://shop.example/api/auth/customer', {
      method: 'DELETE', headers: { cookie: cookie(token) },
    }));
    expect(logoutResponse.status).toBe(200);
    delayed.release();

    const updateResponse = await pendingUpdate;
    expect(updateResponse.status).toBe(401);
    expect(updateResponse.headers.get('set-cookie')).toContain(`${CUSTOMER_SESSION_COOKIE_NAME}=;`);
    await expect(verifyActiveCustomerSessionToken(token)).resolves.toBeNull();
    const stored = await getAdminDb().collection('customers').doc(session.sub).get();
    expect(stored.data()?.name).toBe('Before update');
  });

  it('linearizes concurrent profile refresh and logout with a revoked final state', async () => {
    const { token } = await newSession();
    const updateRequest = new Request('https://shop.example/api/auth/customer', {
      method: 'PUT',
      headers: { cookie: cookie(token), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Racing profile', phone: '+998904444444', company: '', address: '', inn: '' }),
    });
    const logoutRequest = new Request('https://shop.example/api/auth/customer', {
      method: 'DELETE', headers: { cookie: cookie(token) },
    });
    const [updateResponse, logoutResponse] = await Promise.all([
      updateProfile(updateRequest),
      logout(logoutRequest),
    ]);
    expect([200, 401]).toContain(updateResponse.status);
    expect(logoutResponse.status).toBe(200);
    await expect(verifyActiveCustomerSessionToken(token)).resolves.toBeNull();
  });

  it('rejects expired and revoked records from protected handlers', async () => {
    const { token, session } = await newSession();
    const id = createHash('sha256').update(session.sessionId!).digest('hex');
    const reference = getAdminDb().collection('customerSessions').doc(id);
    await reference.update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });

    expect((await getHistory(new Request('https://shop.example/api/requests', {
      headers: { cookie: cookie(token) },
    }))).status).toBe(401);

    const fresh = await newSession();
    await logout(new Request('https://shop.example/api/auth/customer', {
      method: 'DELETE', headers: { cookie: cookie(fresh.token) },
    }));
    expect((await getProfile(new Request('https://shop.example/api/auth/customer', {
      headers: { cookie: cookie(fresh.token) },
    }))).status).toBe(200);
    expect(await (await getProfile(new Request('https://shop.example/api/auth/customer', {
      headers: { cookie: cookie(fresh.token) },
    }))).json()).toMatchObject({ authenticated: false, customer: null });
  });

  it('keeps the legacy bridge bounded and does not refresh it into a new session', async () => {
    const token = await createCustomerSessionToken({
      sub: 'telegram:legacy', telegramId: '777', name: 'Legacy customer',
      identityUids: ['telegram:legacy', 'telegram:777'],
    });
    const response = await updateProfile(new Request('https://shop.example/api/auth/customer', {
      method: 'PUT',
      headers: { cookie: cookie(token), 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Legacy edited', phone: '+998903333333', company: '', address: '', inn: '' }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect((await getAdminDb().collection('customerSessions').get()).empty).toBe(true);

    const logoutResponse = await logout(new Request('https://shop.example/api/auth/customer', {
      method: 'DELETE', headers: { cookie: cookie(token) },
    }));
    expect(await logoutResponse.json()).toMatchObject({ success: true, revocation: 'legacy_local_only' });
    expect(logoutResponse.headers.get('set-cookie')).toContain(`${CUSTOMER_SESSION_COOKIE_NAME}=;`);
    // A separately preserved legacy token remains cryptographically usable
    // until its original JWT exp; the API never claims server revocation.
    await expect(verifyActiveCustomerSessionToken(token)).resolves.not.toBeNull();
  });
});
