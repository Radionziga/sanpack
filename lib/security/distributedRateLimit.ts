import 'server-only';

import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

function clientFingerprint(request: Request) {
  const address = request.headers.get('x-appengine-user-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return createHash('sha256').update(`${address}\n${userAgent}`).digest('hex');
}

export function rateLimitBucket(scope: string, fingerprint: string, now: number, windowMs: number) {
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const id = createHash('sha256').update(`${scope}:${fingerprint}:${bucketStart}`).digest('hex');
  return { id, bucketStart, resetAt: bucketStart + windowMs };
}

/** Shared Firestore-backed limiter for horizontally scaled App Hosting instances. */
export async function checkDistributedRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = rateLimitBucket(scope, clientFingerprint(request), now, windowMs);
  const reference = getAdminDb().collection('rateLimits').doc(bucket.id);

  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const count = Number(snapshot.data()?.count || 0) + 1;
    transaction.set(reference, {
      scope,
      count,
      bucketStart: Timestamp.fromMillis(bucket.bucketStart),
      expiresAt: Timestamp.fromMillis(bucket.resetAt + windowMs),
      updatedAt: Timestamp.fromMillis(now),
    }, { merge: true });
    return {
      allowed: count <= limit,
      retryAfter: count <= limit ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  });
}
