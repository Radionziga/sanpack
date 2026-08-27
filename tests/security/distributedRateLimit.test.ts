import { describe, expect, it } from 'vitest';
import { rateLimitBucket } from '@/lib/security/distributedRateLimit';

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
});
