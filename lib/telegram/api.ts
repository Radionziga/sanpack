import 'server-only';

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

async function callTelegram<T>(token: string, method: string, body?: unknown) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  let result: TelegramResponse<T>;
  try {
    result = JSON.parse(text) as TelegramResponse<T>;
  } catch {
    throw new Error('Telegram вернул неполный ответ. Повторите попытку позже.');
  }
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram API rejected ${method}.`);
  }
  return result.result as T;
}

export function getTelegramBot(token: string) {
  return callTelegram<{ id: number; username: string; first_name: string }>(token, 'getMe');
}

export function sendTelegramMessage(token: string, chatId: string, text: string) {
  return callTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export function configureTelegramMenu(token: string, webAppUrl: string) {
  return callTelegram(token, 'setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Открыть магазин',
      web_app: { url: webAppUrl },
    },
  });
}
