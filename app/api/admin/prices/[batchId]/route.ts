import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { hasAdminCapability } from '@/lib/auth/adminCapabilities';
import { applyPriceBatch, getPriceBatch, isPriceConflict, previewPriceRollback, priceOperationMessage, rollbackPriceBatch } from '@/lib/pricing/priceManagerServer';
import { presentPriceBatch, presentRollback } from '@/lib/pricing/priceManagerPresentation';
import { logError } from '@/lib/observability/logger';

export const runtime = 'nodejs';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('apply'), warningsConfirmed: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal('rollback') }).strict(),
]);

async function authorize() {
  const admin = await getAdminSession();
  if (!admin) return { admin: null, response: NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 }) };
  if (!hasAdminCapability(admin.role, 'pricing.write')) return { admin: null, response: NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 }) };
  return { admin, response: null };
}

export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const authorization = await authorize();
  if (!authorization.admin) return authorization.response;
  const { batchId } = await params;
  if (!/^[a-zA-Z0-9-]{20,160}$/.test(batchId)) return NextResponse.json({ error: 'Некорректный идентификатор обновления.' }, { status: 400 });
  try {
    if (new URL(request.url).searchParams.get('rollback') === 'preview') return NextResponse.json(presentRollback(await previewPriceRollback(batchId)));
    const batch = await getPriceBatch(batchId);
    return batch ? NextResponse.json(presentPriceBatch(batch)) : NextResponse.json({ error: 'Обновление не найдено.' }, { status: 404 });
  } catch (error) {
    const message = priceOperationMessage(error);
    if (message) return NextResponse.json({ error: message }, { status: 409 });
    logError('Price batch read failed.', error);
    return NextResponse.json({ error: 'Не удалось загрузить обновление цен.' }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const authorization = await authorize();
  if (!authorization.admin) return authorization.response;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректное действие.' }, { status: 400 });
  const { batchId } = await params;
  if (!/^[a-zA-Z0-9-]{20,160}$/.test(batchId)) return NextResponse.json({ error: 'Некорректный идентификатор обновления.' }, { status: 400 });
  try {
    if (parsed.data.action === 'apply') {
      const result = await applyPriceBatch(authorization.admin, batchId, parsed.data.warningsConfirmed);
      revalidateTag('products', { expire: 0 });
      return NextResponse.json({ ...presentPriceBatch(result.batch), idempotent: result.idempotent });
    }
    const batch = await rollbackPriceBatch(authorization.admin, batchId);
    revalidateTag('products', { expire: 0 });
    return NextResponse.json(presentPriceBatch(batch));
  } catch (error) {
    const message = priceOperationMessage(error);
    if (message) return NextResponse.json({ error: message }, { status: isPriceConflict(error) ? 409 : 400 });
    logError('Price batch mutation failed.', error);
    return NextResponse.json({ error: 'Операция с ценами не завершена. Production-данные не изменены.' }, { status: 503 });
  }
}
