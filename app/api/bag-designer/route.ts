import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminStorage } from '@/lib/firebase/admin';
import { getBagDesignerSettings } from '@/lib/bag-designer/settings';
import { BAG_TYPE_LABELS } from '@/lib/bag-designer/defaults';
import { generateBagMockup } from '@/lib/bag-designer/gemini';
import { getGeminiPrivateSettings } from '@/lib/gemini/settings';
import { decryptSecret } from '@/lib/telegram/secrets';
import { notifyAboutBagDesignRequest } from '@/lib/telegram/notifications';
import type { BagDesignRequestRecord } from '@/lib/bag-designer/types';
import { decideBagGeneration } from '@/lib/bag-designer/draftLifecycle';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { logError } from '@/lib/observability/logger';

export const runtime = 'nodejs';

const languageSchema = z.enum(['ru', 'uz', 'en', 'zh']);
type DesignerLanguage = z.infer<typeof languageSchema>;

const apiCopy: Record<DesignerLanguage, {
  invalid: string; rateLimited: string; draftMissing: string; alreadySubmitted: string;
  notReady: string; submitted: string; disabled: string; unavailable: string;
  conflict: string; busy: string; resetSettings: string; badKey: string;
  badModel: string; quota: string; timeout: string; generic: string;
  minimum: (quantity: string) => string;
}> = {
  ru: {
    invalid: 'Проверьте заполненные данные.', rateLimited: 'Слишком много попыток. Попробуйте немного позже.',
    draftMissing: 'Черновик заявки не найден. Создайте визуализацию ещё раз.', alreadySubmitted: 'Эта заявка уже отправлена.', notReady: 'Визуализация ещё не готова.',
    submitted: 'Заявка отправлена. Менеджер свяжется с вами для расчёта.', disabled: 'Конструктор сейчас недоступен.', unavailable: 'Визуализация временно недоступна. Контакты сохранены — менеджер сможет связаться с вами.',
    conflict: 'Ключ генерации уже использован для другого макета.', busy: 'Эта визуализация уже создаётся.', resetSettings: 'Настройки визуализации нужно сохранить заново в этой версии сайта.',
    badKey: 'Сервис визуализации не принял API-ключ. Проверьте настройки Gemini в панели администратора.', badModel: 'Выбранная модель визуализации сейчас недоступна. Выберите другую модель в настройках Gemini.',
    quota: 'Сервис визуализации временно недоступен. Попробуйте ещё раз немного позже.', timeout: 'Создание визуализации заняло слишком много времени. Попробуйте ещё раз.', generic: 'Не удалось завершить операцию. Изменения не применены.',
    minimum: (quantity) => `Минимальный тираж — ${quantity} шт.`,
  },
  uz: {
    invalid: 'Kiritilgan ma’lumotlarni tekshiring.', rateLimited: 'Urinishlar juda ko‘p. Birozdan keyin qayta urinib ko‘ring.',
    draftMissing: 'So‘rov qoralamasi topilmadi. Vizualizatsiyani qayta yarating.', alreadySubmitted: 'Bu so‘rov allaqachon yuborilgan.', notReady: 'Vizualizatsiya hali tayyor emas.',
    submitted: 'So‘rov yuborildi. Hisob-kitob uchun menejer siz bilan bog‘lanadi.', disabled: 'Konstruktor hozir ishlamayapti.', unavailable: 'Vizualizatsiya vaqtincha ishlamayapti. Kontaktlaringiz saqlandi — menejer siz bilan bog‘lana oladi.',
    conflict: 'Generatsiya kaliti boshqa maket uchun ishlatilgan.', busy: 'Bu vizualizatsiya allaqachon yaratilmoqda.', resetSettings: 'Vizualizatsiya sozlamalarini ushbu sayt versiyasida qayta saqlash kerak.',
    badKey: 'Vizualizatsiya xizmati API kalitini qabul qilmadi. Admin panelida Gemini sozlamalarini tekshiring.', badModel: 'Tanlangan vizualizatsiya modeli hozir mavjud emas. Gemini sozlamalarida boshqa modelni tanlang.',
    quota: 'Vizualizatsiya xizmati vaqtincha ishlamayapti. Birozdan keyin qayta urinib ko‘ring.', timeout: 'Vizualizatsiya yaratish juda uzoq davom etdi. Qayta urinib ko‘ring.', generic: 'Amalni yakunlab bo‘lmadi. O‘zgarishlar qo‘llanmadi.',
    minimum: (quantity) => `Minimal tiraj — ${quantity} dona.`,
  },
  en: {
    invalid: 'Check the entered information.', rateLimited: 'Too many attempts. Try again a little later.',
    draftMissing: 'The request draft was not found. Create the visualization again.', alreadySubmitted: 'This request has already been sent.', notReady: 'The visualization is not ready yet.',
    submitted: 'Request sent. A manager will contact you with an estimate.', disabled: 'The bag designer is currently unavailable.', unavailable: 'Visualization is temporarily unavailable. Your contact details were saved so a manager can reach you.',
    conflict: 'This generation key was already used for another layout.', busy: 'This visualization is already being created.', resetSettings: 'Visualization settings must be saved again for this version of the site.',
    badKey: 'The visualization service rejected the API key. Check Gemini settings in the admin panel.', badModel: 'The selected visualization model is unavailable. Choose another model in Gemini settings.',
    quota: 'The visualization service is temporarily unavailable. Try again later.', timeout: 'Creating the visualization took too long. Try again.', generic: 'The operation could not be completed. No changes were applied.',
    minimum: (quantity) => `Minimum quantity is ${quantity} pcs.`,
  },
  zh: {
    invalid: '请检查所填写的信息。', rateLimited: '尝试次数过多，请稍后再试。',
    draftMissing: '未找到申请草稿，请重新生成效果图。', alreadySubmitted: '此申请已提交。', notReady: '效果图尚未生成完成。',
    submitted: '申请已提交，客户经理将与您联系并提供报价。', disabled: '包装袋设计器当前不可用。', unavailable: '效果图服务暂时不可用。您的联系方式已保存，客户经理可以与您联系。',
    conflict: '此生成密钥已用于其他设计。', busy: '此效果图正在生成。', resetSettings: '需要在当前网站版本中重新保存效果图设置。',
    badKey: '效果图服务未接受 API 密钥，请在管理后台检查 Gemini 设置。', badModel: '所选效果图模型当前不可用，请在 Gemini 设置中选择其他模型。',
    quota: '效果图服务暂时不可用，请稍后再试。', timeout: '效果图生成时间过长，请重试。', generic: '操作未能完成，未应用任何更改。',
    minimum: (quantity) => `最低生产数量为 ${quantity} 件。`,
  },
};

const specSchema = z.object({
  bagType: z.enum(['tshirt', 'die-cut', 'flat']),
  width: z.number().min(10).max(120),
  height: z.number().min(15).max(150),
  gusset: z.number().min(0).max(40),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  colorLabel: z.string().trim().min(1).max(80),
  finish: z.enum(['matte', 'glossy']),
  quantity: z.number().int().min(1).max(10_000_000),
  logoX: z.number().min(0).max(100),
  logoY: z.number().min(0).max(100),
  logoScale: z.number().min(10).max(100),
  logoRotation: z.number().min(-180).max(180),
}).strict();

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(32),
}).strict();

const imageSchema = z.string().max(12_000_000).regex(/^data:image\/(png|jpeg|webp);base64,/i);

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate'),
    language: languageSchema,
    contact: contactSchema,
    spec: specSchema,
    logoName: z.string().trim().min(1).max(180),
    logoDataUrl: imageSchema,
    technicalPreviewDataUrl: imageSchema,
    generationKey: z.string().uuid(),
    requestToken: z.string().trim().min(64).max(200),
  }).strict(),
  z.object({
    action: z.literal('submit'),
    language: languageSchema,
    requestId: z.string().trim().min(8).max(100),
    requestToken: z.string().trim().min(32).max(200),
  }).strict(),
]);

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error('Некорректный формат изображения.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) throw new Error('Изображение слишком большое.');
  return { mimeType: match[1].toLowerCase(), data: match[2], buffer };
}

async function saveAsset(path: string, buffer: Buffer, contentType: string) {
  const bucket = getAdminStorage().bucket();
  const token = randomUUID();
  const file = bucket.file(path);
  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function tokenHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function generationPayloadHash({
  contact,
  spec,
  logoName,
  logo,
  technical,
}: {
  contact: z.infer<typeof contactSchema>;
  spec: z.infer<typeof specSchema>;
  logoName: string;
  logo: Buffer;
  technical: Buffer;
}) {
  return tokenHash(JSON.stringify({
    contact,
    spec,
    logoName,
    logoHash: tokenHash(logo.toString('base64')),
    technicalHash: tokenHash(technical.toString('base64')),
  }));
}

export async function POST(request: Request) {
  let responseLanguage: DesignerLanguage = 'ru';
  try {
    const body = await request.json().catch(() => null);
    const requestedLanguage = languageSchema.safeParse(
      body && typeof body === 'object' && 'language' in body ? body.language : undefined,
    );
    if (requestedLanguage.success) responseLanguage = requestedLanguage.data;
    const copy = apiCopy[responseLanguage];
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: copy.invalid }, { status: 400 });

    const rateLimit = await checkDistributedRateLimit(
      request,
      parsed.data.action === 'generate' ? 'bag-designer-generate' : 'bag-designer-submit',
      parsed.data.action === 'generate' ? 3 : 20,
      parsed.data.action === 'generate' ? 60 * 60 * 1000 : 10 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: copy.rateLimited },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    if (parsed.data.action === 'submit') {
      const reference = getAdminDb().collection('bagDesignRequests').doc(parsed.data.requestId);
      const submittedAt = new Date().toISOString();
      const result = await getAdminDb().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const data = snapshot.data();
        if (!snapshot.exists || data?.requestTokenHash !== tokenHash(parsed.data.requestToken)) {
          return { outcome: 'not-found' as const };
        }
        if (data.status !== 'draft') return { outcome: 'already-submitted' as const };
        if (data.generationState !== 'ready' || !data.aiMockupUrl) {
          return { outcome: 'not-ready' as const };
        }
        transaction.update(reference, {
          status: 'new',
          submittedAt,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return {
          outcome: 'submitted' as const,
          record: { id: snapshot.id, ...data, status: 'new', submittedAt },
        };
      });
      if (result.outcome === 'not-found') {
        return NextResponse.json({ error: copy.draftMissing }, { status: 404 });
      }
      if (result.outcome === 'already-submitted') {
        return NextResponse.json({ error: copy.alreadySubmitted }, { status: 409 });
      }
      if (result.outcome === 'not-ready') {
        return NextResponse.json({ error: copy.notReady }, { status: 409 });
      }
      const submitted = result.record as unknown as BagDesignRequestRecord;
      try { await notifyAboutBagDesignRequest(submitted); } catch (error) { logError('bag_designer.notification_failed', error, { requestId: submitted.id }); }
      return NextResponse.json({ message: copy.submitted, number: submitted.number });
    }

    const generation = parsed.data;
    const settings = await getBagDesignerSettings();
    if (!settings.enabled) return NextResponse.json({ error: copy.disabled }, { status: 404 });
    if (generation.spec.quantity < settings.minimumQuantity) {
      const locale = responseLanguage === 'uz' ? 'uz-UZ' : responseLanguage === 'en' ? 'en-US' : responseLanguage === 'zh' ? 'zh-CN' : 'ru-RU';
      return NextResponse.json({ error: copy.minimum(settings.minimumQuantity.toLocaleString(locale)) }, { status: 400 });
    }
    const logo = parseDataUrl(generation.logoDataUrl);
    const technical = parseDataUrl(generation.technicalPreviewDataUrl);
    const spec = generation.spec;
    const id = tokenHash(generation.generationKey);
    const requestTokenHash = tokenHash(generation.requestToken);
    const payloadHash = generationPayloadHash({
      contact: generation.contact,
      spec,
      logoName: generation.logoName,
      logo: logo.buffer,
      technical: technical.buffer,
    });
    const reference = getAdminDb().collection('bagDesignRequests').doc(id);
    const generationStartedAt = new Date().toISOString();
    const number = `PKG-${generationStartedAt.slice(2, 10).replaceAll('-', '')}-${id.slice(0, 4).toUpperCase()}`;
    const decision = await getAdminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const existing = snapshot.exists ? snapshot.data() || {} : null;
      const next = decideBagGeneration({
        existing,
        requestTokenHash,
        payloadHash,
        now: Date.now(),
      });
      if (next === 'create') {
        transaction.create(reference, {
          number,
          status: 'draft',
          generationState: 'processing',
          generationStartedAt,
          requestTokenHash,
          payloadHash,
          contact: generation.contact,
          locale: generation.language,
          spec,
          logoName: generation.logoName,
          createdAt: generationStartedAt,
          updatedAt: generationStartedAt,
        });
      } else if (next === 'retry') {
        transaction.update(reference, { generationState: 'processing', generationStartedAt, updatedAt: generationStartedAt });
      }
      return { next, existing };
    });
    if (decision.next === 'conflict') {
      return NextResponse.json({ error: copy.conflict }, { status: 409 });
    }
    if (decision.next === 'busy') {
      return NextResponse.json({ error: copy.busy }, { status: 409 });
    }
    if (decision.next === 'reuse') {
      return NextResponse.json({
        requestId: id,
        requestToken: generation.requestToken,
        number: decision.existing?.number,
        aiMockupUrl: decision.existing?.aiMockupUrl,
      });
    }

    const gemini = await getGeminiPrivateSettings();
    if (!gemini.enabled || !gemini.apiKeyEncrypted) {
      await reference.update({
        generationState: 'failed',
        generationFailureCode: 'service_unavailable',
        generationFailedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
      return NextResponse.json({ error: copy.unavailable }, { status: 503 });
    }

    try {
      const mockup = await generateBagMockup({
        apiKey: decryptSecret(gemini.apiKeyEncrypted),
        model: gemini.imageModel || 'gemini-3.1-flash-image',
        technicalPreview: { mimeType: technical.mimeType, data: technical.data },
        prompt: [
          'Create a photorealistic commercial product mockup based strictly on the attached technical layout.',
          `Bag type: ${BAG_TYPE_LABELS[spec.bagType]}. Size: ${spec.width}×${spec.height} cm${spec.gusset ? `, gusset ${spec.gusset} cm` : ''}.`,
          `The technical layout already displays the selected production color: ${spec.colorLabel} (${spec.color}); finish: ${spec.finish}. Preserve that material color exactly.`,
          'Preserve the uploaded logo exactly: do not rewrite, redraw, translate, or invent text. Keep its placement and proportions from the layout.',
          'Show one clean bag in a premium neutral studio setting, realistic polyethylene material, soft shadow, no people, no extra branding, no watermark.',
        ].join(' '),
      });

      const folder = `bag-design-requests/${id}`;
      const assetPaths = {
        logo: `${folder}/logo.${logo.mimeType.split('/')[1]}`,
        technicalPreview: `${folder}/technical-preview.png`,
        aiMockup: `${folder}/ai-mockup.${mockup.mimeType.split('/')[1] || 'png'}`,
      };
      const [logoUrl, technicalPreviewUrl, aiMockupUrl] = await Promise.all([
        saveAsset(assetPaths.logo, logo.buffer, logo.mimeType),
        saveAsset(assetPaths.technicalPreview, technical.buffer, technical.mimeType),
        saveAsset(assetPaths.aiMockup, Buffer.from(mockup.data, 'base64'), mockup.mimeType),
      ]);
      await reference.update({
        generationState: 'ready',
        logoUrl,
        technicalPreviewUrl,
        aiMockupUrl,
        assetPaths,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ requestId: id, requestToken: generation.requestToken, number, aiMockupUrl });
    } catch (error) {
      await reference.update({
        generationState: 'failed',
        generationFailureCode: 'generation_failed',
        generationFailedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    logError('bag_designer.operation_failed', error, { language: responseLanguage });
    const copy = apiCopy[responseLanguage];
    const message = error instanceof Error ? error.message : '';
    if (/unable to authenticate data|unsupported state/i.test(message)) {
      return NextResponse.json({ error: copy.resetSettings }, { status: 503 });
    }
    if (/api key|API_KEY_INVALID|permission|unauthenticated/i.test(message)) {
      return NextResponse.json({ error: copy.badKey }, { status: 503 });
    }
    if (/not found|not supported|model/i.test(message)) {
      return NextResponse.json({ error: copy.badModel }, { status: 503 });
    }
    if (/quota|resource.exhausted|rate limit/i.test(message)) {
      return NextResponse.json({ error: copy.quota }, { status: 503 });
    }
    if (/timeout|aborted|fetch/i.test(message)) {
      return NextResponse.json({ error: copy.timeout }, { status: 504 });
    }
    return NextResponse.json({ error: copy.generic }, { status: 503 });
  }
}
