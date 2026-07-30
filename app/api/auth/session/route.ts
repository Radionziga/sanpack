import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminAuth } from '@/lib/firebase/admin';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  verifyAdminToken,
} from '@/lib/auth/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  idToken: z.string().min(100).max(10000),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const decoded = await getAdminAuth().verifyIdToken(body.idToken, true);
    const admin = await verifyAdminToken(decoded);

    if (!admin) {
      return NextResponse.json(
        { error: 'У этой учетной записи нет доступа к панели SANPACK.' },
        { status: 403 }
      );
    }

    const sessionCookie = await getAdminAuth().createSessionCookie(body.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });
    const response = NextResponse.json({ admin });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_MAX_AGE_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Не удалось создать защищенную сессию.' },
      { status: 401 }
    );
  }
}
