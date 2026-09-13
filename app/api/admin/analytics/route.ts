import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { hasAdminCapability } from '@/lib/auth/adminCapabilities';
import { analyticsDateRange } from '@/lib/analytics/report';
import { syntheticAnalyticsReport } from '@/lib/analytics/fixture';
import { getAnalyticsReport } from '@/lib/analytics/repository';
import { logError } from '@/lib/observability/logger';
import type { AnalyticsSurface } from '@/lib/analytics/contracts';
import type { Language } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  if (!hasAdminCapability(admin.role, 'analytics.read')) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });
  try {
    const url = new URL(request.url);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
    const from = url.searchParams.get('from') || today;
    const to = url.searchParams.get('to') || today;
    const filter = analyticsDateRange(from, to);
    const locale = url.searchParams.get('locale');
    const surface = url.searchParams.get('surface');
    if (locale && ['ru', 'uz', 'en', 'zh'].includes(locale)) filter.locale = locale as Language;
    if (surface && ['web', 'telegram_mini_app'].includes(surface)) filter.surface = surface as AnalyticsSurface;
    filter.source = url.searchParams.get('source') || undefined;
    filter.campaign = url.searchParams.get('campaign') || undefined;
    filter.categoryId = url.searchParams.get('category') || undefined;
    const report = process.env.SANPACK_USE_SEED_DATA === 'true'
      ? syntheticAnalyticsReport(from, to)
      : await getAnalyticsReport(filter);
    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logError('analytics.report_failed', error);
    const invalidRange = error instanceof Error && /range|date/i.test(error.message);
    return NextResponse.json(
      { error: invalidRange ? 'Некорректный период.' : 'Не удалось загрузить аналитику.' },
      { status: invalidRange ? 400 : 503 },
    );
  }
}
