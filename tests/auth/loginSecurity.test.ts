import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { verify, authorize, mint, limit } = vi.hoisted(() => ({ verify: vi.fn(), authorize: vi.fn(), mint: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminAuth: () => ({ verifyIdToken: verify, createSessionCookie: mint }) }));
vi.mock('@/lib/auth/server', () => ({ SESSION_COOKIE_NAME: '__session', SESSION_MAX_AGE_MS: 432000000, verifyAdminToken: authorize }));
vi.mock('@/lib/security/distributedRateLimit', () => ({ checkDistributedRateLimit: limit }));
import { POST } from '@/app/api/auth/session/route';

beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('NODE_ENV', 'production');
  limit.mockResolvedValue({ allowed: true });
  verify.mockResolvedValue({ uid: 'user', auth_time: Date.now() / 1000 });
  authorize.mockResolvedValue({ uid: 'user', role: 'super_admin' }); mint.mockResolvedValue('signed-cookie');
});
afterEach(() => vi.unstubAllEnvs());
const request = (origin = 'https://shop.example') => new Request('https://shop.example/api/auth/session', {
  method: 'POST', headers: { origin }, body: JSON.stringify({ idToken: 'fixture-token'.repeat(20) }),
});
describe('admin login security', () => {
  it('rejects login CSRF before token verification or rate-limit writes', async () => {
    expect((await POST(request('https://evil.example'))).status).toBe(403);
    expect(verify).not.toHaveBeenCalled(); expect(limit).not.toHaveBeenCalled();
  });
  it('never mints a cookie for a valid identity without an admin grant', async () => {
    authorize.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(403); expect(mint).not.toHaveBeenCalled();
  });
  it.each([undefined, Date.now() / 1000 - 301, Date.now() / 1000 + 600])('rejects stale/absent/invalid auth_time %s', async (auth_time) => {
    verify.mockResolvedValue({ uid: 'user', auth_time });
    expect((await POST(request())).status).toBe(401); expect(mint).not.toHaveBeenCalled();
  });
  it('issues a secure HttpOnly SameSite cookie only for a recent authorized identity', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/);
    expect(response.headers.get('set-cookie')).toMatch(/Secure/);
    expect(response.headers.get('set-cookie')).toMatch(/SameSite=lax/i);
    expect(verify).toHaveBeenCalledWith(expect.any(String), true);
  });
});
