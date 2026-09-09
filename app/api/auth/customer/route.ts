import { logError } from '@/lib/observability/logger';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
  issueCustomerSessionToken,
  getCustomerSession,
  revokeCustomerSession,
} from '@/lib/auth/customerSession';
import { readJsonBody } from '@/lib/security/readJsonBody';

export const runtime = 'nodejs';

const customerProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  company: z.string().trim().max(160).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
  inn: z.string().trim().max(32).optional().default(''),
});

export async function GET() {
  let customer;
  try {
    customer = await getCustomerSession();
  } catch (error) {
    logError('Customer session could not be verified.', error);
    return NextResponse.json({ error: 'Сервис профиля временно недоступен.' }, { status: 503 });
  }
  let storedProfile: Record<string, unknown> = {};
  if (customer) {
    try {
      const document = await getAdminDb().collection('customers').doc(customer.sub).get();
      storedProfile = document.exists ? document.data() || {} : {};
    } catch (error) {
      logError('Customer profile could not be loaded; session data was used.', error);
    }
  }
  return NextResponse.json({
    authenticated: Boolean(customer),
    customer: customer ? {
      name: String(storedProfile.name || customer.name),
      username: String(storedProfile.username || customer.username || ''),
      picture: String(storedProfile.picture || customer.picture || ''),
      phone: String(storedProfile.phone || customer.phone || ''),
      company: String(storedProfile.company || ''),
      address: String(storedProfile.address || ''),
      inn: String(storedProfile.inn || ''),
    } : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  let customer;
  try {
    customer = await getCustomerSession();
  } catch (error) {
    logError('Customer session could not be verified.', error);
    return NextResponse.json({ error: 'Сервис профиля временно недоступен.' }, { status: 503 });
  }
  if (!customer) {
    return NextResponse.json({ error: 'Войдите через Telegram, чтобы сохранить профиль.' }, { status: 401 });
  }

  const parsed = customerProfileSchema.safeParse(await readJsonBody(request, 16_000));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Проверьте имя и номер телефона.' }, { status: 400 });
  }

  try {
    const updatedAt = new Date().toISOString();
    await getAdminDb().collection('customers').doc(customer.sub).set({
      ...parsed.data,
      updatedAt,
    }, { merge: true });

    const sessionToken = await issueCustomerSessionToken({
      sub: customer.sub,
      telegramId: customer.telegramId,
      name: parsed.data.name,
      identityUids: customer.identityUids,
      ...(customer.username ? { username: customer.username } : {}),
      ...(customer.picture ? { picture: customer.picture } : {}),
      phone: parsed.data.phone,
    }, customer.sessionId);
    const response = NextResponse.json({
      authenticated: true,
      customer: { ...parsed.data, username: customer.username || '', picture: customer.picture || '' },
    }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, sessionToken, {
      maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || new URL(request.url).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch (error) {
    logError('Customer profile update failed.', error);
    return NextResponse.json({ error: 'Не удалось сохранить профиль.' }, { status: 503 });
  }
}

export async function DELETE() {
  const customer = await getCustomerSession().catch((error) => {
    logError('Customer session could not be verified during logout.', error);
    return null;
  });
  await revokeCustomerSession(customer).catch((error) => {
    logError('Customer session revocation failed.', error);
  });
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
