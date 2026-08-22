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
import { checkRateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

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
  try {
    const body = await request.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Проверьте заполненные данные.' }, { status: 400 });

    // This is a best-effort, process-local cost safeguard. It is deliberately
    // not presented as distributed protection across App Hosting instances.
    const rateLimit = checkRateLimit(
      request,
      parsed.data.action === 'generate' ? 'bag-designer-generate' : 'bag-designer-submit',
      parsed.data.action === 'generate' ? 3 : 20,
      parsed.data.action === 'generate' ? 60 * 60 * 1000 : 10 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте немного позже.' },
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
        return NextResponse.json({ error: 'Черновик заявки не найден. Создайте визуализацию ещё раз.' }, { status: 404 });
      }
      if (result.outcome === 'already-submitted') {
        return NextResponse.json({ error: 'Эта заявка уже отправлена.' }, { status: 409 });
      }
      if (result.outcome === 'not-ready') {
        return NextResponse.json({ error: 'Визуализация ещё не готова.' }, { status: 409 });
      }
      const submitted = result.record as unknown as BagDesignRequestRecord;
      try { await notifyAboutBagDesignRequest(submitted); } catch (error) { console.error('Bag design notification failed.', error); }
      return NextResponse.json({ message: 'Заявка отправлена. Менеджер свяжется с вами для расчёта.', number: submitted.number });
    }

    const generation = parsed.data;
    const settings = await getBagDesignerSettings();
    if (!settings.enabled) return NextResponse.json({ error: 'Конструктор сейчас недоступен.' }, { status: 404 });
    if (generation.spec.quantity < settings.minimumQuantity) {
      return NextResponse.json({ error: `Минимальный тираж — ${settings.minimumQuantity.toLocaleString('ru-RU')} шт.` }, { status: 400 });
    }
    const gemini = await getGeminiPrivateSettings();
    if (!gemini.enabled || !gemini.apiKeyEncrypted) {
      return NextResponse.json({ error: 'Визуализация временно недоступна. Свяжитесь с менеджером.' }, { status: 503 });
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
      return NextResponse.json({ error: 'Ключ генерации уже использован для другого макета.' }, { status: 409 });
    }
    if (decision.next === 'busy') {
      return NextResponse.json({ error: 'Эта визуализация уже создаётся.' }, { status: 409 });
    }
    if (decision.next === 'reuse') {
      return NextResponse.json({
        requestId: id,
        requestToken: generation.requestToken,
        number: decision.existing?.number,
        aiMockupUrl: decision.existing?.aiMockupUrl,
      });
    }

    try {
      const mockup = await generateBagMockup({
        apiKey: decryptSecret(gemini.apiKeyEncrypted),
        model: gemini.imageModel || 'gemini-3.1-flash-image',
        technicalPreview: { mimeType: technical.mimeType, data: technical.data },
        prompt: [
          'Create a photorealistic commercial product mockup based strictly on the attached technical layout.',
          `Bag type: ${BAG_TYPE_LABELS[spec.bagType]}. Size: ${spec.width}×${spec.height} cm${spec.gusset ? `, gusset ${spec.gusset} cm` : ''}.`,
          'The supplied technical layout is intentionally neutral gray and does not represent the production material color.',
          `Render the finished bag in the exact selected production color: ${spec.colorLabel} (${spec.color}); finish: ${spec.finish}. Do not copy the gray fill from the technical layout.`,
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
        generationFailedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('Bag designer operation failed.', error);
    const message = error instanceof Error ? error.message : '';
    if (/unable to authenticate data|unsupported state/i.test(message)) {
      return NextResponse.json({ error: 'Настройки визуализации нужно сохранить заново в этой версии сайта.' }, { status: 503 });
    }
    if (/api key|API_KEY_INVALID|permission|unauthenticated/i.test(message)) {
      return NextResponse.json({ error: 'Сервис визуализации не принял API-ключ. Проверьте настройки Gemini в панели администратора.' }, { status: 503 });
    }
    if (/not found|not supported|model/i.test(message)) {
      return NextResponse.json({ error: 'Выбранная модель визуализации сейчас недоступна. Выберите другую модель в настройках Gemini.' }, { status: 503 });
    }
    if (/quota|resource.exhausted|rate limit/i.test(message)) {
      return NextResponse.json({ error: 'Сервис визуализации временно недоступен. Попробуйте ещё раз немного позже.' }, { status: 503 });
    }
    if (/timeout|aborted|fetch/i.test(message)) {
      return NextResponse.json({ error: 'Создание визуализации заняло слишком много времени. Попробуйте ещё раз.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Не удалось завершить операцию. Изменения не применены.' }, { status: 503 });
  }
}
