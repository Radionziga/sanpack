import { buildAnalyticsReport, analyticsDateRange } from '@/lib/analytics/report';
import type { AnalyticsDashboardReport, StoredAnalyticsEvent } from '@/lib/analytics/contracts';

export function syntheticAnalyticsReport(from: string, to: string): AnalyticsDashboardReport {
  const filter = analyticsDateRange(from, to);
  const products = [
    { id: 'fixture-packaged', name: 'Контейнер из алюминиевой фольги FP-005', sku: 'SP-FP-005', categoryId: 'grocery' },
    { id: 'fixture-wholesale', name: 'Пакеты для закупки', sku: 'FIXTURE-WHOLESALE', categoryId: 'grocery' },
  ];
  const base = Math.max(filter.from.getTime() + 60_000, filter.to.getTime() - 8 * 60 * 60 * 1000);
  const make = (offset: number, event: Partial<StoredAnalyticsEvent> & Pick<StoredAnalyticsEvent, 'name'>): StoredAnalyticsEvent => ({
    occurredAt: new Date(base + offset * 60_000), visitorId: offset < 8 ? 'visitor-a' : 'visitor-b',
    visitorFirstSeenAt: new Date(base - 60_000), sessionId: offset < 8 ? 'session-a' : 'session-b',
    locale: offset % 2 ? 'uz' : 'ru', surface: offset % 3 ? 'web' : 'telegram_mini_app', deviceClass: offset % 3 ? 'desktop' : 'mobile',
    attribution: offset < 8
      ? { source: 'instagram', medium: 'paid_social', campaign: 'autumn-horeca', landingPathname: '/ru/catalog' }
      : { source: 'direct', landingPathname: '/ru' },
    ...event,
  });
  const events: StoredAnalyticsEvent[] = [
    make(1, { name: 'page_view', pathname: '/ru', routeType: 'home' }),
    make(2, { name: 'catalog_view', pathname: '/ru/catalog', routeType: 'catalog' }),
    make(3, { name: 'product_view', productId: products[0].id, slug: 'fixture-packaged', categoryId: 'grocery' }),
    make(4, { name: 'add_to_cart', productId: products[0].id, categoryId: 'grocery', quantity: 1000 }),
    make(5, { name: 'request_start', lineCount: 1, pricedLineCount: 1, requestPriceLineCount: 0 }),
    make(6, { name: 'request_created', productIds: [products[0].id], lineCount: 1, requestPriceLineCount: 0 }),
    make(9, { name: 'page_view', pathname: '/ru/search', routeType: 'search' }),
    make(10, { name: 'search', query: 'бумажные стаканы', resultCount: 0 }),
    make(11, { name: 'product_view', productId: products[1].id, slug: 'fixture-wholesale', categoryId: 'grocery' }),
  ];
  return buildAnalyticsReport({ events, filter, products, categories: [{ id: 'grocery', name: 'Продукты' }], collectionStartedAt: events[0].occurredAt });
}
