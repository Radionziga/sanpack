import 'server-only';

import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
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
  customer: Parameters<typeof createCustomerSessionToken>[0],
  existingSessionId?: string,
) {
  const sessionId = existingSessionId || randomBytes(32).toString('base64url');
  const token = await createCustomerSessionToken({ ...customer, sessionId });
  await sessionReference(sessionId).set({
    customerUid: customer.sub,
    telegramId: customer.telegramId,
    ...(!existingSessionId ? { createdAt: Timestamp.now() } : {}),
    lastSeenAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + CUSTOMER_SESSION_MAX_AGE_SECONDS * 1000),
  }, { merge: true });
  return token;
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

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyActiveCustomerSessionToken(token);
}

export async function verifyActiveCustomerSessionToken(token: string) {
  const session = await verifyCustomerSessionToken(token);
  if (!session || !session.sessionId) return session;
  const stored = await sessionReference(session.sessionId).get();
  if (!stored.exists) return null;
  const data = stored.data();
  return data?.customerUid === session.sub && data?.telegramId === session.telegramId
    ? session
    : null;
}

export async function revokeCustomerSession(session: CustomerSession | null) {
  if (!session?.sessionId) return;
  await sessionReference(session.sessionId).delete();
}
