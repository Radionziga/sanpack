import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: db }));
import {
  issueCustomerSessionToken,
  revokeCustomerSession,
  verifyActiveCustomerSessionToken,
} from '@/lib/auth/customerSession';

const sessions = new Map<string, Record<string, unknown>>();

beforeEach(() => {
  vi.stubEnv('TELEGRAM_CONFIG_ENCRYPTION_KEY', 'test-only-key-not-a-production-secret');
  sessions.clear();
  db.mockReturnValue({
    collection: () => ({
      doc: (id: string) => ({
        get: async () => ({ exists: sessions.has(id), data: () => sessions.get(id) }),
        set: async (data: Record<string, unknown>) => sessions.set(id, { ...(sessions.get(id) || {}), ...data }),
        delete: async () => { sessions.delete(id); },
      }),
    }),
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('customer session lifecycle', () => {
  it('issues an independently revocable server-backed session', async () => {
    const token = await issueCustomerSessionToken({
      sub: 'telegram:123', telegramId: '123', name: 'Fixture', identityUids: ['telegram:123'],
    });
    const active = await verifyActiveCustomerSessionToken(token);
    expect(active).toMatchObject({ sub: 'telegram:123', telegramId: '123' });
    expect(active?.sessionId).toBeTruthy();
    await revokeCustomerSession(active);
    await expect(verifyActiveCustomerSessionToken(token)).resolves.toBeNull();
  });

  it('rejects a session record rebound to another customer', async () => {
    const token = await issueCustomerSessionToken({ sub: 'telegram:123', telegramId: '123', name: 'Fixture' });
    const active = await verifyActiveCustomerSessionToken(token);
    const record = [...sessions.values()][0];
    record.customerUid = 'telegram:attacker';
    await expect(verifyActiveCustomerSessionToken(token)).resolves.toBeNull();
    expect(active).not.toBeNull();
  });
});
