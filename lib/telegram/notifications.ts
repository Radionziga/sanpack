import 'server-only';

import type { RequestOrder } from '@/types';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';
import { decryptSecret } from '@/lib/telegram/secrets';
import { sendTelegramMessage } from '@/lib/telegram/api';

export async function notifyAboutNewOrder(order: RequestOrder) {
  const settings = await getTelegramPrivateSettings();
  const { notifications } = settings;
  if (!notifications.enabled || !notifications.tokenEncrypted || !notifications.chatId) {
    return { delivered: false, reason: 'not_configured' as const };
  }

  const lines = order.items.map((item) => `• ${item.productTitleRu} — ${item.quantity} ${item.unit}`);
  const text = [
    `Новая заявка ${order.requestNumber}`,
    `Клиент: ${order.contactName}`,
    `Телефон: ${order.phone}`,
    `Источник: ${order.source === 'telegram_mini_app' ? 'Telegram Mini App' : 'Сайт'}`,
    '',
    ...lines,
    '',
    `Позиций: ${order.items.length}`,
  ].join('\n');

  await sendTelegramMessage(decryptSecret(notifications.tokenEncrypted), notifications.chatId, text);
  return { delivered: true as const };
}

