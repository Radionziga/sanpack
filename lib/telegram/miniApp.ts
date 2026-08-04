import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TelegramMiniAppUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
}

export function verifyTelegramInitData(initData: string, botToken: string): TelegramMiniAppUser {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  if (!receivedHash || !Number.isFinite(authDate)) throw new Error('Некорректные данные Telegram.');
  if (Math.abs(Date.now() / 1000 - authDate) > 60 * 60) throw new Error('Сессия Telegram устарела.');

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
    throw new Error('Подпись Telegram не прошла проверку.');
  }

  const rawUser = params.get('user');
  if (!rawUser) throw new Error('Telegram не передал профиль пользователя.');
  const user = JSON.parse(rawUser) as {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  };
  return {
    id: String(user.id),
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code,
  };
}

