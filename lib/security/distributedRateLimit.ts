import 'server-only';

import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

export function trustedClientAddress(request: Request): string | null {
  // App Hosting does not establish an application-level header trust contract.
  // Opt in ONLY after proving edge overwrite + no direct-origin bypass. Never
  // parse an attacker-controlled XFF chain or fall back to another header.
  const header = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (!header || !/^[a-z0-9-]+$/.test(header)) return null;
  const address = request.headers.get(header)?.trim();
  if (!address || !isIP(address)) return null;
  // Canonicalize equivalent IPv6 spellings so they cannot reset a bucket.
  return isIP(address) === 6 ? new URL(`http://[${address}]/`).hostname : address;
}

export function clientFingerprint(request: Request) {
  return createHash('sha256').update(trustedClientAddress(request) || 'shared-anonymous').digest('hex');
}

// Whole-store ceilings, not per-IP quotas. They survive header spoofing,
// botnets, process restarts and direct-origin requests. Fixed-window semantics.
const publicCeilings: Record<string, number> = {
  'order-request': 60, callback: 30, 'admin-session': 60,
  'telegram-mini-app-session': 120, 'telegram-login-start': 120,
  'telegram-login-callback': 120, 'bag-designer-generate': 12,
  'bag-designer-submit': 120, 'bag-private-asset': 600,
};

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
  identity?: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const limits = identity
    ? [{ identity, limit }]
    : [
      { identity: 'global-public', limit: publicCeilings[scope] ?? limit },
      ...(trustedClientAddress(request) ? [{ identity: `ip:${clientFingerprint(request)}`, limit }] : []),
    ];
  const buckets = limits.map((entry) => ({
    ...rateLimitBucket(scope, entry.identity, now, windowMs), limit: entry.limit,
  }));
  const references = buckets.map((bucket) => getAdminDb().collection('rateLimits').doc(bucket.id));

  return getAdminDb().runTransaction(async (transaction) => {
    const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
    const counts = snapshots.map((snapshot) => Number(snapshot.data()?.count || 0) + 1);
    const blocked = buckets.find((bucket, index) => counts[index] > bucket.limit);
    if (!blocked) buckets.forEach((bucket, index) => transaction.set(references[index], {
      scope, count: counts[index], bucketStart: Timestamp.fromMillis(bucket.bucketStart),
      expiresAt: Timestamp.fromMillis(bucket.resetAt + windowMs), updatedAt: Timestamp.fromMillis(now),
    }, { merge: true }));
    return {
      allowed: !blocked,
      retryAfter: blocked ? Math.max(1, Math.ceil((blocked.resetAt - now) / 1000)) : 0,
    };
  });
}
