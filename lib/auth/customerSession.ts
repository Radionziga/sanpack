import 'server-only';

import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { deriveTelegramKey } from '@/lib/telegram/secrets';

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
  }
) {
  return new SignJWT({ ...customer, kind: 'customer', provider: 'telegram' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(customer.sub)
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_SESSION_MAX_AGE_SECONDS}s`)
    .sign(deriveTelegramKey('customer-session'));
}

export async function verifyCustomerSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, deriveTelegramKey('customer-session'), {
      algorithms: ['HS256'],
    });
    const parsed = customerSessionSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  return token ? verifyCustomerSessionToken(token) : null;
}
