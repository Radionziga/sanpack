import { logError } from '@/lib/observability/logger';
import { readJsonBody } from '@/lib/security/readJsonBody';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  issueCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/customerSession';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { TelegramMiniAppVerificationError, verifyTelegramInitData } from '@/lib/telegram/miniApp';
import { canDecryptSecret, decryptSecret } from '@/lib/telegram/secrets';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';
import { upsertTelegramCustomer } from '@/lib/customer/telegramIdentity';

export const runtime = 'nodejs';

const miniAppSessionSchema = z.object({
  initData: z.string().min(1).max(16_000),
});

export async function POST(request: Request) {
  const parsed = miniAppSessionSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные данные Telegram.' }, { status: 400 });
  }
  const rateLimit = await checkDistributedRateLimit(request, 'telegram-mini-app-session', 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    );
  }

  let stage: 'configuration' | 'verification' | 'identity' | 'session' = 'configuration';
  try {
    const settings = await getTelegramPrivateSettings();
    const encryptedToken = settings.storefront.tokenEncrypted;
    if (!settings.storefront.enabled || !encryptedToken || !canDecryptSecret(encryptedToken)) {
      return NextResponse.json({ error: 'Telegram Mini App не настроен.' }, { status: 503 });
    }

    stage = 'verification';
    const user = verifyTelegramInitData(parsed.data.initData, decryptSecret(encryptedToken));
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
      || user.username
      || 'Покупатель';
    stage = 'identity';
    const customer = await upsertTelegramCustomer({
      telegramId: user.id,
      displayName: name,
      username: user.username,
      languageCode: user.languageCode,
    });
    stage = 'session';
    const sessionToken = await issueCustomerSessionToken({
      sub: customer.uid,
      telegramId: customer.telegramId,
      name: customer.name,
      identityUids: customer.identityUids,
      ...(customer.username ? { username: customer.username } : {}),
      ...(customer.picture ? { picture: customer.picture } : {}),
      ...(customer.phone ? { phone: customer.phone } : {}),
    });

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, sessionToken, {
      maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || new URL(request.url).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch (error) {
    const verificationCode = error instanceof TelegramMiniAppVerificationError ? error.code : undefined;
    logError('Telegram Mini App session verification failed.', error, {
      stage,
      ...(verificationCode ? { verificationCode } : {}),
    });
    if (verificationCode) {
      return NextResponse.json(
        { error: 'Не удалось подтвердить Telegram-сессию.', reason: verificationCode },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: 'Сервис Telegram временно недоступен.', reason: 'service_unavailable' },
      { status: 503 },
    );
  }
}
