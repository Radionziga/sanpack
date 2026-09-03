import { logError } from '@/lib/observability/logger';
import { readJsonBody } from '@/lib/security/readJsonBody';
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { decryptSecret } from '@/lib/telegram/secrets';
import { getGeminiPrivateSettings } from '@/lib/gemini/settings';
import { translateCommerceFields, translationRequestSchema } from '@/lib/gemini/translation';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';

export const runtime = 'nodejs';

function translationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/quota|resource_exhausted|rate limit/i.test(message)) {
    return 'Лимит переводов временно исчерпан. Попробуйте позже.';
  }
  if (/API_KEY_INVALID|api key|permission|unauthenticated/i.test(message)) {
    return 'Gemini сейчас недоступен. Проверьте API-ключ в настройках интеграций.';
  }
  if (/fetch|timeout|aborted/i.test(message)) {
    return 'Не удалось связаться с Gemini. Попробуйте ещё раз.';
  }
  return 'Не удалось подготовить переводы. Попробуйте ещё раз.';
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    if (!['super_admin', 'content_manager'].includes(admin.role)) {
      return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });
    }
    const body = await readJsonBody(request);
    const parsed = translationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Добавьте исходный текст и выберите язык.', issues: parsed.error.issues }, { status: 400 });
    }
    const limit = await checkDistributedRateLimit(request, 'admin-translate', 30, 60 * 60 * 1000, admin.uid);
    if (!limit.allowed) return NextResponse.json({ error: 'Лимит запросов исчерпан.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    const settings = await getGeminiPrivateSettings();
    if (!settings.enabled || !settings.apiKeyEncrypted) {
      return NextResponse.json({ error: 'Сначала включите Gemini в настройках интеграций.' }, { status: 409 });
    }
    const translations = await translateCommerceFields({
      apiKey: decryptSecret(settings.apiKeyEncrypted),
      model: settings.model,
      sourceLanguage: parsed.data.sourceLanguage,
      fields: parsed.data.fields,
    });
    return NextResponse.json({ translations, model: settings.model });
  } catch (error) {
    logError('Gemini translation failed.', error);
    return NextResponse.json({ error: translationError(error) }, { status: 503 });
  }
}
