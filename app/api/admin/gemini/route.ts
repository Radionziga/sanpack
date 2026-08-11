import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { decryptSecret, encryptSecret } from '@/lib/telegram/secrets';
import { listGeminiTextModels, type GeminiModelOption } from '@/lib/gemini/api';
import {
  getGeminiPrivateSettings,
  saveGeminiPrivateSettings,
  toPublicAdminGeminiSettings,
} from '@/lib/gemini/settings';

export const runtime = 'nodejs';

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save'),
    settings: z.object({
      enabled: z.boolean(),
      model: z.string().trim().min(1).max(160),
      imageModel: z.enum(['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image']),
      apiKey: z.string().trim().max(500).optional().default(''),
    }).strict(),
  }).strict(),
  z.object({
    action: z.literal('models'),
    apiKey: z.string().trim().max(500).optional().default(''),
  }).strict(),
]);

function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/unable to authenticate data|unsupported state/i.test(message)) {
    return 'Сохранённый ключ относится к другому окружению. Введите API-ключ ещё раз в этой версии сайта.';
  }
  if (/api key|API_KEY_INVALID|permission|unauthenticated/i.test(message)) {
    return 'Gemini не принял API-ключ. Проверьте ключ и доступ к Gemini API.';
  }
  if (/quota|resource_exhausted|rate limit/i.test(message)) {
    return 'Лимит Gemini временно исчерпан. Попробуйте позже или выберите другую модель.';
  }
  if (/fetch|timeout|aborted/i.test(message)) {
    return 'Не удалось связаться с Gemini. Проверьте интернет и повторите попытку.';
  }
  return 'Настройки Gemini не сохранены. Проверьте ключ и выбранную модель.';
}

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    const settings = await getGeminiPrivateSettings();
    let models: GeminiModelOption[] = [];
    let modelsWarning = '';
    if (settings.apiKeyEncrypted) {
      try {
        models = await listGeminiTextModels(decryptSecret(settings.apiKeyEncrypted));
      } catch (error) {
        console.error('Gemini model list loading failed.', error);
        modelsWarning = publicError(error);
      }
    }
    return NextResponse.json({
      settings: toPublicAdminGeminiSettings(settings),
      models,
      modelsWarning,
    });
  } catch (error) {
    console.error('Gemini settings loading failed.', error);
    return NextResponse.json({ error: 'Не удалось загрузить настройки Gemini.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Проверьте настройки Gemini.', issues: parsed.error.issues }, { status: 400 });
    }

    const current = await getGeminiPrivateSettings();
    const data = parsed.data;
    if (data.action === 'models') {
      const apiKey = data.apiKey
        || (current.apiKeyEncrypted ? decryptSecret(current.apiKeyEncrypted) : '');
      if (!apiKey) return NextResponse.json({ error: 'Сначала добавьте API-ключ Gemini.' }, { status: 400 });
      return NextResponse.json({ models: await listGeminiTextModels(apiKey) });
    }

    const apiKey = data.settings.apiKey
      || (current.apiKeyEncrypted ? decryptSecret(current.apiKeyEncrypted) : '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Добавьте API-ключ Gemini.' }, { status: 400 });
    }

    const models = await listGeminiTextModels(apiKey);
    if (!models.some((model) => model.id === data.settings.model)) {
      return NextResponse.json({ error: 'Выбранная модель недоступна для этого API-ключа.' }, { status: 400 });
    }

    const apiKeyEncrypted = data.settings.apiKey
      ? encryptSecret(data.settings.apiKey)
      : current.apiKeyEncrypted;
    const apiKeyLast4 = data.settings.apiKey
      ? data.settings.apiKey.slice(-4)
      : current.apiKeyLast4;
    const settings = {
      enabled: data.settings.enabled,
      model: data.settings.model,
      imageModel: data.settings.imageModel,
      apiKeyEncrypted: apiKeyEncrypted || '',
      apiKeyLast4: apiKeyLast4 || '',
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid,
    };
    await saveGeminiPrivateSettings(settings);
    return NextResponse.json({
      message: 'Gemini подключён. Переводы доступны в многоязычных формах.',
      settings: toPublicAdminGeminiSettings(settings),
      models,
      modelsWarning: '',
    });
  } catch (error) {
    console.error('Gemini settings operation failed.', error);
    return NextResponse.json({ error: publicError(error) }, { status: 503 });
  }
}
