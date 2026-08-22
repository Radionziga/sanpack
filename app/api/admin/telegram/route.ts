import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { telegramSettingsMutationSchema } from '@/lib/validation/order';
import { getTelegramPrivateSettings, toPublicAdminTelegramSettings } from '@/lib/telegram/settings';
import { decryptSecret, encryptSecret } from '@/lib/telegram/secrets';
import { configureTelegramMenu, getTelegramBot, sendTelegramMessage } from '@/lib/telegram/api';
import {
  firebaseAdminUnavailableMessage,
  isFirebaseAdminCredentialError,
} from '@/lib/firebase/adminErrors';

export const runtime = 'nodejs';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), settings: telegramSettingsMutationSchema }).strict(),
  z.object({ action: z.literal('test_notifications') }).strict(),
  z.object({ action: z.literal('configure_storefront') }).strict(),
]);

function telegramErrorMessage(error: unknown) {
  if (isFirebaseAdminCredentialError(error)) {
    return firebaseAdminUnavailableMessage('данных', error);
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('TELEGRAM_CONFIG_ENCRYPTION_KEY')) {
    return 'Не настроено защищённое хранение токена. Обратитесь к владельцу проекта.';
  }
  if (/Unsupported state|unable to authenticate data|unsupported format/i.test(message)) {
    return 'Сохранённый секрет больше недоступен. Введите токен или секрет повторно и сохраните настройки.';
  }
  if (/chat not found|chat_id/i.test(message)) {
    return 'Бот не может отправить сообщение в этот чат. Откройте бота в Telegram, нажмите «Start» и проверьте Chat ID.';
  }
  if (/unauthorized|invalid token|not found/i.test(message)) {
    return 'Telegram не принял токен. Скопируйте его заново из BotFather без пробелов.';
  }
  if (/button_url_invalid|wrong http url|https/i.test(message)) {
    return 'Telegram не принял адрес магазина. Используйте публичный HTTPS-адрес сайта.';
  }
  if (/fetch failed|timeout|aborted|неполный ответ/i.test(message)) {
    return 'Не удалось связаться с Telegram. Проверьте интернет и повторите попытку.';
  }
  return 'Настройки не сохранены. Проверьте введённые данные и попробуйте ещё раз.';
}

function telegramErrorStatus(error: unknown) {
  if (isFirebaseAdminCredentialError(error)) return 503;
  const message = error instanceof Error ? error.message : String(error);
  if (/Unsupported state|unable to authenticate data|unsupported format/i.test(message)) return 409;
  if (/chat not found|chat_id|unauthorized|invalid token|not found|button_url_invalid|wrong http url|https/i.test(message)) return 400;
  if (/TELEGRAM_CONFIG_ENCRYPTION_KEY|fetch failed|timeout|aborted|неполный ответ/i.test(message)) return 503;
  return 500;
}

async function requireAdmin() {
  const admin = await getAdminSession();
  return admin ?? null;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    const settings = await getTelegramPrivateSettings();
    return NextResponse.json(toPublicAdminTelegramSettings(settings));
  } catch (error) {
    console.error('Telegram settings loading failed.', error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('данных', error) },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });

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
        'Тестовое уведомление доставлено. Интеграция работает.'
      );
      return NextResponse.json({ success: true, message: 'Тестовое сообщение доставлено. Уведомления о новых заказах готовы.' });
    }

    if (parsed.data.action === 'configure_storefront') {
      if (!current.storefront.tokenEncrypted || !current.storefront.webAppUrl) {
        return NextResponse.json({ error: 'Сначала сохраните токен и HTTPS-адрес Mini App.' }, { status: 400 });
      }
      await configureTelegramMenu(
        decryptSecret(current.storefront.tokenEncrypted),
        current.storefront.webAppUrl
      );
      const botName = current.storefront.botUsername ? ` @${current.storefront.botUsername}` : '';
      return NextResponse.json({
        success: true,
        message: `Кнопка «Открыть магазин» добавлена в Telegram-бота${botName}.`,
      });
    }

    const input = parsed.data.settings;
    let clientSecretEncrypted = current.login.clientSecretEncrypted;
    let clientSecretLast4 = current.login.clientSecretLast4;
    if (input.login.clientSecret) {
      clientSecretEncrypted = encryptSecret(input.login.clientSecret);
      clientSecretLast4 = input.login.clientSecret.slice(-4);
    }

    if (input.login.enabled && (!input.login.clientId || !clientSecretEncrypted || !input.login.redirectUri)) {
      return NextResponse.json(
        { error: 'Для входа через Telegram укажите Client ID, Client Secret и точный Redirect URI.' },
        { status: 400 }
      );
    }

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
      login: {
        enabled: input.login.enabled,
        clientId: input.login.clientId || '',
        clientSecretEncrypted: clientSecretEncrypted || '',
        clientSecretLast4: clientSecretLast4 || '',
        redirectUri: input.login.redirectUri || '',
        requestPhone: input.login.requestPhone,
        allowBotMessages: input.login.allowBotMessages,
      },
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
    const message = telegramErrorMessage(error);
    return NextResponse.json({ error: message }, { status: telegramErrorStatus(error) });
  }
}
