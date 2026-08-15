import { NextResponse } from 'next/server';
import { createPublicSiteUrl } from '@/lib/http/publicSiteUrl';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';
import { canDecryptSecret } from '@/lib/telegram/secrets';
import {
  buildTelegramAuthorizationUrl,
  createTelegramLoginAttempt,
  createTelegramLoginFlowToken,
  TELEGRAM_LOGIN_FLOW_COOKIE_NAME,
  TELEGRAM_LOGIN_FLOW_MAX_AGE_SECONDS,
} from '@/lib/telegram/login';

export const runtime = 'nodejs';

function safeReturnTo(value: string | null) {
  if (!value || !/^\/(ru|uz|en)(\/|$)/.test(value)) return '/ru/request';
  return value;
}

function withAuthError(request: Request, returnTo: string) {
  const url = createPublicSiteUrl(returnTo, request.url);
  url.searchParams.set('telegramAuth', 'error');
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get('returnTo'));
  try {
    const settings = await getTelegramPrivateSettings();
    const login = settings.login;
    if (!login.enabled || !login.clientId || !canDecryptSecret(login.clientSecretEncrypted) || !login.redirectUri) {
      return withAuthError(request, returnTo);
    }

    const attempt = createTelegramLoginAttempt(returnTo);
    const flowToken = await createTelegramLoginFlowToken({
      state: attempt.state,
      codeVerifier: attempt.codeVerifier,
      returnTo,
    });
    const authorizationUrl = buildTelegramAuthorizationUrl({
      clientId: login.clientId,
      redirectUri: login.redirectUri,
      state: attempt.state,
      codeChallenge: attempt.codeChallenge,
      requestPhone: Boolean(login.requestPhone),
      allowBotMessages: Boolean(login.allowBotMessages),
    });
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(TELEGRAM_LOGIN_FLOW_COOKIE_NAME, flowToken, {
      maxAge: TELEGRAM_LOGIN_FLOW_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: login.redirectUri.startsWith('https://'),
      sameSite: 'lax',
      path: '/api/auth/telegram',
    });
    return response;
  } catch (error) {
    console.error('Telegram login could not start.', error);
    return withAuthError(request, returnTo);
  }
}
