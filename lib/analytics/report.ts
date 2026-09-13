import type {
  AnalyticsDashboardReport,
  AnalyticsFilter,
  AnalyticsMetric,
  StoredAnalyticsEvent,
} from '@/lib/analytics/contracts';
import { ANALYTICS_TIMEZONE, normalizeAcquisitionSource } from '@/lib/analytics/model';

type ProductLabel = { id: string; name: string; sku: string; categoryId?: string };

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
}

function metric(value: number, previous: number): AnalyticsMetric {
  return {
    value,
    previous,
    changePercent: previous > 0 ? Math.round(((value - previous) / previous) * 10_000) / 100 : value > 0 ? null : 0,
  };
}

function within(event: StoredAnalyticsEvent, from: Date, to: Date) {
  return event.occurredAt >= from && event.occurredAt < to;
}

function matches(event: StoredAnalyticsEvent, filter: AnalyticsFilter) {
  if (filter.locale && event.locale !== filter.locale) return false;
  if (filter.surface && event.surface !== filter.surface) return false;
  if (filter.source && normalizeAcquisitionSource(event.attribution.source) !== filter.source) return false;
  if (filter.campaign && event.attribution.campaign !== filter.campaign) return false;
  if (filter.categoryId && event.categoryId !== filter.categoryId) return false;
  return true;
}

function unique(events: StoredAnalyticsEvent[], key: 'visitorId' | 'sessionId') {
  return new Set(events.map((event) => event[key])).size;
}

function summarize(events: StoredAnalyticsEvent[]) {
  const visitors = new Set(events.map((event) => event.visitorId));
  const newVisitors = new Set(events
    .filter((event) => event.visitorFirstSeenAt >= (events[0]?.occurredAt ?? new Date(0)))
    .map((event) => event.visitorId));
  return {
    visitors: visitors.size,
    newVisitors: newVisitors.size,
    returningVisitors: Math.max(0, visitors.size - newVisitors.size),
    sessions: unique(events, 'sessionId'),
    pageViews: events.filter((event) => event.name === 'page_view').length,
    productViews: events.filter((event) => event.name === 'product_view').length,
    cartAdds: events.filter((event) => event.name === 'add_to_cart').length,
    requests: events.filter((event) => event.name === 'request_created').length,
  };
}

function localParts(date: Date) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone: ANALYTICS_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(values.map((part) => [part.type, part.value]));
}

function trendBucket(date: Date, granularity: 'hour' | 'day') {
  const part = localParts(date);
  const day = `${part.year}-${part.month}-${part.day}`;
  return granularity === 'hour' ? `${day}T${part.hour}:00` : day;
}

function buildTrend(events: StoredAnalyticsEvent[], granularity: 'hour' | 'day', from: Date, to: Date) {
  const buckets = new Map<string, StoredAnalyticsEvent[]>();
  events.forEach((event) => {
    const key = trendBucket(event.occurredAt, granularity);
    buckets.set(key, [...(buckets.get(key) || []), event]);
  });
  const stepMs = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  for (let cursor = from.getTime(); cursor < to.getTime(); cursor += stepMs) {
    const key = trendBucket(new Date(cursor), granularity);
    if (!buckets.has(key)) buckets.set(key, []);
  }
  return [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([bucket, bucketEvents]) => ({
    bucket,
    visitors: unique(bucketEvents, 'visitorId'),
    sessions: unique(bucketEvents, 'sessionId'),
    pageViews: bucketEvents.filter((event) => event.name === 'page_view').length,
    productViews: bucketEvents.filter((event) => event.name === 'product_view').length,
    cartAdds: bucketEvents.filter((event) => event.name === 'add_to_cart').length,
    requests: bucketEvents.filter((event) => event.name === 'request_created').length,
  }));
}

function funnel(events: StoredAnalyticsEvent[]) {
  const visitors = new Set(events.map((event) => event.visitorId));
  const definitions = [
    ['visitors', visitors],
    ['product_viewers', new Set(events.filter((event) => event.name === 'product_view').map((event) => event.visitorId))],
    ['cart_adders', new Set(events.filter((event) => event.name === 'add_to_cart').map((event) => event.visitorId))],
    ['request_starters', new Set(events.filter((event) => event.name === 'request_start').map((event) => event.visitorId))],
    ['request_creators', new Set(events.filter((event) => event.name === 'request_created').map((event) => event.visitorId))],
  ] as const;
  return definitions.map(([key, set], index) => ({
    key,
    count: set.size,
    fromPreviousPercent: index === 0 ? null : percent(set.size, definitions[index - 1][1].size),
    overallPercent: percent(set.size, visitors.size),
  }));
}

function topProducts(events: StoredAnalyticsEvent[], products: ProductLabel[]) {
  const labels = new Map(products.map((product) => [product.id, product]));
  const ids = new Set(events.flatMap((event) => event.productId ? [event.productId] : event.productIds || []));
  return [...ids].map((productId) => {
    const related = events.filter((event) => event.productId === productId || event.productIds?.includes(productId));
    const views = related.filter((event) => event.name === 'product_view').length;
    const cartAdds = related.filter((event) => event.name === 'add_to_cart').length;
    const requests = related.filter((event) => event.name === 'request_created').length;
    const label = labels.get(productId);
    return {
      productId,
      name: label?.name || 'Удалённый товар',
      sku: label?.sku || '—',
      ...(label?.categoryId ? { categoryId: label.categoryId } : {}),
      views,
      visitors: unique(related.filter((event) => event.name === 'product_view'), 'visitorId'),
      cartAdds,
      requests,
      viewToCartPercent: percent(cartAdds, views),
      viewToRequestPercent: percent(requests, views),
    };
  }).sort((left, right) => right.views - left.views || right.cartAdds - left.cartAdds).slice(0, 50);
}

function campaigns(events: StoredAnalyticsEvent[]) {
  const groups = new Map<string, StoredAnalyticsEvent[]>();
  events.forEach((event) => {
    const { medium = '—', campaign = '—' } = event.attribution;
    const source = normalizeAcquisitionSource(event.attribution.source);
    const key = `${source}\u0000${medium}\u0000${campaign}`;
    groups.set(key, [...(groups.get(key) || []), event]);
  });
  return [...groups.entries()].map(([key, related]) => {
    const [source, medium, campaign] = key.split('\u0000');
    const sessions = unique(related, 'sessionId');
    const requests = related.filter((event) => event.name === 'request_created').length;
    return {
      source, medium, campaign, sessions,
      productViews: related.filter((event) => event.name === 'product_view').length,
      cartAdds: related.filter((event) => event.name === 'add_to_cart').length,
      requests,
      conversionPercent: percent(requests, sessions),
    };
  }).sort((left, right) => right.sessions - left.sessions).slice(0, 50);
}

function topPages(events: StoredAnalyticsEvent[]) {
  const pageEvents = events.filter((event) => event.name === 'page_view' && event.pathname);
  const groups = new Map<string, StoredAnalyticsEvent[]>();
  pageEvents.forEach((event) => groups.set(event.pathname!, [...(groups.get(event.pathname!) || []), event]));
  return [...groups.entries()].map(([pathname, related]) => ({
    pathname,
    routeType: related[0]?.routeType || 'content',
    views: related.length,
    visitors: unique(related, 'visitorId'),
  })).sort((left, right) => right.views - left.views).slice(0, 30);
}

function breakdown(events: StoredAnalyticsEvent[], value: (event: StoredAnalyticsEvent) => string) {
  const sessionsByKey = new Map<string, Set<string>>();
  events.forEach((event) => {
    const key = value(event) || 'unknown';
    const sessions = sessionsByKey.get(key) || new Set<string>();
    sessions.add(event.sessionId);
    sessionsByKey.set(key, sessions);
  });
  return [...sessionsByKey].map(([key, sessions]) => ({ key, sessions: sessions.size })).sort((a, b) => b.sessions - a.sessions);
}

export function buildAnalyticsReport(input: {
  events: StoredAnalyticsEvent[];
  filter: AnalyticsFilter;
  products: ProductLabel[];
  categories: Array<{ id: string; name: string }>;
  truncated?: boolean;
  collectionStartedAt?: Date | null;
}): AnalyticsDashboardReport {
  const eligible = input.events.filter((event) => matches(event, input.filter));
  const current = eligible.filter((event) => within(event, input.filter.from, input.filter.to));
  const previous = eligible.filter((event) => within(event, input.filter.previousFrom, input.filter.previousTo));
  const currentSummary = summarize(current);
  const previousSummary = summarize(previous);
  const currentConversion = percent(currentSummary.requests, currentSummary.visitors);
  const previousConversion = percent(previousSummary.requests, previousSummary.visitors);
  const spanMs = input.filter.to.getTime() - input.filter.from.getTime();
  const granularity = spanMs <= 36 * 60 * 60 * 1000 ? 'hour' : 'day';
  const sources = [...new Set(input.events.map((event) => normalizeAcquisitionSource(event.attribution.source)))].sort();
  const campaignOptions = [...new Set(input.events.map((event) => event.attribution.campaign).filter((value): value is string => Boolean(value)))].sort();
  const newVisitorIds = new Set(current.filter((event) => event.visitorFirstSeenAt >= input.filter.from && event.visitorFirstSeenAt < input.filter.to).map((event) => event.visitorId));
  const previousNewVisitorIds = new Set(previous.filter((event) => event.visitorFirstSeenAt >= input.filter.previousFrom && event.visitorFirstSeenAt < input.filter.previousTo).map((event) => event.visitorId));
  currentSummary.newVisitors = newVisitorIds.size;
  currentSummary.returningVisitors = Math.max(0, currentSummary.visitors - newVisitorIds.size);
  previousSummary.newVisitors = previousNewVisitorIds.size;
  previousSummary.returningVisitors = Math.max(0, previousSummary.visitors - previousNewVisitorIds.size);

  return {
    period: { from: input.filter.from.toISOString(), to: input.filter.to.toISOString(), timezone: ANALYTICS_TIMEZONE, granularity },
    collectionStartedAt: input.collectionStartedAt?.toISOString() || null,
    truncated: Boolean(input.truncated),
    metrics: {
      visitors: metric(currentSummary.visitors, previousSummary.visitors),
      newVisitors: metric(currentSummary.newVisitors, previousSummary.newVisitors),
      returningVisitors: metric(currentSummary.returningVisitors, previousSummary.returningVisitors),
      sessions: metric(currentSummary.sessions, previousSummary.sessions),
      pageViews: metric(currentSummary.pageViews, previousSummary.pageViews),
      productViews: metric(currentSummary.productViews, previousSummary.productViews),
      cartAdds: metric(currentSummary.cartAdds, previousSummary.cartAdds),
      requests: metric(currentSummary.requests, previousSummary.requests),
      conversionRate: metric(currentConversion, previousConversion),
    },
    trend: buildTrend(current, granularity, input.filter.from, input.filter.to),
    funnel: funnel(current),
    topProducts: topProducts(current, input.products),
    campaigns: campaigns(current),
    topPages: topPages(current),
    zeroResultSearches: [...new Map(current.filter((event) => event.name === 'search' && event.resultCount === 0 && event.query).map((event) => [event.query!, 0]))]
      .map(([query]) => ({ query, searches: current.filter((event) => event.name === 'search' && event.resultCount === 0 && event.query === query).length }))
      .sort((left, right) => right.searches - left.searches).slice(0, 20),
    breakdowns: {
      locale: breakdown(current, (event) => event.locale),
      surface: breakdown(current, (event) => event.surface),
      device: breakdown(current, (event) => event.deviceClass),
      source: breakdown(current, (event) => normalizeAcquisitionSource(event.attribution.source)),
    },
    filters: { sources, campaigns: campaignOptions, categories: input.categories },
  };
}

export function analyticsDateRange(from: string, to: string): AnalyticsFilter {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('Invalid analytics date range.');
  const fromDate = new Date(`${from}T00:00:00+05:00`);
  const toInclusive = new Date(`${to}T00:00:00+05:00`);
  const toDate = new Date(toInclusive.getTime() + 24 * 60 * 60 * 1000);
  if (!Number.isFinite(fromDate.getTime()) || !Number.isFinite(toDate.getTime()) || toDate <= fromDate) throw new Error('Invalid analytics date range.');
  const duration = toDate.getTime() - fromDate.getTime();
  if (duration > 90 * 24 * 60 * 60 * 1000) throw new Error('Analytics range exceeds 90 days.');
  return {
    from: fromDate,
    to: toDate,
    previousFrom: new Date(fromDate.getTime() - duration),
    previousTo: fromDate,
  };
}
