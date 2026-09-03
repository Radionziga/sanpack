import { describe, expect, it, vi } from 'vitest';
const { counters } = vi.hoisted(() => ({ counters: new Map<string, { count: number }>() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: () => ({
  collection: () => ({ doc: (id: string) => id }),
  runTransaction: (fn: (tx: unknown) => unknown) => fn({
    get: async (id: string) => ({ data: () => counters.get(id) }),
    set: (id: string, data: { count: number }) => counters.set(id, data),
  }),
}) }));
import { checkDistributedRateLimit, clientFingerprint, rateLimitBucket, trustedClientAddress } from '@/lib/security/distributedRateLimit';

describe('rateLimitBucket', () => {
  it('keeps requests in one deterministic window bucket', () => {
    const first = rateLimitBucket('generate', 'client', 61_000, 60_000);
    const second = rateLimitBucket('generate', 'client', 119_999, 60_000);
    expect(first).toEqual(second);
    expect(first.resetAt).toBe(120_000);
  });

  it('separates scopes and windows', () => {
    expect(rateLimitBucket('a', 'client', 59_999, 60_000).id)
      .not.toBe(rateLimitBucket('b', 'client', 59_999, 60_000).id);
    expect(rateLimitBucket('a', 'client', 59_999, 60_000).id)
      .not.toBe(rateLimitBucket('a', 'client', 60_000, 60_000).id);
  });

  it('cannot reset a client allowance by changing User-Agent', async () => {
    counters.clear();
    const request = (agent: string) => new Request('https://shop.example', { headers: { 'x-forwarded-for': '192.0.2.1', 'user-agent': agent } });
    expect(clientFingerprint(request('a'))).toBe(clientFingerprint(request('b')));
    expect((await checkDistributedRateLimit(request('a'), 'test', 1, 60_000)).allowed).toBe(true);
    expect((await checkDistributedRateLimit(request('b'), 'test', 1, 60_000)).allowed).toBe(false);
  });
  it('does not trust forwarded headers by default and always shares a public ceiling', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
    expect(trustedClientAddress(new Request('https://shop.example', { headers: { 'x-forwarded-for': '192.0.2.1' } }))).toBeNull();
    expect(clientFingerprint(new Request('https://shop.example', { headers: { 'x-forwarded-for': '192.0.2.1' } })))
      .toBe(clientFingerprint(new Request('https://shop.example', { headers: { 'x-forwarded-for': '203.0.113.2' } })));
  });
  it('uses one explicitly configured single-IP header but rejects chains', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'x-verified-client-ip');
    expect(trustedClientAddress(new Request('https://shop.example', { headers: { 'x-verified-client-ip': '192.0.2.1' } }))).toBe('192.0.2.1');
    expect(trustedClientAddress(new Request('https://shop.example', { headers: { 'x-verified-client-ip': '192.0.2.1, 203.0.113.2' } }))).toBeNull();
  });
  it('shares a global budget across IPs and returns Retry-After', async () => {
    counters.clear();
    const request = (ip: string) => new Request('https://shop.example', { headers: { 'x-forwarded-for': ip } });
    expect((await checkDistributedRateLimit(request('192.0.2.1'), 'daily', 1, 86_400_000, 'global')).allowed).toBe(true);
    const blocked = await checkDistributedRateLimit(request('192.0.2.2'), 'daily', 1, 86_400_000, 'global');
    expect(blocked.allowed).toBe(false); expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(counters.size).toBe(1);
  });
});
