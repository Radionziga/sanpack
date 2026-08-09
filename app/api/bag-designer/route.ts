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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Проверьте заполненные данные.' }, { status: 400 });

    if (parsed.data.action === 'submit') {
      const reference = getAdminDb().collection('bagDesignRequests').doc(parsed.data.requestId);
      const snapshot = await reference.get();
      if (!snapshot.exists || snapshot.data()?.requestTokenHash !== tokenHash(parsed.data.requestToken)) {
        return NextResponse.json({ error: 'Черновик заявки не найден. Создайте визуализацию ещё раз.' }, { status: 404 });
      }
      if (snapshot.data()?.status !== 'draft') {
        return NextResponse.json({ error: 'Эта заявка уже отправлена.' }, { status: 409 });
      }
      await reference.update({ status: 'new', submittedAt: new Date().toISOString(), updatedAt: FieldValue.serverTimestamp() });
      const submitted = { id: snapshot.id, ...snapshot.data(), status: 'new' } as unknown as BagDesignRequestRecord;
      try { await notifyAboutBagDesignRequest(submitted); } catch (error) { console.error('Bag design notification failed.', error); }
      return NextResponse.json({ message: 'Заявка отправлена. Менеджер свяжется с вами для расчёта.', number: snapshot.data()?.number });
    }

    const settings = await getBagDesignerSettings();
    if (!settings.enabled) return NextResponse.json({ error: 'Конструктор сейчас недоступен.' }, { status: 404 });
    if (parsed.data.spec.quantity < settings.minimumQuantity) {
      return NextResponse.json({ error: `Минимальный тираж — ${settings.minimumQuantity.toLocaleString('ru-RU')} шт.` }, { status: 400 });
    }
    const gemini = await getGeminiPrivateSettings();
    if (!gemini.enabled || !gemini.apiKeyEncrypted) {
      return NextResponse.json({ error: 'Визуализация временно недоступна. Свяжитесь с менеджером.' }, { status: 503 });
    }
    const logo = parseDataUrl(parsed.data.logoDataUrl);
    const technical = parseDataUrl(parsed.data.technicalPreviewDataUrl);
    const spec = parsed.data.spec;
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

    const id = randomUUID();
    const requestToken = randomUUID() + randomUUID();
    const number = `PKG-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${id.slice(0, 4).toUpperCase()}`;
    const folder = `bag-design-requests/${id}`;
    const [logoUrl, technicalPreviewUrl, aiMockupUrl] = await Promise.all([
      saveAsset(`${folder}/logo.${logo.mimeType.split('/')[1]}`, logo.buffer, logo.mimeType),
      saveAsset(`${folder}/technical-preview.png`, technical.buffer, technical.mimeType),
      saveAsset(`${folder}/ai-mockup.${mockup.mimeType.split('/')[1] || 'png'}`, Buffer.from(mockup.data, 'base64'), mockup.mimeType),
    ]);
    const record = {
      number,
      status: 'draft',
      contact: parsed.data.contact,
      spec,
      logoName: parsed.data.logoName,
      logoUrl,
      technicalPreviewUrl,
      aiMockupUrl,
      requestTokenHash: tokenHash(requestToken),
      createdAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await getAdminDb().collection('bagDesignRequests').doc(id).set(record);
    return NextResponse.json({ requestId: id, requestToken, number, aiMockupUrl });
  } catch (error) {
    console.error('Bag designer operation failed.', error);
    const message = error instanceof Error ? error.message : '';
    if (/quota|resource.exhausted|rate limit/i.test(message)) {
      return NextResponse.json({ error: 'Сервис визуализации временно недоступен. Попробуйте ещё раз немного позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Не удалось завершить операцию. Изменения не применены.' }, { status: 503 });
  }
}
