import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/customerSession';
import { getAdminDb } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { verifyTelegramInitData } from '@/lib/telegram/miniApp';
import { canDecryptSecret, decryptSecret } from '@/lib/telegram/secrets';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';

export const runtime = 'nodejs';

const miniAppSessionSchema = z.object({
  initData: z.string().min(1).max(16_000),
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, 'telegram-mini-app-session', 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    );
  }

  const parsed = miniAppSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные данные Telegram.' }, { status: 400 });
  }

  try {
    const settings = await getTelegramPrivateSettings();
    const encryptedToken = settings.storefront.tokenEncrypted;
    if (!settings.storefront.enabled || !encryptedToken || !canDecryptSecret(encryptedToken)) {
      return NextResponse.json({ error: 'Telegram Mini App не настроен.' }, { status: 503 });
    }

    const user = verifyTelegramInitData(parsed.data.initData, decryptSecret(encryptedToken));
    const uid = `telegram:${user.id}`;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
      || user.username
      || 'Покупатель';
    const sessionToken = await createCustomerSessionToken({
      sub: uid,
      telegramId: user.id,
      name,
      ...(user.username ? { username: user.username } : {}),
    });

    await getAdminDb().collection('customers').doc(uid).set({
      uid,
      provider: 'telegram',
      telegramId: user.id,
      name,
      username: user.username || '',
      languageCode: user.languageCode || '',
      lastLoginAt: new Date().toISOString(),
    }, { merge: true });

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, sessionToken, {
      maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: new URL(request.url).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch (error) {
    console.warn('Telegram Mini App session verification failed.', error);
    return NextResponse.json({ error: 'Не удалось подтвердить Telegram-сессию.' }, { status: 401 });
  }
}
