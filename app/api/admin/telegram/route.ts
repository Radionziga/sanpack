import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { telegramSettingsMutationSchema } from '@/lib/validation/order';
import { getTelegramPrivateSettings, toPublicAdminTelegramSettings } from '@/lib/telegram/settings';
import { decryptSecret, encryptSecret } from '@/lib/telegram/secrets';
import { configureTelegramMenu, getTelegramBot, sendTelegramMessage } from '@/lib/telegram/api';

export const runtime = 'nodejs';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), settings: telegramSettingsMutationSchema }).strict(),
  z.object({ action: z.literal('test_notifications') }).strict(),
  z.object({ action: z.literal('configure_storefront') }).strict(),
]);

async function requireAdmin() {
  const admin = await getAdminSession();
  return admin ?? null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  const settings = await getTelegramPrivateSettings();
  return NextResponse.json(toPublicAdminTelegramSettings(settings));
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });

  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Проверьте настройки Telegram.', issues: parsed.error.issues }, { status: 400 });
    }

    const current = await getTelegramPrivateSettings();
    if (parsed.data.action === 'test_notifications') {
      if (!current.notifications.tokenEncrypted || !current.notifications.chatId) {
        return NextResponse.json({ error: 'Сначала сохраните токен и chat ID.' }, { status: 400 });
      }
      await sendTelegramMessage(
        decryptSecret(current.notifications.tokenEncrypted),
        current.notifications.chatId,
        'SANPACK: тестовое уведомление доставлено. Интеграция работает.'
      );
      return NextResponse.json({ success: true, message: 'Тестовое сообщение отправлено.' });
    }

    if (parsed.data.action === 'configure_storefront') {
      if (!current.storefront.tokenEncrypted || !current.storefront.webAppUrl) {
        return NextResponse.json({ error: 'Сначала сохраните токен и HTTPS-адрес Mini App.' }, { status: 400 });
      }
      await configureTelegramMenu(
        decryptSecret(current.storefront.tokenEncrypted),
        current.storefront.webAppUrl
      );
      return NextResponse.json({ success: true, message: 'Кнопка магазина настроена у бота.' });
    }

    const input = parsed.data.settings;
    let storefrontTokenEncrypted = current.storefront.tokenEncrypted;
    let storefrontTokenLast4 = current.storefront.tokenLast4;
    let botUsername = input.storefront.botUsername || current.storefront.botUsername;
    if (input.storefront.botToken) {
      const bot = await getTelegramBot(input.storefront.botToken);
      storefrontTokenEncrypted = encryptSecret(input.storefront.botToken);
      storefrontTokenLast4 = input.storefront.botToken.slice(-4);
      botUsername = bot.username;
    }

    let notificationTokenEncrypted = current.notifications.tokenEncrypted;
    let notificationTokenLast4 = current.notifications.tokenLast4;
    if (input.notifications.botToken) {
      await getTelegramBot(input.notifications.botToken);
      notificationTokenEncrypted = encryptSecret(input.notifications.botToken);
      notificationTokenLast4 = input.notifications.botToken.slice(-4);
    }

    if (input.storefront.enabled && !storefrontTokenEncrypted) {
      return NextResponse.json({ error: 'Для Mini App нужен токен бота.' }, { status: 400 });
    }
    if (input.notifications.enabled && (!notificationTokenEncrypted || !input.notifications.chatId)) {
      return NextResponse.json({ error: 'Для уведомлений нужны токен и chat ID.' }, { status: 400 });
    }

    const settings = {
      storefront: {
        enabled: input.storefront.enabled,
        botUsername: botUsername || '',
        webAppUrl: input.storefront.webAppUrl || '',
        tokenEncrypted: storefrontTokenEncrypted || '',
        tokenLast4: storefrontTokenLast4 || '',
      },
      notifications: {
        enabled: input.notifications.enabled,
        chatId: input.notifications.chatId || '',
        tokenEncrypted: notificationTokenEncrypted || '',
        tokenLast4: notificationTokenLast4 || '',
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid,
    };
    await getAdminDb().collection('privateSettings').doc('telegram').set(settings);
    return NextResponse.json({
      success: true,
      message: 'Настройки Telegram сохранены.',
      settings: toPublicAdminTelegramSettings(settings),
    });
  } catch (error) {
    console.error('Telegram settings operation failed.', error);
    const message = error instanceof Error && error.message.includes('TELEGRAM_CONFIG_ENCRYPTION_KEY')
      ? 'На сервере не настроен ключ шифрования Telegram.'
      : 'Telegram отклонил операцию. Проверьте токен, chat ID и адрес Mini App.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

