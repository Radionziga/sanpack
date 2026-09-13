import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_VISITOR_COOKIE,
  writeAnalyticsEvent,
} from '@/lib/analytics/server';
import { ANALYTICS_SESSION_IDLE_MS } from '@/lib/analytics/model';
import type { PublicAnalyticsEvent } from '@/lib/analytics/contracts';

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const collections = ['analyticsEvents', 'analyticsSessions', 'analyticsVisitors'];

async function clearCollection(name: string) {
  const snapshot = await getAdminDb().collection(name).get();
  if (snapshot.empty) return;
  const batch = getAdminDb().batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

function request(cookie?: string) {
  return new Request('https://shop.example/api/analytics/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148',
      ...(cookie ? { cookie } : {}),
    },
  });
}

function pageView(eventId: string): PublicAnalyticsEvent {
  return {
    eventId,
    name: 'page_view',
    locale: 'ru',
    surface: 'web',
    pathname: '/ru/catalog?private=must-not-be-stored',
    attribution: {
      utmSource: 'instagram',
      utmMedium: 'paid_social',
      utmCampaign: 'autumn-horeca',
      referrerHost: 'instagram.com',
    },
  };
}

function analyticsCookie(visitorId: string, sessionId: string) {
  return `${ANALYTICS_VISITOR_COOKIE}=${visitorId}; ${ANALYTICS_SESSION_COOKIE}=${sessionId}`;
}

describe.runIf(emulatorEnabled)('analytics lifecycle with the Firestore emulator', () => {
  beforeEach(async () => Promise.all(collections.map(clearCollection)));
  afterAll(async () => Promise.all(collections.map(clearCollection)));

  it('continues a first-party session without customer linkage and preserves landing attribution', async () => {
    const first = await writeAnalyticsEvent(request(), pageView('emulator-analytics-event-0001'));
    expect(first).toMatchObject({ isNewVisitor: true });

    const second = await writeAnalyticsEvent(
      request(analyticsCookie(first!.visitorId, first!.sessionId)),
      {
        eventId: 'emulator-analytics-event-0002',
        name: 'product_view',
        locale: 'ru',
        surface: 'web',
        productId: 'product-1',
        slug: 'fixture-product',
        categoryId: 'category-1',
        priceMode: 'fixed',
      },
    );

    expect(second).toEqual({ visitorId: first!.visitorId, sessionId: first!.sessionId, isNewVisitor: false });
    expect((await getAdminDb().collection('analyticsVisitors').get()).size).toBe(1);
    expect((await getAdminDb().collection('analyticsSessions').get()).size).toBe(1);
    const events = await getAdminDb().collection('analyticsEvents').get();
    expect(events.size).toBe(2);
    for (const document of events.docs) {
      expect(document.data()).not.toHaveProperty('customerUid');
      expect(document.data()).not.toHaveProperty('telegramId');
      expect(document.data().attribution).toMatchObject({ source: 'instagram', medium: 'paid_social', campaign: 'autumn-horeca' });
    }
    expect(events.docs.map((document) => document.data().pathname).filter(Boolean)).toEqual(['/ru/catalog']);
  });

  it('starts a new session after inactivity while retaining the opaque visitor', async () => {
    const first = await writeAnalyticsEvent(request(), pageView('emulator-analytics-event-0003'));
    await getAdminDb().collection('analyticsSessions').doc(first!.sessionId).update({
      lastActivityAt: Timestamp.fromMillis(Date.now() - ANALYTICS_SESSION_IDLE_MS - 1),
    });

    const next = await writeAnalyticsEvent(
      request(analyticsCookie(first!.visitorId, first!.sessionId)),
      pageView('emulator-analytics-event-0004'),
    );

    expect(next!.visitorId).toBe(first!.visitorId);
    expect(next!.sessionId).not.toBe(first!.sessionId);
    expect(next!.isNewVisitor).toBe(false);
    expect((await getAdminDb().collection('analyticsSessions').get()).size).toBe(2);
  });

  it('deduplicates the same event identity without increasing session activity', async () => {
    const first = await writeAnalyticsEvent(request(), pageView('emulator-analytics-event-0005'));
    const replay = await writeAnalyticsEvent(
      request(analyticsCookie(first!.visitorId, first!.sessionId)),
      pageView('emulator-analytics-event-0005'),
    );

    expect(replay).toMatchObject({ visitorId: first!.visitorId, sessionId: first!.sessionId });
    expect((await getAdminDb().collection('analyticsEvents').get()).size).toBe(1);
    expect((await getAdminDb().collection('analyticsSessions').doc(first!.sessionId).get()).data()?.eventCount).toBe(1);
  });
});
