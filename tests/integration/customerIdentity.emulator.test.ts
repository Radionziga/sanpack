import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  issueCustomerSessionToken,
  revokeCustomerSession,
  verifyActiveCustomerSessionToken,
} from '@/lib/auth/customerSession';
import { getTelegramOidcIdentity, upsertTelegramCustomer } from '@/lib/customer/telegramIdentity';

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

async function clearCollection(name: string) {
  const snapshot = await getAdminDb().collection(name).get();
  if (snapshot.empty) return;
  const batch = getAdminDb().batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

describe.runIf(emulatorEnabled)('customer identity with the Firestore emulator', () => {
  beforeAll(async () => {
    process.env.TELEGRAM_CONFIG_ENCRYPTION_KEY = 'emulator-only-customer-session-key';
    await Promise.all(['customers', 'customerSessions'].map(clearCollection));
  });

  afterAll(async () => {
    await Promise.all(['customers', 'customerSessions'].map(clearCollection));
  });

  it('resolves browser OIDC and Mini App proofs to one customer and preserves profile edits', async () => {
    const browser = await upsertTelegramCustomer(getTelegramOidcIdentity({
      sub: 'oidc-pairwise-subject',
      id: 777,
      name: 'Provider name',
      phone_number: '+998901111111',
      phone_number_verified: true,
    }));
    await getAdminDb().collection('customers').doc(browser.uid).update({
      name: 'Edited customer',
      phone: '+998902222222',
    });

    const miniApp = await upsertTelegramCustomer({ telegramId: '777', displayName: 'Provider name changed' });

    expect(miniApp).toMatchObject({
      uid: browser.uid,
      telegramId: '777',
      name: 'Edited customer',
      phone: '+998902222222',
    });
    expect(miniApp.identityUids).toContain(browser.uid);
    const stored = (await getAdminDb().collection('customers').doc(browser.uid).get()).data();
    expect(stored).toMatchObject({
      name: 'Edited customer',
      phone: '+998902222222',
      telegramDisplayName: 'Provider name changed',
    });
  });

  it('issues, verifies and revokes one independently backed customer session', async () => {
    const token = await issueCustomerSessionToken({
      sub: 'telegram:777',
      telegramId: '777',
      name: 'Session customer',
      identityUids: ['telegram:777', 'telegram:legacy-subject'],
    });
    const active = await verifyActiveCustomerSessionToken(token);
    expect(active).toMatchObject({ sub: 'telegram:777', telegramId: '777' });
    expect(active?.sessionId).toBeTruthy();

    await revokeCustomerSession(active);

    await expect(verifyActiveCustomerSessionToken(token)).resolves.toBeNull();
  });

  it('concurrently resolves one new Telegram account to one canonical profile', async () => {
    const [browser, miniApp] = await Promise.all([
      upsertTelegramCustomer(getTelegramOidcIdentity({
        sub: 'pairwise-999', id: 999, name: 'Browser identity',
      })),
      upsertTelegramCustomer({ telegramId: '999', displayName: 'Mini identity' }),
    ]);
    expect(browser.uid).toBe('telegram:999');
    expect(miniApp.uid).toBe('telegram:999');
    expect(browser.identityUids).toContain('telegram:999');
    expect(miniApp.identityUids).toContain('telegram:999');
    const matches = await getAdminDb().collection('customers').where('telegramId', '==', '999').get();
    expect(matches.docs.map((document) => document.id)).toEqual(['telegram:999']);
  });
});
