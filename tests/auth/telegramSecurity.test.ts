import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTelegramInitData } from '@/lib/telegram/miniApp';
import { createCustomerSessionToken, verifyCustomerSessionToken } from '@/lib/auth/customerSession';

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
  it('accepts a signed user, rejects tampering, wrong bot and stale initData', () => {
    expect(verifyTelegramInitData(signed(), bot).id).toBe('123');
    expect(() => verifyTelegramInitData(signed().replace('123', '456'), bot)).toThrow();
    expect(() => verifyTelegramInitData(signed(), 'other-bot')).toThrow();
    expect(() => verifyTelegramInitData(signed(3601), bot)).toThrow();
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
