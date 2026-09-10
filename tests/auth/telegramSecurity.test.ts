import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TelegramMiniAppVerificationError, verifyTelegramInitData } from '@/lib/telegram/miniApp';
import { createCustomerSessionToken, verifyCustomerSessionToken } from '@/lib/auth/customerSession';
import {
  buildTelegramAuthorizationUrl,
  createTelegramLoginAttempt,
  createTelegramLoginFlowToken,
  verifyTelegramLoginFlowToken,
} from '@/lib/telegram/login';

const bot = 'fixture-bot-token';
function signed(ageSeconds = 0) {
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000) - ageSeconds), user: JSON.stringify({ id: 123, first_name: 'Fixture' }) });
  const data = [...params].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(bot).digest();
  params.set('hash', createHmac('sha256', secret).update(data).digest('hex'));
  return params.toString();
}
afterEach(() => vi.unstubAllEnvs());
describe('Telegram identity boundary', () => {
  it('binds OIDC authorization to signed state, PKCE, nonce and intended destination', async () => {
    vi.stubEnv('TELEGRAM_CONFIG_ENCRYPTION_KEY', 'test-only-key-not-a-production-secret');
    const attempt = createTelegramLoginAttempt('/ru/orders?from=profile#latest');
    const token = await createTelegramLoginFlowToken(attempt);
    await expect(verifyTelegramLoginFlowToken(token)).resolves.toMatchObject({
      state: attempt.state, nonce: attempt.nonce, codeVerifier: attempt.codeVerifier,
      returnTo: '/ru/orders?from=profile#latest',
    });
    const url = buildTelegramAuthorizationUrl({
      clientId: '123456', redirectUri: 'https://shop.example/api/auth/telegram/callback',
      state: attempt.state, nonce: attempt.nonce, codeChallenge: attempt.codeChallenge,
      requestPhone: false, allowBotMessages: false,
    });
    expect(url.searchParams.get('state')).toBe(attempt.state);
    expect(url.searchParams.get('nonce')).toBe(attempt.nonce);
    expect(url.searchParams.get('code_challenge')).toBe(attempt.codeChallenge);
  });
  it('accepts a signed user, rejects tampering, wrong bot and stale initData', () => {
    expect(verifyTelegramInitData(signed(), bot).id).toBe('123');
    expect(() => verifyTelegramInitData(signed().replace('123', '456'), bot)).toThrow();
    expect(() => verifyTelegramInitData(signed(), 'other-bot')).toThrow();
    expect(() => verifyTelegramInitData(signed(3601), bot)).toThrow();
  });
  it('includes Telegram\'s modern signature field in the bot-token HMAC input', () => {
    const params = new URLSearchParams({
      auth_date: String(Math.floor(Date.now() / 1000)),
      signature: 'public-key-signature-fixture',
      user: JSON.stringify({ id: 123, first_name: 'Fixture' }),
    });
    const data = [...params].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(bot).digest();
    params.set('hash', createHmac('sha256', secret).update(data).digest('hex'));
    expect(verifyTelegramInitData(params.toString(), bot).id).toBe('123');
  });
  it('classifies proof failures without embedding proof or identity data in the error', () => {
    try {
      verifyTelegramInitData(signed(), 'wrong-bot-token');
      throw new Error('expected verification failure');
    } catch (error) {
      expect(error).toBeInstanceOf(TelegramMiniAppVerificationError);
      expect((error as TelegramMiniAppVerificationError).code).toBe('signature_mismatch');
      expect((error as Error).message).not.toContain('123');
    }
  });
  it('rejects initData too far in the future and malformed signed user shapes', () => {
    expect(() => verifyTelegramInitData(signed(-61), bot)).toThrow();
    const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: -1 }) });
    const data = [...params].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(bot).digest();
    params.set('hash', createHmac('sha256', secret).update(data).digest('hex'));
    expect(() => verifyTelegramInitData(params.toString(), bot)).toThrow();
  });
  it('does not accept arbitrary phone/plain JSON as a customer session', async () => {
    vi.stubEnv('TELEGRAM_CONFIG_ENCRYPTION_KEY', 'test-only-key-not-a-production-secret');
    const token = await createCustomerSessionToken({ sub: 'telegram:123', telegramId: '123', name: 'Fixture', phone: '+998901234567' });
    expect((await verifyCustomerSessionToken(token))?.sub).toBe('telegram:123');
    expect(await verifyCustomerSessionToken(JSON.stringify({ phone: '+998901234567' }))).toBeNull();
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ sub: 'telegram:456', phone: '+998901234567' })).toString('base64url');
    expect(await verifyCustomerSessionToken(parts.join('.'))).toBeNull();
  });
});
