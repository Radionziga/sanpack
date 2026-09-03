import { logError } from '@/lib/observability/logger';
import { readJsonBody } from '@/lib/security/readJsonBody';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { generateGeminiImage, geminiImageModelIds } from '@/lib/gemini/api';
import { getGeminiPrivateSettings } from '@/lib/gemini/settings';
import { decryptSecret } from '@/lib/telegram/secrets';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';

export const runtime = 'nodejs';

const requestSchema = z.object({
  title: z.string().trim().min(2).max(240),
  category: z.string().trim().max(160).optional().default(''),
  brand: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().max(1_500).optional().default(''),
  attributes: z.record(z.string(), z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
  ])).optional().default({}),
  note: z.string().trim().max(800).optional().default(''),
}).strict();

function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/quota|resource_exhausted|rate limit/i.test(message)) {
    return 'Лимит Gemini временно исчерпан. Попробуйте позже или выберите другую модель.';
  }
  if (/api key|API_KEY_INVALID|permission|unauthenticated/i.test(message)) {
    return 'Gemini не принял API-ключ. Проверьте ключ в разделе «Интеграции».';
  }
  if (/safety|blocked|prohibited/i.test(message)) {
    return 'Gemini не создал изображение для этого описания. Измените примечание и попробуйте снова.';
  }
  if (/fetch|timeout|aborted/i.test(message)) {
    return 'Gemini отвечает слишком долго. Попробуйте ещё раз.';
  }
  return 'Изображение не создано. Попробуйте ещё раз.';
}

function buildPrompt(data: z.infer<typeof requestSchema>) {
  const attributes = Object.entries(data.attributes)
    .filter(([, value]) => value !== '' && value !== false)
    .slice(0, 24)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join('; ');

  return [
    'Create exactly one hyperrealistic commercial ecommerce product photograph for a catalog.',
    `Product: ${data.title}.`,
    data.category ? `Category: ${data.category}.` : '',
    data.description ? `Product details: ${data.description}.` : '',
    attributes ? `Known attributes: ${attributes}.` : '',
    data.note ? `Administrator note: ${data.note}. Follow it only when it does not conflict with the mandatory rules below.` : '',
    'Botanical and physical accuracy is mandatory. Preserve the defining product shape, material or skin texture, natural color variation, ripeness cues, proportions, and other identifying details provided above.',
    'Rendering quality: exceptionally detailed professional product photography with physically accurate materials, true-to-life microtexture, tiny natural surface imperfections, crisp subject detail, realistic subsurface scattering where appropriate, natural tonal transitions, and convincing depth.',
    'Mandatory composition: square 1:1 product photography, one coherent product presentation, pure white seamless background, centered object, realistic proportions and material, soft neutral high-end studio lighting, subtle natural contact shadow fully contained inside the frame, generous safe margin on every side, no object may touch or leave the image boundary.',
    'For loose foods such as rice, grain, berries, nuts, herbs, eggs, or similar products, show a natural compact serving or group appropriate to the product. Use plain unbranded neutral presentation only when containment is necessary.',
    'Do not add decorative scenery, props, plates, utensils, hands, people, borders, frames, badges, watermarks, typography, letters, numbers, logos, labels, or branded packaging.',
    'If the title contains a brand name, ignore the branding and depict only the underlying generic physical product. Never invent packaging, labels, logos, or lettering.',
    'The result must look like a real premium catalog photograph captured with a professional camera, not a render. Keep natural asymmetry and believable imperfections. Do not over-retouch, over-smooth, oversharpen, exaggerate saturation, stylize, or create a CGI, illustration, or plastic appearance.',
    'Return only the image.',
  ].filter(Boolean).join('\n');
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  if (admin.role !== 'super_admin' && admin.role !== 'content_manager') {
    return NextResponse.json({ error: 'У вашей роли нет прав на генерацию изображений.' }, { status: 403 });
  }

  const body = await readJsonBody(request);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message || 'Сначала укажите название товара.',
    }, { status: 400 });
  }

  if (parsed.data.brand) {
    return NextResponse.json({
      error: 'Для брендированного товара сначала загрузите исходную фотографию. Генерация упаковки с логотипом без исходника отключена, чтобы не искажать фирменный дизайн.',
    }, { status: 409 });
  }

  try {
    const limit = await checkDistributedRateLimit(request, 'admin-product-image', 20, 60 * 60 * 1000, admin.uid);
    if (!limit.allowed) return NextResponse.json({ error: 'Лимит запросов исчерпан.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    const settings = await getGeminiPrivateSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: 'Сначала включите Gemini в разделе «Интеграции».' }, { status: 409 });
    }
    if (!settings.apiKeyEncrypted) {
      return NextResponse.json({ error: 'Сначала добавьте API-ключ Gemini в разделе «Интеграции».' }, { status: 409 });
    }
    const model = settings.imageModel || 'gemini-3.1-flash-image';
    if (!geminiImageModelIds.includes(model)) {
      return NextResponse.json({ error: 'Выберите модель для изображений в настройках Gemini.' }, { status: 409 });
    }
    const image = await generateGeminiImage({
      apiKey: decryptSecret(settings.apiKeyEncrypted),
      model,
      prompt: buildPrompt(parsed.data),
    });
    return NextResponse.json({
      image: `data:${image.mimeType};base64,${image.data}`,
      mimeType: image.mimeType,
      model,
    });
  } catch (error) {
    logError('Product image generation failed.', error);
    return NextResponse.json({ error: publicError(error) }, { status: 503 });
  }
}
