import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { cookie, verifyId, verifySession, grant } = vi.hoisted(() => ({ cookie: vi.fn(), verifyId: vi.fn(), verifySession: vi.fn(), grant: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: cookie }) }));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => ({ verifyIdToken: verifyId, verifySessionCookie: verifySession }),
  getAdminDb: () => ({ collection: (name: string) => {
    expect(name).toBe('admins');
    return { doc: (uid: string) => { expect(uid).toBe('user'); return { get: grant }; } };
  } }),
}));
import { getAdminSession } from '@/lib/auth/server';

beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('NODE_ENV', 'production');
  cookie.mockReturnValue({ value: 'signed-cookie' });
  verifySession.mockResolvedValue({ uid: 'user', email: 'user@example.com' });
  grant.mockResolvedValue({ exists: true, data: () => ({ active: true, role: 'super_admin' }) });
});
afterEach(() => vi.unstubAllEnvs());
describe('server admin session boundary', () => {
  it('verifies revocation and reads an explicit grant on every request', async () => {
    expect((await getAdminSession())?.role).toBe('super_admin');
    expect(verifySession).toHaveBeenCalledWith('signed-cookie', true);
    grant.mockResolvedValue({ exists: true, data: () => ({ active: false, role: 'super_admin' }) });
    expect(await getAdminSession()).toBeNull();
    expect(grant).toHaveBeenCalledTimes(2);
  });
  it('fails closed for Firebase users without grants and database outages', async () => {
    grant.mockResolvedValue({ exists: false });
    expect(await getAdminSession()).toBeNull();
    grant.mockRejectedValue(new Error('unavailable'));
    expect(await getAdminSession()).toBeNull();
  });
  it('never accepts a development local ID-token cookie in production', async () => {
    cookie.mockReturnValue({ value: 'local:token' });
    verifySession.mockRejectedValue(new Error('invalid cookie'));
    expect(await getAdminSession()).toBeNull();
    expect(verifyId).not.toHaveBeenCalled();
  });
  it('does not access Firebase without a session cookie', async () => {
    cookie.mockReturnValue(undefined);
    expect(await getAdminSession()).toBeNull();
    expect(verifySession).not.toHaveBeenCalled(); expect(grant).not.toHaveBeenCalled();
  });
});
