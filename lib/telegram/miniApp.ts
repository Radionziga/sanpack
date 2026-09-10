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
  | 'invalid_user';

export class TelegramMiniAppVerificationError extends Error {
  constructor(public readonly code: TelegramMiniAppVerificationCode) {
    super('Telegram Mini App proof verification failed.');
    this.name = 'TelegramMiniAppVerificationError';
  }
}

const miniAppUserSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  username: z.string().min(1).max(64).optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  language_code: z.string().min(2).max(16).optional(),
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
  if (!rawUser) throw new TelegramMiniAppVerificationError('invalid_user');
  let user: z.infer<typeof miniAppUserSchema>;
  try {
    user = miniAppUserSchema.parse(JSON.parse(rawUser));
  } catch {
    throw new TelegramMiniAppVerificationError('invalid_user');
  }
  return {
    id: String(user.id),
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code,
  };
}
