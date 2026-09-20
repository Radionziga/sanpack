import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { hasAdminCapability } from '@/lib/auth/adminCapabilities';
import { previewPriceWorkbook, priceOperationMessage } from '@/lib/pricing/priceManagerServer';
import { presentPriceBatch } from '@/lib/pricing/priceManagerPresentation';
import { PRICE_WORKBOOK_MAX_BYTES } from '@/lib/pricing/priceManagerTypes';
import { logError } from '@/lib/observability/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  if (!hasAdminCapability(admin.role, 'pricing.write')) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });
  const contentLength = request.headers.get('content-length');
  if (!contentLength || !/^\d+$/.test(contentLength)) return NextResponse.json({ error: 'Не удалось определить размер Excel.' }, { status: 411 });
  const length = Number(contentLength);
  if (!Number.isSafeInteger(length) || length <= 0) return NextResponse.json({ error: 'Некорректный размер Excel.' }, { status: 400 });
  if (length > PRICE_WORKBOOK_MAX_BYTES + 256 * 1024) return NextResponse.json({ error: 'Excel превышает допустимый размер 5 МБ.' }, { status: 413 });
  try {
    const form = await request.formData();
    const value = form.get('file');
    if (!(value instanceof File)) return NextResponse.json({ error: 'Выберите Excel-файл.' }, { status: 400 });
    if (!value.name.toLowerCase().endsWith('.xlsx') || value.name.toLowerCase().endsWith('.xlsm')) {
      return NextResponse.json({ error: 'Поддерживается только обычный файл .xlsx без макросов.' }, { status: 400 });
    }
    if (value.size <= 0 || value.size > PRICE_WORKBOOK_MAX_BYTES) return NextResponse.json({ error: 'Excel пустой или превышает допустимый размер 5 МБ.' }, { status: 413 });
    const allowedTypes = new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', '']);
    if (!allowedTypes.has(value.type)) return NextResponse.json({ error: 'Тип файла не соответствует .xlsx.' }, { status: 400 });
    const batch = await previewPriceWorkbook(admin, { name: value.name, buffer: Buffer.from(await value.arrayBuffer()) });
    return NextResponse.json(presentPriceBatch(batch));
  } catch (error) {
    const message = priceOperationMessage(error);
    if (message) return NextResponse.json({ error: message }, { status: 400 });
    logError('Price workbook preview failed.', error);
    return NextResponse.json({ error: 'Excel не удалось проверить. Скачайте свежий файл и повторите.' }, { status: 503 });
  }
}
