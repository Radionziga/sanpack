import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export interface TelegramMiniAppUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
}

export type TelegramMiniAppVerificationCode =
  | 'invalid_shape'
  | 'expired'
  | 'future'
  | 'signature_mismatch'
  | 'missing_user'
  | 'invalid_user';

export class TelegramMiniAppVerificationError extends Error {
  constructor(public readonly code: TelegramMiniAppVerificationCode) {
    super('Telegram Mini App proof verification failed.');
    this.name = 'TelegramMiniAppVerificationError';
  }
}

const miniAppUserSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
}).passthrough();

const MAX_INIT_DATA_AGE_SECONDS = 60 * 60;
const MAX_CLOCK_SKEW_SECONDS = 60;

export function verifyTelegramInitData(initData: string, botToken: string): TelegramMiniAppUser {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  if (!receivedHash || !/^[a-f\d]{64}$/i.test(receivedHash) || !Number.isInteger(authDate) || authDate <= 0) {
    throw new TelegramMiniAppVerificationError('invalid_shape');
  }
  const now = Math.floor(Date.now() / 1000);
  if (authDate < now - MAX_INIT_DATA_AGE_SECONDS) throw new TelegramMiniAppVerificationError('expired');
  if (authDate > now + MAX_CLOCK_SKEW_SECONDS) throw new TelegramMiniAppVerificationError('future');

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const left = Buffer.from(calculatedHash, 'hex');
  const right = Buffer.from(receivedHash, 'hex');
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new TelegramMiniAppVerificationError('signature_mismatch');
  }

  const rawUser = params.get('user');
  if (!rawUser) throw new TelegramMiniAppVerificationError('missing_user');
  let user: z.infer<typeof miniAppUserSchema>;
  try {
    user = miniAppUserSchema.parse(JSON.parse(rawUser));
  } catch {
    throw new TelegramMiniAppVerificationError('invalid_user');
  }
  return {
    id: String(user.id),
    username: readOptionalTelegramString(user.username, 64),
    firstName: readOptionalTelegramString(user.first_name, 100),
    lastName: readOptionalTelegramString(user.last_name, 100),
    languageCode: readOptionalTelegramString(user.language_code, 16),
  };
}

function readOptionalTelegramString(value: unknown, maximumLength: number) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximumLength
    ? value
    : undefined;
}
