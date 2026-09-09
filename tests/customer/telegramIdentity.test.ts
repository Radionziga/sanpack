import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: db }));
import { getTelegramOidcIdentity, upsertTelegramCustomer } from '@/lib/customer/telegramIdentity';

const store = new Map<string, Record<string, unknown>>();
let beforeTransaction: (() => void) | undefined;

function reference(id: string) {
  return {
    id,
    get: async () => ({ exists: store.has(id), data: () => store.get(id) }),
    set: async (data: Record<string, unknown>) => store.set(id, { ...(store.get(id) || {}), ...data }),
  };
}

function database() {
  return {
    collection: () => ({
      where: (_field: string, _operator: string, value: string) => ({
        limit: () => ({
          get: async () => ({
            docs: [...store.entries()]
              .filter(([, data]) => data.telegramId === value)
              .map(([id, data]) => ({ id, data: () => data })),
          }),
        }),
      }),
      doc: reference,
    }),
    runTransaction: async <T>(callback: (transaction: {
      get: (ref: ReturnType<typeof reference>) => ReturnType<ReturnType<typeof reference>['get']>;
      set: (ref: ReturnType<typeof reference>, data: Record<string, unknown>) => void;
    }) => Promise<T>) => {
      beforeTransaction?.();
      beforeTransaction = undefined;
      return callback({
        get: (ref) => ref.get(),
        set: (ref, data) => { void ref.set(data); },
      });
    },
  };
}

beforeEach(() => { store.clear(); beforeTransaction = undefined; db.mockReturnValue(database()); });

describe('Telegram customer identity resolution', () => {
  it('uses Telegram user id across OIDC and Mini App while preserving an existing legacy uid', async () => {
    store.set('telegram:pairwise-subject', {
      uid: 'telegram:pairwise-subject', telegramId: '777', name: 'Edited customer', phone: '+998901112233',
    });
    const browser = await upsertTelegramCustomer(getTelegramOidcIdentity({
      sub: 'pairwise-subject', id: 777, name: 'Telegram Name', phone_number: '+998909999999', phone_number_verified: true,
    }));
    const miniApp = await upsertTelegramCustomer({ telegramId: '777', displayName: 'Telegram Name' });
    expect(browser.uid).toBe('telegram:pairwise-subject');
    expect(miniApp.uid).toBe(browser.uid);
    expect(miniApp.identityUids).toEqual(expect.arrayContaining([
      'telegram:pairwise-subject',
      'telegram:777',
    ]));
    expect(store.has('telegram:777')).toBe(false);
    expect(browser.name).toBe('Edited customer');
    expect(browser.phone).toBe('+998901112233');
    expect(store.get(browser.uid)).toMatchObject({ telegramDisplayName: 'Telegram Name', telegramPhone: '+998909999999' });
  });

  it('collects existing duplicate records as signed history aliases without merging production data', async () => {
    store.set('telegram:777', { uid: 'telegram:777', telegramId: '777', name: 'Canonical' });
    store.set('telegram:pairwise', { uid: 'telegram:pairwise', telegramId: '777', name: 'Legacy' });
    const customer = await upsertTelegramCustomer(getTelegramOidcIdentity({ sub: 'pairwise', id: 777, name: 'Telegram' }));
    expect(customer.uid).toBe('telegram:777');
    expect(customer.identityUids).toEqual(expect.arrayContaining(['telegram:777', 'telegram:pairwise']));
    expect(store.has('telegram:pairwise')).toBe(true);
  });

  it('does not overwrite a profile edit that races with a returning login', async () => {
    store.set('telegram:777', {
      uid: 'telegram:777', telegramId: '777', name: 'Earlier name', phone: '+998901111111',
    });
    beforeTransaction = () => {
      store.set('telegram:777', {
        ...store.get('telegram:777'), name: 'Concurrent edit', phone: '+998902222222',
      });
    };

    const customer = await upsertTelegramCustomer({ telegramId: '777', displayName: 'Telegram Name' });

    expect(customer).toMatchObject({ name: 'Concurrent edit', phone: '+998902222222' });
    expect(store.get('telegram:777')).toMatchObject({ name: 'Concurrent edit', phone: '+998902222222' });
  });

  it('requires the cross-flow Telegram user id claim from OIDC', () => {
    expect(() => getTelegramOidcIdentity({ sub: 'pairwise', name: 'No id' })).toThrow(/user id/);
  });
  it('does not treat an unverified OIDC phone claim as profile contact data', () => {
    const identity = getTelegramOidcIdentity({
      sub: 'pairwise', id: 777, name: 'Fixture', phone_number: '+998909999999', phone_number_verified: false,
    });
    expect(identity.phone).toBeUndefined();
  });
});
