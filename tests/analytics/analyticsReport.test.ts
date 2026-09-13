import { describe, expect, it } from 'vitest';
import { analyticsDateRange, buildAnalyticsReport } from '@/lib/analytics/report';
import type { StoredAnalyticsEvent } from '@/lib/analytics/contracts';

function event(name: StoredAnalyticsEvent['name'], hour: number, extra: Partial<StoredAnalyticsEvent> = {}): StoredAnalyticsEvent {
  return {
    name,
    occurredAt: new Date(`2026-09-13T${String(hour).padStart(2, '0')}:00:00Z`),
    visitorId: hour < 4 ? 'v1' : 'v2',
    visitorFirstSeenAt: new Date('2026-09-13T00:00:00Z'),
    sessionId: hour < 4 ? 's1' : 's2',
    locale: 'ru', surface: 'web', deviceClass: 'desktop',
    attribution: { source: 'instagram', medium: 'paid_social', campaign: 'horeca', landingPathname: '/ru/catalog' },
    ...extra,
  };
}

describe('analytics report', () => {
  it('calculates exact visitors, funnel, campaigns, products and empty searches', () => {
    const filter = analyticsDateRange('2026-09-13', '2026-09-13');
    const events = [
      event('page_view', 1, { pathname: '/ru/catalog', routeType: 'catalog' }),
      event('product_view', 2, { productId: 'p1', slug: 'p1' }),
      event('add_to_cart', 3, { productId: 'p1', quantity: 1 }),
      event('search', 4, { query: 'не найдено', resultCount: 0 }),
      event('request_created', 5, { productIds: ['p1'], lineCount: 1 }),
    ];
    const report = buildAnalyticsReport({ events, filter, products: [{ id: 'p1', name: 'Товар', sku: 'SKU-1' }], categories: [], collectionStartedAt: events[0].occurredAt });
    expect(report.metrics.visitors.value).toBe(2);
    expect(report.metrics.requests.value).toBe(1);
    expect(report.funnel.at(-1)?.count).toBe(1);
    expect(report.topProducts[0]).toMatchObject({ productId: 'p1', views: 1, cartAdds: 1, requests: 1 });
    expect(report.campaigns[0]).toMatchObject({ source: 'instagram', campaign: 'horeca', sessions: 2, requests: 1 });
    expect(report.zeroResultSearches).toEqual([{ query: 'не найдено', searches: 1 }]);
  });

  it('uses Asia/Tashkent inclusive day boundaries and caps reports at 90 days', () => {
    const filter = analyticsDateRange('2026-09-13', '2026-09-13');
    expect(filter.from.toISOString()).toBe('2026-09-12T19:00:00.000Z');
    expect(filter.to.toISOString()).toBe('2026-09-13T19:00:00.000Z');
    expect(() => analyticsDateRange('2026-01-01', '2026-09-13')).toThrow();
  });
});
