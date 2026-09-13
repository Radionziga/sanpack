import { beforeEach, describe, expect, it, vi } from 'vitest';

const { writeEvent, rateLimit } = vi.hoisted(() => ({ writeEvent: vi.fn(), rateLimit: vi.fn() }));
vi.mock('@/lib/analytics/server', async () => {
  const actual = await vi.importActual<typeof import('@/lib/analytics/server')>('@/lib/analytics/server');
  return { ...actual, writeAnalyticsEvent: writeEvent };
});
vi.mock('@/lib/security/distributedRateLimit', () => ({ checkDistributedRateLimit: rateLimit }));
vi.mock('@/lib/observability/logger', () => ({ logError: vi.fn() }));

import { POST } from '@/app/api/analytics/events/route';

function request(body: unknown) {
  return new Request('https://sanpack.uz/api/analytics/events', {
    method: 'POST',
    headers: { origin: 'https://sanpack.uz', 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' },
    body: JSON.stringify(body),
  });
}

describe('analytics ingestion route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
    writeEvent.mockResolvedValue({ visitorId: '11111111-1111-4111-8111-111111111111', sessionId: '22222222-2222-4222-8222-222222222222', isNewVisitor: true });
  });

  it('accepts a strict same-origin event and returns only opaque cookies', async () => {
    const response = await POST(request({ eventId: crypto.randomUUID(), name: 'page_view', pathname: '/ru/catalog?private=1', locale: 'ru', surface: 'web' }));
    expect(response.status).toBe(204);
    expect(writeEvent).toHaveBeenCalledOnce();
    expect(response.headers.get('set-cookie')).toContain('__sanpack_analytics_visitor');
  });

  it('rejects cross-origin, forged conversion and extra PII', async () => {
    const crossOrigin = request({ eventId: crypto.randomUUID(), name: 'page_view', pathname: '/ru', locale: 'ru', surface: 'web' });
    crossOrigin.headers.set('origin', 'https://attacker.example');
    expect((await POST(crossOrigin)).status).toBe(403);
    expect((await POST(request({ eventId: crypto.randomUUID(), name: 'request_created', locale: 'ru', surface: 'web' }))).status).toBe(400);
    expect((await POST(request({ eventId: crypto.randomUUID(), name: 'page_view', pathname: '/ru', locale: 'ru', surface: 'web', phone: '+998' }))).status).toBe(400);
  });
});
