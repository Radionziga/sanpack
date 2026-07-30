import 'server-only';

interface Bucket {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __sanpackRateLimits?: Map<string, Bucket>;
};
const buckets = globalStore.__sanpackRateLimits ?? new Map<string, Bucket>();
globalStore.__sanpackRateLimits = buckets;

export function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const key = `${scope}:${address}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count <= limit) {
    return { allowed: true, retryAfter: 0 };
  }

  return {
    allowed: false,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}
