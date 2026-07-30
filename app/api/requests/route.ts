import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

const itemSchema = z.object({
  productId: z.string().min(1).max(100),
  productTitleRu: z.string().min(1).max(240),
  productTitleUz: z.string().max(240).default(''),
  productTitleEn: z.string().max(240).optional(),
  productSlug: z.string().max(180).default(''),
  variantId: z.string().max(100).optional(),
  variantTitleRu: z.string().max(240).optional(),
  variantTitleUz: z.string().max(240).optional(),
  variantTitleEn: z.string().max(240).optional(),
  sku: z.string().max(100),
  quantity: z.number().int().positive().max(100000),
  unit: z.string().max(40),
  price: z.number().nonnegative().optional(),
  comment: z.string().max(500).optional(),
  image: z.string().max(500).optional(),
});

const requestSchema = z.object({
  companyName: z.string().min(2).max(160),
  inn: z.string().max(32).default(''),
  contactName: z.string().min(2).max(120),
  phone: z.string().min(7).max(32),
  deliveryType: z.string().max(50).default('courier'),
  deliveryAddress: z.string().max(500).default(''),
  paymentMethod: z.string().max(50).default('transfer'),
  notes: z.string().max(2000).default(''),
  items: z.array(itemSchema).min(1).max(50),
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, 'quote-request', 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter) },
      }
    );
  }

  try {
    const input = requestSchema.parse(await request.json());
    const document = getAdminDb().collection('requests').doc();
    const now = new Date().toISOString();
    const requestNumber = `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const order = {
      id: document.id,
      requestNumber,
      ...input,
      status: 'new',
      createdAt: now,
      updatedAt: now,
      serverCreatedAt: FieldValue.serverTimestamp(),
    };

    await document.create(order);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Проверьте поля заявки.', fields: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Request creation failed.', error);
    return NextResponse.json(
      { error: 'Заявка не была сохранена. Повторите отправку позже.' },
      { status: 503 }
    );
  }
}
