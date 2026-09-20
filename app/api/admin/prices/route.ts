import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { hasAdminCapability } from '@/lib/auth/adminCapabilities';
import { listPriceHistory } from '@/lib/pricing/priceManagerServer';
import { logError } from '@/lib/observability/logger';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  if (!hasAdminCapability(admin.role, 'pricing.write')) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });
  try {
    return NextResponse.json({ history: await listPriceHistory() });
  } catch (error) {
    logError('Price history read failed.', error);
    return NextResponse.json({ error: 'История обновлений цен временно недоступна.' }, { status: 503 });
  }
}
