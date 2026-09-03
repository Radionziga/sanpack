import { logError } from '@/lib/observability/logger';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { createPublicSiteUrl } from '@/lib/http/publicSiteUrl';
import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/customerSession';
import { canDecryptSecret, decryptSecret } from '@/lib/telegram/secrets';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';
import {
  exchangeTelegramCode,
  TELEGRAM_LOGIN_FLOW_COOKIE_NAME,
  verifyTelegramIdToken,
  verifyTelegramLoginFlowToken,
} from '@/lib/telegram/login';

export const runtime = 'nodejs';

function finish(request: Request, returnTo: string, status: 'success' | 'error') {
  const url = createPublicSiteUrl(returnTo, request.url);
  url.searchParams.set('telegramAuth', status);
  const response = NextResponse.redirect(url);
  response.cookies.set(TELEGRAM_LOGIN_FLOW_COOKIE_NAME, '', {
    expires: new Date(0),
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    path: '/api/auth/telegram',
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const flowCookie = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TELEGRAM_LOGIN_FLOW_COOKIE_NAME}=`))
    ?.slice(TELEGRAM_LOGIN_FLOW_COOKIE_NAME.length + 1);
  const flow = flowCookie ? await verifyTelegramLoginFlowToken(decodeURIComponent(flowCookie)) : null;
  const returnTo = flow?.returnTo || '/ru/request';

  if (!flow || url.searchParams.get('state') !== flow.state) {
    return finish(request, returnTo, 'error');
  }
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.has('error')) {
    return finish(request, returnTo, 'error');
  }

  try {
    const limit = await checkDistributedRateLimit(request, 'telegram-login-callback', 10, 10 * 60 * 1000);
    if (!limit.allowed) return finish(request, returnTo, 'error');
    const settings = await getTelegramPrivateSettings();
    const login = settings.login;
    const encryptedClientSecret = login.clientSecretEncrypted;
    if (!login.enabled || !login.clientId || !encryptedClientSecret || !canDecryptSecret(encryptedClientSecret) || !login.redirectUri) {
      return finish(request, returnTo, 'error');
    }
    const tokens = await exchangeTelegramCode({
      code,
      clientId: login.clientId,
      clientSecret: decryptSecret(encryptedClientSecret),
      redirectUri: login.redirectUri,
      codeVerifier: flow.codeVerifier,
    });
    const profile = await verifyTelegramIdToken(tokens.id_token, login.clientId);
    const telegramId = String(profile.id ?? profile.sub);
    const uid = `telegram:${profile.sub}`;
    const name = profile.name
      || [profile.given_name, profile.family_name].filter(Boolean).join(' ')
      || profile.preferred_username
      || 'Покупатель';
    const sessionToken = await createCustomerSessionToken({
      sub: uid,
      telegramId,
      name,
      ...(profile.preferred_username ? { username: profile.preferred_username } : {}),
      ...(profile.picture ? { picture: profile.picture } : {}),
      ...(profile.phone_number ? { phone: profile.phone_number } : {}),
    });

    await getAdminDb().collection('customers').doc(uid).set({
      uid,
      provider: 'telegram',
      telegramId,
      name,
      username: profile.preferred_username || '',
      picture: profile.picture || '',
      phone: profile.phone_number || '',
      lastLoginAt: new Date().toISOString(),
    }, { merge: true });

    const response = finish(request, returnTo, 'success');
    response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, sessionToken, {
      maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: login.redirectUri.startsWith('https://'),
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch (error) {
    logError('Telegram login callback failed.', error);
    return finish(request, returnTo, 'error');
  }
}
