import 'server-only';

import type { RequestOrder } from '@/types';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';
import { decryptSecret } from '@/lib/telegram/secrets';
import { sendTelegramMessage } from '@/lib/telegram/api';
import { BAG_TYPE_LABELS } from '@/lib/bag-designer/defaults';
import type { BagDesignRequestRecord } from '@/lib/bag-designer/types';
import { formatOrderAmount } from '@/lib/orders/orderAmounts';

export async function notifyAboutNewOrder(order: RequestOrder) {
  const settings = await getTelegramPrivateSettings();
  const { notifications } = settings;
  if (!notifications.enabled || !notifications.tokenEncrypted || !notifications.chatId) {
    return { delivered: false, reason: 'not_configured' as const };
  }

  const lines = order.items.map((item) => {
    const lineAmount = item.price === undefined ? 'цена по запросу' : formatOrderAmount(item.price * item.quantity);
    return `• ${item.productTitleRu} — ${item.quantity} ${item.unit} · ${lineAmount}`;
  });
  const text = [
    `Новая заявка ${order.requestNumber}`,
    `Клиент: ${order.contactName}`,
    `Телефон: ${order.phone}`,
    `Источник: ${order.source === 'telegram_mini_app' ? 'Telegram Mini App' : 'Сайт'}`,
    `Доставка: ${order.deliveryDate || 'дата не указана'}, ${order.deliveryWindow || 'время не указано'}`,
    `Адрес: ${order.deliveryAddress || 'не указан'}`,
    ...(order.notes ? [`Комментарий: ${order.notes}`] : []),
    '',
    ...lines,
    '',
    `Позиций: ${order.items.length}`,
    `Предварительная сумма: ${formatOrderAmount(order.total)}`,
  ].join('\n');

  await sendTelegramMessage(decryptSecret(notifications.tokenEncrypted), notifications.chatId, text);
  return { delivered: true as const };
}

export async function notifyAboutBagDesignRequest(request: Partial<BagDesignRequestRecord>) {
  const settings = await getTelegramPrivateSettings();
  const { notifications } = settings;
  if (!notifications.enabled || !notifications.tokenEncrypted || !notifications.chatId) {
    return { delivered: false, reason: 'not_configured' as const };
  }
  const spec = request.spec;
  const text = [
    `Новая заявка на пакет ${request.number || ''}`,
    `Клиент: ${request.contact?.name || '—'}`,
    `Телефон: ${request.contact?.phone || '—'}`,
    `Тип: ${spec?.bagType ? BAG_TYPE_LABELS[spec.bagType] : '—'}`,
    `Размер: ${spec?.width || '—'} × ${spec?.height || '—'} см`,
    `Тираж: ${Number(spec?.quantity || 0).toLocaleString('ru-RU')} шт.`,
    '',
    `AI-визуализация: ${request.aiMockupUrl || '—'}`,
    `Технический макет: ${request.technicalPreviewUrl || '—'}`,
    `Логотип: ${request.logoUrl || '—'}`,
  ].join('\n');
  await sendTelegramMessage(decryptSecret(notifications.tokenEncrypted), notifications.chatId, text);
  return { delivered: true as const };
}
