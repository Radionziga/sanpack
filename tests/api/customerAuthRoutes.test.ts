import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(), settings: vi.fn(), verifyFlow: vi.fn(), exchange: vi.fn(),
  verifyIdToken: vi.fn(), upsert: vi.fn(), issue: vi.fn(), verifyInitData: vi.fn(),
  logError: vi.fn(),
}));
vi.mock('@/lib/observability/logger', () => ({ logError: (...args: unknown[]) => mocks.logError(...args) }));
vi.mock('@/lib/security/distributedRateLimit', () => ({ checkDistributedRateLimit: (...args: unknown[]) => mocks.rateLimit(...args) }));
vi.mock('@/lib/telegram/settings', () => ({ getTelegramPrivateSettings: () => mocks.settings() }));
vi.mock('@/lib/telegram/secrets', () => ({ canDecryptSecret: () => true, decryptSecret: () => 'decrypted' }));
vi.mock('@/lib/telegram/login', async (original) => {
  const actual = await original<typeof import('@/lib/telegram/login')>();
  return {
    ...actual,
    verifyTelegramLoginFlowToken: (...args: unknown[]) => mocks.verifyFlow(...args),
    exchangeTelegramCode: (...args: unknown[]) => mocks.exchange(...args),
    verifyTelegramIdToken: (...args: unknown[]) => mocks.verifyIdToken(...args),
  };
});
vi.mock('@/lib/customer/telegramIdentity', async (original) => {
  const actual = await original<typeof import('@/lib/customer/telegramIdentity')>();
  return { ...actual, upsertTelegramCustomer: (...args: unknown[]) => mocks.upsert(...args) };
});
vi.mock('@/lib/auth/customerSession', async (original) => {
  const actual = await original<typeof import('@/lib/auth/customerSession')>();
  return { ...actual, issueCustomerSessionToken: (...args: unknown[]) => mocks.issue(...args) };
});
vi.mock('@/lib/telegram/miniApp', () => ({ verifyTelegramInitData: (...args: unknown[]) => mocks.verifyInitData(...args) }));
import { GET as callback } from '@/app/api/auth/telegram/callback/route';
import { POST as miniApp } from '@/app/api/auth/telegram/mini-app/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
  mocks.settings.mockResolvedValue({
    login: { enabled: true, clientId: '123456', clientSecretEncrypted: 'encrypted', redirectUri: 'https://shop.example/api/auth/telegram/callback' },
    storefront: { enabled: true, tokenEncrypted: 'encrypted' }, notifications: { enabled: false },
  });
  mocks.verifyFlow.mockResolvedValue({ state: 'state', nonce: 'nonce', codeVerifier: 'verifier', returnTo: '/ru/orders?from=login#latest' });
  mocks.exchange.mockResolvedValue({ id_token: 'id-token' });
  mocks.verifyIdToken.mockResolvedValue({ sub: 'pairwise', id: 777, name: 'Telegram User', nonce: 'nonce' });
  mocks.upsert.mockResolvedValue({ uid: 'telegram:777', identityUids: ['telegram:777', 'telegram:pairwise'], telegramId: '777', name: 'Saved User', phone: '+998901234567' });
  mocks.issue.mockResolvedValue('customer-session-token');
  mocks.verifyInitData.mockReturnValue({ id: '777', firstName: 'Telegram', lastName: 'User' });
});

describe('customer Telegram auth handlers', () => {
  it('completes PKCE callback into the resolved cross-flow identity and preserves return destination', async () => {
    const response = await callback(new Request('https://shop.example/api/auth/telegram/callback?state=state&code=code', {
      headers: { cookie: '__telegram_login_flow=flow-token' },
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://shop.example/ru/orders?from=login&telegramAuth=success#latest');
    expect(mocks.verifyIdToken).toHaveBeenCalledWith('id-token', '123456', 'nonce');
    expect(mocks.issue).toHaveBeenCalledWith(expect.objectContaining({
      sub: 'telegram:777', telegramId: '777', identityUids: ['telegram:777', 'telegram:pairwise'], name: 'Saved User',
    }));
    expect(response.headers.get('set-cookie')).toContain('__sanpack_customer=customer-session-token');
  });

  it('logs only the safe callback stage when Telegram token exchange fails', async () => {
    mocks.exchange.mockRejectedValueOnce(new Error('sensitive upstream response'));
    const response = await callback(new Request('https://shop.example/api/auth/telegram/callback?state=state&code=code', {
      headers: { cookie: '__telegram_login_flow=flow-token' },
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('telegramAuth=error');
    expect(mocks.logError).toHaveBeenCalledWith(
      'Telegram login callback failed.',
      expect.any(Error),
      { stage: 'token_exchange' },
    );
  });

  it('creates Mini App session through the same resolved customer identity', async () => {
    const response = await miniApp(new Request('https://shop.example/api/auth/telegram/mini-app', {
      method: 'POST', body: JSON.stringify({ initData: 'signed-init-data' }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ telegramId: '777', displayName: 'Telegram User' }));
    expect(mocks.issue).toHaveBeenCalledWith(expect.objectContaining({ sub: 'telegram:777', telegramId: '777' }));
    expect(response.headers.get('set-cookie')).toContain('__sanpack_customer=customer-session-token');
  });

  it('does not mint a Mini App session from an invalid proof', async () => {
    mocks.verifyInitData.mockImplementation(() => { throw new Error('bad signature'); });
    const response = await miniApp(new Request('https://shop.example/api/auth/telegram/mini-app', {
      method: 'POST', body: JSON.stringify({ initData: 'tampered-init-data' }),
    }));
    expect(response.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.issue).not.toHaveBeenCalled();
  });
});
