import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { hasAdminCapability } from '@/lib/auth/adminCapabilities';
import { exportCurrentPrices } from '@/lib/pricing/priceManagerServer';
import { logError } from '@/lib/observability/logger';

export const runtime = 'nodejs';

function filename(createdAt: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(createdAt));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '00';
  return `SANPACK_prices_${value('year')}-${value('month')}-${value('day')}_${value('hour')}-${value('minute')}.xlsx`;
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  if (!hasAdminCapability(admin.role, 'pricing.write')) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });
  try {
    const result = await exportCurrentPrices(admin);
    return new NextResponse(new Uint8Array(result.workbook), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="${filename(result.createdAt)}"`,
        'cache-control': 'private, no-store',
        'x-sanpack-product-count': String(result.productCount),
        'x-sanpack-price-row-count': String(result.rowCount),
      },
    });
  } catch (error) {
    logError('Price workbook export failed.', error);
    return NextResponse.json({ error: 'Не удалось подготовить Excel. Повторите попытку позже.' }, { status: 503 });
  }
}
