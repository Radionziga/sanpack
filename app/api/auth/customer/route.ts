import { logError } from '@/lib/observability/logger';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
  getCustomerSession,
  InactiveCustomerSessionError,
  refreshActiveCustomerSessionToken,
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

export async function GET(request?: Request) {
  let customer;
  try {
    customer = await getCustomerSession(request);
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
    customer = await getCustomerSession(request);
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
    const customerReference = getAdminDb().collection('customers').doc(customer.sub);
    let sessionToken: string | null = null;
    if (customer.sessionId) {
      sessionToken = await refreshActiveCustomerSessionToken(
        customer,
        { name: parsed.data.name, phone: parsed.data.phone },
        (transaction) => {
          transaction.set(customerReference, {
            ...parsed.data,
            updatedAt,
          }, { merge: true });
        },
      );
    } else {
      // Legacy bridge sessions may update the profile while their original
      // signed token is valid, but are never extended or silently upgraded.
      await customerReference.set({ ...parsed.data, updatedAt }, { merge: true });
    }
    const response = NextResponse.json({
      authenticated: true,
      customer: { ...parsed.data, username: customer.username || '', picture: customer.picture || '' },
    }, { headers: { 'Cache-Control': 'no-store' } });
    if (sessionToken) {
      response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, sessionToken, {
        maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || new URL(request.url).protocol === 'https:',
        sameSite: 'lax',
        path: '/',
      });
    }
    return response;
  } catch (error) {
    if (error instanceof InactiveCustomerSessionError) {
      const response = NextResponse.json({ error: 'Сессия завершена. Войдите снова.' }, { status: 401 });
      response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, '', {
        expires: new Date(0), httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || new URL(request.url).protocol === 'https:',
        sameSite: 'lax', path: '/',
      });
      return response;
    }
    logError('Customer profile update failed.', error);
    return NextResponse.json({ error: 'Не удалось сохранить профиль.' }, { status: 503 });
  }
}

export async function DELETE(request?: Request) {
  let customer;
  try {
    customer = await getCustomerSession(request);
  } catch (error) {
    logError('Customer session could not be verified during logout.', error);
    return NextResponse.json({ error: 'Не удалось подтвердить отзыв сессии.' }, { status: 503 });
  }
  try {
    await revokeCustomerSession(customer);
  } catch (error) {
    logError('Customer session revocation failed.', error);
    return NextResponse.json({ error: 'Не удалось завершить выход. Повторите попытку.' }, { status: 503 });
  }
  const response = NextResponse.json({
    success: true,
    revocation: customer?.sessionId ? 'server' : customer ? 'legacy_local_only' : 'not_applicable',
  }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || (request ? new URL(request.url).protocol === 'https:' : false),
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
