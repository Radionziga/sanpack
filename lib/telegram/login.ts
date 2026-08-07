import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { deriveTelegramKey } from '@/lib/telegram/secrets';

export const TELEGRAM_AUTHORIZATION_ENDPOINT = 'https://oauth.telegram.org/auth';
export const TELEGRAM_TOKEN_ENDPOINT = 'https://oauth.telegram.org/token';
export const TELEGRAM_ISSUER = 'https://oauth.telegram.org';
export const TELEGRAM_LOGIN_FLOW_COOKIE_NAME = '__telegram_login_flow';
export const TELEGRAM_LOGIN_FLOW_MAX_AGE_SECONDS = 10 * 60;

const telegramJwks = createRemoteJWKSet(
  new URL('https://oauth.telegram.org/.well-known/jwks.json')
);

const flowSchema = z.object({
  state: z.string().min(32),
  codeVerifier: z.string().min(43).max(128),
  returnTo: z.string().startsWith('/'),
}).passthrough();

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().positive(),
  id_token: z.string().min(100),
}).passthrough();

const profileSchema = z.object({
  sub: z.string().min(1),
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().min(1).max(160).optional(),
  given_name: z.string().max(100).optional(),
  family_name: z.string().max(100).optional(),
  preferred_username: z.string().max(64).optional(),
  picture: z.string().url().optional(),
  phone_number: z.string().max(40).optional(),
  phone_number_verified: z.boolean().optional(),
}).passthrough();

export type TelegramLoginProfile = z.infer<typeof profileSchema>;

function base64Url(bytes: Buffer) {
  return bytes.toString('base64url');
}

export function createTelegramLoginAttempt(returnTo: string) {
  const state = base64Url(randomBytes(32));
  const codeVerifier = base64Url(randomBytes(64));
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { state, codeVerifier, codeChallenge, returnTo };
}

export async function createTelegramLoginFlowToken(flow: z.infer<typeof flowSchema>) {
  return new SignJWT(flow)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${TELEGRAM_LOGIN_FLOW_MAX_AGE_SECONDS}s`)
    .sign(deriveTelegramKey('telegram-login-flow'));
}

export async function verifyTelegramLoginFlowToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, deriveTelegramKey('telegram-login-flow'), {
      algorithms: ['HS256'],
    });
    const parsed = flowSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function buildTelegramAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  requestPhone: boolean;
  allowBotMessages: boolean;
}) {
  const scopes = ['openid', 'profile'];
  if (input.requestPhone) scopes.push('phone');
  if (input.allowBotMessages) scopes.push('telegram:bot_access');

  const url = new URL(TELEGRAM_AUTHORIZATION_ENDPOINT);
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url;
}

export async function exchangeTelegramCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const response = await fetch(TELEGRAM_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: input.clientId,
      code_verifier: input.codeVerifier,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });

  const raw = await response.text();
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    throw new Error(`Telegram token exchange failed (${response.status}).`);
  }
  const parsed = tokenResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error('Telegram returned an incomplete token response.');
  return parsed.data;
}

export async function verifyTelegramIdToken(idToken: string, clientId: string) {
  const { payload } = await jwtVerify(idToken, telegramJwks, {
    issuer: TELEGRAM_ISSUER,
    audience: clientId,
    algorithms: ['RS256'],
  });
  const parsed = profileSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Telegram profile is incomplete.');
  return parsed.data;
}
