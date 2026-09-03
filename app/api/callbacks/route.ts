import { readJsonBody } from '@/lib/security/readJsonBody';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { logError } from '@/lib/observability/logger';

export const runtime = 'nodejs';

const callbackSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
});

export async function POST(request: Request) {
  const parsed = callbackSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Проверьте имя и номер телефона.' }, { status: 400 });
  }
  const rateLimit = await checkDistributedRateLimit(request, 'callback', 5, 10 * 60 * 1000);
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
    const input = parsed.data;
    const document = getAdminDb().collection('callbacks').doc();
    await document.create({
      id: document.id,
      ...input,
      status: 'new',
      createdAt: new Date().toISOString(),
      serverCreatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logError('callback.creation_failed', error);
    return NextResponse.json(
      { error: 'Запрос не сохранён. Попробуйте ещё раз.' },
      { status: 503 }
    );
  }
}
