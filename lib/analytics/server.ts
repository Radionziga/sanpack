import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import type { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { omitUndefinedFields } from '@/lib/firebase/firestoreData';
import type { PublicAnalyticsEvent } from '@/lib/analytics/contracts';
import {
  ANALYTICS_RAW_RETENTION_DAYS,
  ANALYTICS_SESSION_IDLE_MS,
  ANALYTICS_VISITOR_RETENTION_DAYS,
  analyticsRouteType,
  classifyDevice,
  isLikelyBot,
  normalizeAnalyticsPathname,
  normalizeAttribution,
  normalizeSearchQuery,
} from '@/lib/analytics/model';
import type { RequestOrder } from '@/types';

export const ANALYTICS_VISITOR_COOKIE = '__sanpack_analytics_visitor';
export const ANALYTICS_SESSION_COOKIE = '__sanpack_analytics_session';
export const ANALYTICS_OPTOUT_COOKIE = '__sanpack_analytics_optout';

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_EVENT_LIMIT = 500;

export interface AnalyticsWriteContext {
  visitorId: string;
  sessionId: string;
  isNewVisitor: boolean;
}

function cookieValue(request: Request, name: string) {
  const source = request.headers.get('cookie') || '';
  return source.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function validOpaqueId(value: string | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(value) ? value : undefined;
}

function expiry(now: number, days: number) {
  return Timestamp.fromMillis(now + days * DAY_MS);
}

function safeReferrerHost(value: string | undefined) {
  const host = value?.trim().toLowerCase();
  return host && /^[a-z0-9.-]{1,160}$/.test(host) ? host : undefined;
}

function publicRequestHost(request: Request) {
  try {
    return new URL(request.headers.get('origin') || request.url).hostname;
  } catch {
    return request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || undefined;
  }
}

function localeFromRequest(request: Request) {
  try {
    const path = new URL(request.headers.get('referer') || request.url).pathname;
    const locale = path.split('/').filter(Boolean)[0];
    if (locale === 'uz' || locale === 'en' || locale === 'zh') return locale;
  } catch {
    // A missing/malformed referrer grants no identity or attribution.
  }
  return 'ru';
}

function eventFields(event: PublicAnalyticsEvent) {
  switch (event.name) {
    case 'page_view':
      return { pathname: normalizeAnalyticsPathname(event.pathname), routeType: analyticsRouteType(event.pathname) };
    case 'catalog_view':
      return { pathname: normalizeAnalyticsPathname(event.pathname), routeType: 'catalog', categoryId: event.categoryId };
    case 'product_view':
      return { productId: event.productId, slug: event.slug, categoryId: event.categoryId, variantId: event.variantId, priceMode: event.priceMode };
    case 'search':
      return { query: normalizeSearchQuery(event.query), resultCount: event.resultCount };
    case 'add_to_cart':
    case 'remove_from_cart':
      return { productId: event.productId, variantId: event.variantId, categoryId: event.categoryId, quantity: event.quantity, priceMode: event.priceMode };
    case 'cart_view':
      return { lineCount: event.lineCount };
    case 'request_start':
      return { lineCount: event.lineCount, pricedLineCount: event.pricedLineCount, requestPriceLineCount: event.requestPriceLineCount };
    case 'repeat_composition':
      return { lineCount: event.lineCount, acceptedLineCount: event.acceptedLineCount, changedLineCount: event.changedLineCount };
    case 'link_hub_click':
      return { linkId: event.linkId, linkType: event.linkType };
    case 'contact_click':
      return { channel: event.channel };
  }
}

export function shouldSkipAnalytics(request: Request) {
  if (cookieValue(request, ANALYTICS_OPTOUT_COOKIE) === '1') return true;
  if (cookieValue(request, '__session')) return true;
  if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1') return true;
  return isLikelyBot(request.headers.get('user-agent') || '');
}

export function applyAnalyticsCookies(response: NextResponse, context: AnalyticsWriteContext) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(ANALYTICS_VISITOR_COOKIE, context.visitorId, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: ANALYTICS_VISITOR_RETENTION_DAYS * 24 * 60 * 60,
  });
  response.cookies.set(ANALYTICS_SESSION_COOKIE, context.sessionId, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: ANALYTICS_SESSION_IDLE_MS / 1000,
  });
}

export function clearAnalyticsCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === 'production';
  for (const name of [ANALYTICS_VISITOR_COOKIE, ANALYTICS_SESSION_COOKIE]) {
    response.cookies.set(name, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 });
  }
  response.cookies.set(ANALYTICS_OPTOUT_COOKIE, '1', {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: ANALYTICS_VISITOR_RETENTION_DAYS * 24 * 60 * 60,
  });
}

export async function writeAnalyticsEvent(request: Request, event: PublicAnalyticsEvent, options?: {
  eventKey?: string;
  allowOverSessionCap?: boolean;
  storedName?: 'request_created';
  storedFields?: Record<string, unknown>;
}) {
  if (shouldSkipAnalytics(request)) return null;
  const db = getAdminDb();
  const now = Date.now();
  const requestedVisitorId = validOpaqueId(cookieValue(request, ANALYTICS_VISITOR_COOKIE)) || randomUUID();
  const requestedSessionId = validOpaqueId(cookieValue(request, ANALYTICS_SESSION_COOKIE));
  const eventDocumentId = createHash('sha256').update(options?.eventKey || `client:${event.eventId}`).digest('hex');
  const eventReference = db.collection('analyticsEvents').doc(eventDocumentId);
  const visitorReference = db.collection('analyticsVisitors').doc(requestedVisitorId);
  const initialSessionId = requestedSessionId || randomUUID();
  const initialSessionReference = db.collection('analyticsSessions').doc(initialSessionId);

  return db.runTransaction(async (transaction) => {
    const [existingEvent, visitorSnapshot, requestedSessionSnapshot] = await Promise.all([
      transaction.get(eventReference),
      transaction.get(visitorReference),
      transaction.get(initialSessionReference),
    ]);
    if (existingEvent.exists) {
      const existing = existingEvent.data() || {};
      return { visitorId: String(existing.visitorId || requestedVisitorId), sessionId: String(existing.sessionId || initialSessionId), isNewVisitor: false };
    }

    const visitorData = visitorSnapshot.data() || {};
    const visitorFirstSeenAt = visitorData.firstSeenAt instanceof Timestamp ? visitorData.firstSeenAt : Timestamp.fromMillis(now);
    const isNewVisitor = !visitorSnapshot.exists;
    const requestedSessionData = requestedSessionSnapshot.data() || {};
    const lastActivity = requestedSessionData.lastActivityAt instanceof Timestamp ? requestedSessionData.lastActivityAt.toMillis() : 0;
    const continuesSession = requestedSessionSnapshot.exists
      && requestedSessionData.visitorId === requestedVisitorId
      && lastActivity > now - ANALYTICS_SESSION_IDLE_MS;
    const sessionId = continuesSession ? initialSessionId : randomUUID();
    const sessionReference = continuesSession ? initialSessionReference : db.collection('analyticsSessions').doc(sessionId);
    const eventCount = continuesSession ? Number(requestedSessionData.eventCount || 0) : 0;
    if (!options?.allowOverSessionCap && eventCount >= SESSION_EVENT_LIMIT) throw new Error('ANALYTICS_SESSION_LIMIT');

    const attribution = continuesSession && requestedSessionData.attribution
      ? requestedSessionData.attribution
      : normalizeAttribution({
        utmSource: event.attribution?.utmSource,
        utmMedium: event.attribution?.utmMedium,
        utmCampaign: event.attribution?.utmCampaign,
        utmContent: event.attribution?.utmContent,
        utmTerm: event.attribution?.utmTerm,
        referrerHost: safeReferrerHost(event.attribution?.referrerHost),
        landingPathname: event.name === 'page_view' || event.name === 'catalog_view' ? event.pathname : '/',
        surface: event.surface,
        currentHost: publicRequestHost(request),
      });
    const startedAt = continuesSession && requestedSessionData.startedAt instanceof Timestamp
      ? requestedSessionData.startedAt
      : Timestamp.fromMillis(now);
    const deviceClass = classifyDevice(request.headers.get('user-agent') || '');

    transaction.set(visitorReference, {
      firstSeenAt: visitorFirstSeenAt,
      lastSeenAt: Timestamp.fromMillis(now),
      expiresAt: expiry(now, ANALYTICS_VISITOR_RETENTION_DAYS),
    }, { merge: true });
    transaction.set(sessionReference, {
      visitorId: requestedVisitorId,
      startedAt,
      lastActivityAt: Timestamp.fromMillis(now),
      landingPathname: attribution.landingPathname,
      attribution,
      locale: event.locale,
      surface: event.surface,
      deviceClass,
      eventCount: eventCount + 1,
      expiresAt: expiry(now, ANALYTICS_RAW_RETENTION_DAYS),
    }, { merge: continuesSession });
    transaction.create(eventReference, omitUndefinedFields({
      name: options?.storedName || event.name,
      occurredAt: Timestamp.fromMillis(now),
      visitorId: requestedVisitorId,
      visitorFirstSeenAt,
      sessionId,
      locale: event.locale,
      surface: event.surface,
      deviceClass,
      attribution,
      ...eventFields(event),
      ...options?.storedFields,
      expiresAt: expiry(now, ANALYTICS_RAW_RETENTION_DAYS),
    }));
    return { visitorId: requestedVisitorId, sessionId, isNewVisitor };
  });
}

export async function writeRequestConversion(request: Request, order: RequestOrder) {
  const locale = localeFromRequest(request);
  const requestPriceLineCount = order.items.filter((item) => item.price === undefined || item.priceMode === 'request').length;
  const event: PublicAnalyticsEvent = {
    eventId: randomUUID(),
    name: 'request_start',
    locale,
    surface: order.source === 'telegram_mini_app' ? 'telegram_mini_app' : 'web',
    lineCount: order.items.length,
    pricedLineCount: order.items.length - requestPriceLineCount,
    requestPriceLineCount,
  };
  return writeAnalyticsEvent(request, event, {
    eventKey: `request-created:${order.id}`,
    allowOverSessionCap: true,
    storedName: 'request_created',
    storedFields: {
      productIds: [...new Set(order.items.map((item) => item.productId))].slice(0, 100),
      variantIds: [...new Set(order.items.flatMap((item) => item.variantId ? [item.variantId] : []))].slice(0, 100),
    },
  });
}
