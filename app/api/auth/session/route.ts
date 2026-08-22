import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminAuth } from '@/lib/firebase/admin';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  verifyAdminToken,
} from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

const requestSchema = z.object({
  idToken: z.string().min(100).max(10000),
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, 'admin-session', 10, 5 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter) },
      }
    );
  }

  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные для входа.' }, { status: 400 });
    }
    const body = parsed.data;
    const isLocalSession = process.env.NODE_ENV !== 'production'
      && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const decoded = await getAdminAuth().verifyIdToken(body.idToken, !isLocalSession);
    const admin = await verifyAdminToken(decoded);

    if (!admin) {
      return NextResponse.json(
        { error: 'Для этой учётной записи не открыт доступ к панели.' },
        { status: 403 }
      );
    }

    // App Hosting provides credentials for a long-lived session cookie.
    // Locally, keep the already verified short-lived ID token in an httpOnly
    // cookie so sign-in works without copying a private service-account key.
    const sessionCookie = isLocalSession
      ? `local:${body.idToken}`
      : await getAdminAuth().createSessionCookie(body.idToken, {
          expiresIn: SESSION_MAX_AGE_MS,
        });
    const maxAge = isLocalSession ? 60 * 60 : SESSION_MAX_AGE_MS / 1000;
    const response = NextResponse.json({ admin });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Admin session creation failed.', error);
    }
    return NextResponse.json(
      { error: 'Не удалось войти. Обновите страницу и попробуйте снова.' },
      { status: 401 }
    );
  }
}
