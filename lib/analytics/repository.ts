import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { getPublicCategories, getPublicProducts } from '@/lib/repositories/serverCatalogRepository';
import { buildAnalyticsReport } from '@/lib/analytics/report';
import type { AnalyticsFilter, StoredAnalyticsEvent } from '@/lib/analytics/contracts';

const REPORT_EVENT_LIMIT = 50_000;

function toDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(String(value));
}

export async function getAnalyticsReport(filter: AnalyticsFilter) {
  const db = getAdminDb();
  const snapshot = await db.collection('analyticsEvents')
    .where('occurredAt', '>=', Timestamp.fromDate(filter.previousFrom))
    .where('occurredAt', '<', Timestamp.fromDate(filter.to))
    .orderBy('occurredAt', 'asc')
    .limit(REPORT_EVENT_LIMIT + 1)
    .get();
  const events = snapshot.docs.slice(0, REPORT_EVENT_LIMIT).map((document) => {
    const data = document.data();
    return { ...data, occurredAt: toDate(data.occurredAt), visitorFirstSeenAt: toDate(data.visitorFirstSeenAt) } as StoredAnalyticsEvent;
  });
  const [products, categories] = await Promise.all([getPublicProducts(), getPublicCategories()]);
  const first = await db.collection('analyticsEvents').orderBy('occurredAt', 'asc').limit(1).get();
  const started = first.docs[0]?.data()?.occurredAt;
  return buildAnalyticsReport({
    events, filter,
    products: products.map((product) => ({ id: product.id, name: product.titleRu, sku: product.sku, categoryId: product.categoryId })),
    categories: categories.map((category) => ({ id: category.id, name: category.titleRu })),
    truncated: snapshot.size > REPORT_EVENT_LIMIT,
    collectionStartedAt: started ? toDate(started) : null,
  });
}
