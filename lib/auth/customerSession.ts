import 'server-only';

import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { Timestamp, type Transaction } from 'firebase-admin/firestore';
import { deriveTelegramKey } from '@/lib/telegram/secrets';
import { getAdminDb } from '@/lib/firebase/admin';

export const CUSTOMER_SESSION_COOKIE_NAME = '__sanpack_customer';
export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const customerSessionSchema = z.object({
  sub: z.string().min(1),
  kind: z.literal('customer'),
  provider: z.literal('telegram'),
  telegramId: z.string().min(1),
  name: z.string().min(1).max(160),
  username: z.string().max(64).optional(),
  picture: z.string().url().optional(),
  phone: z.string().max(40).optional(),
  identityUids: z.array(z.string().min(1).max(180)).min(1).max(8).optional(),
  sessionId: z.string().min(32).max(160).optional(),
}).passthrough();

export type CustomerSession = z.infer<typeof customerSessionSchema>;

export class InactiveCustomerSessionError extends Error {
  constructor() {
    super('Customer session is no longer active.');
  }
}

type CustomerSessionClaims = Parameters<typeof createCustomerSessionToken>[0];

export async function createCustomerSessionToken(
  customer: {
    sub: string;
    telegramId: string;
    name: string;
    username?: string;
    picture?: string;
    phone?: string;
    identityUids?: string[];
    sessionId?: string;
  }
) {
  return new SignJWT({ ...customer, kind: 'customer', provider: 'telegram' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(customer.sub)
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_SESSION_MAX_AGE_SECONDS}s`)
    .sign(deriveTelegramKey('customer-session'));
}

function sessionReference(sessionId: string) {
  const id = createHash('sha256').update(sessionId).digest('hex');
  return getAdminDb().collection('customerSessions').doc(id);
}

export async function issueCustomerSessionToken(
  customer: CustomerSessionClaims,
) {
  const sessionId = randomBytes(32).toString('base64url');
  const token = await createCustomerSessionToken({ ...customer, sessionId });
  await sessionReference(sessionId).set({
    customerUid: customer.sub,
    telegramId: customer.telegramId,
    createdAt: Timestamp.now(),
    lastSeenAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + CUSTOMER_SESSION_MAX_AGE_SECONDS * 1000),
  });
  return token;
}

function timestampMillis(value: unknown) {
  return value && typeof value === 'object' && 'toMillis' in value
    && typeof value.toMillis === 'function'
    ? value.toMillis()
    : Number.NaN;
}

function isActiveSessionRecord(
  data: Record<string, unknown> | undefined,
  session: CustomerSession,
  now = Date.now(),
) {
  return data?.customerUid === session.sub
    && data?.telegramId === session.telegramId
    && !data.revokedAt
    && timestampMillis(data.expiresAt) > now;
}

/**
 * Refresh a new-style server-backed session without ever recreating it.
 * The optional mutation shares the same Firestore transaction, allowing a
 * profile write to be linearized with the final active-session check.
 */
export async function refreshActiveCustomerSessionToken(
  session: CustomerSession,
  changes: Pick<CustomerSessionClaims, 'name'> & Partial<Pick<CustomerSessionClaims, 'phone'>>,
  mutate?: (transaction: Transaction) => void | Promise<void>,
) {
  if (!session.sessionId) throw new InactiveCustomerSessionError();
  const db = getAdminDb();
  const reference = sessionReference(session.sessionId);
  await db.runTransaction(async (transaction) => {
    const now = Date.now();
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || !isActiveSessionRecord(snapshot.data(), session, now)) {
      throw new InactiveCustomerSessionError();
    }
    await mutate?.(transaction);
    // update() is intentional: a concurrent delete must conflict/retry and
    // then fail closed instead of resurrecting the revoked record.
    transaction.update(reference, {
      lastSeenAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + CUSTOMER_SESSION_MAX_AGE_SECONDS * 1000),
    });
  });
  return createCustomerSessionToken({
    sub: session.sub,
    telegramId: session.telegramId,
    name: changes.name,
    identityUids: session.identityUids,
    sessionId: session.sessionId,
    ...(session.username ? { username: session.username } : {}),
    ...(session.picture ? { picture: session.picture } : {}),
    ...(changes.phone ? { phone: changes.phone } : {}),
  });
}

export async function verifyCustomerSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, deriveTelegramKey('customer-session'), {
      algorithms: ['HS256'],
    });
    const parsed = customerSessionSchema.safeParse(payload);
    if (!parsed.success) return null;
    const identityUids = parsed.data.identityUids?.length
      ? [...new Set(parsed.data.identityUids)]
      : [parsed.data.sub];
    if (!identityUids.includes(parsed.data.sub)) return null;
    return { ...parsed.data, identityUids };
  } catch {
    return null;
  }
}

function tokenFromRequest(request: Request) {
  const value = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CUSTOMER_SESSION_COOKIE_NAME}=`))
    ?.slice(CUSTOMER_SESSION_COOKIE_NAME.length + 1);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export async function getCustomerSession(request?: Request) {
  const token = request
    ? tokenFromRequest(request)
    : (await cookies()).get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyActiveCustomerSessionToken(token);
}

export async function verifyActiveCustomerSessionToken(token: string) {
  const session = await verifyCustomerSessionToken(token);
  if (!session || !session.sessionId) return session;
  const stored = await sessionReference(session.sessionId).get();
  if (!stored.exists) return null;
  return isActiveSessionRecord(stored.data(), session) ? session : null;
}

export async function revokeCustomerSession(session: CustomerSession | null) {
  if (!session?.sessionId) return;
  await sessionReference(session.sessionId).delete();
}
