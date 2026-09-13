import { NextResponse } from 'next/server';
import { publicAnalyticsEventSchema } from '@/lib/analytics/contracts';
import { isLocalAnalyticsRequest } from '@/lib/analytics/model';
import { applyAnalyticsCookies, clearAnalyticsCookies, shouldSkipAnalytics, writeAnalyticsEvent } from '@/lib/analytics/server';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { readJsonBody } from '@/lib/security/readJsonBody';
import { hasTrustedMutationOrigin } from '@/lib/security/requestOrigin';
import { logError } from '@/lib/observability/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  if (isLocalAnalyticsRequest(request) && process.env.ANALYTICS_ALLOW_LOCAL_TESTS !== 'true') return new NextResponse(null, { status: 204 });
  if (shouldSkipAnalytics(request)) return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  const parsed = publicAnalyticsEventSchema.safeParse(await readJsonBody(request, 8_192));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid analytics event.' }, { status: 400 });
  try {
    const limit = await checkDistributedRateLimit(request, 'analytics-ingest', 120, 10 * 60 * 1000);
    if (!limit.allowed) return new NextResponse(null, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    const context = await writeAnalyticsEvent(request, parsed.data);
    const response = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    if (context) applyAnalyticsCookies(response, context);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'ANALYTICS_SESSION_LIMIT') return new NextResponse(null, { status: 429 });
    logError('analytics.ingestion_failed', error);
    return new NextResponse(null, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const response = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  clearAnalyticsCookies(response);
  return response;
}
