'use client';

import type { AnalyticsSurface, PublicAnalyticsEvent } from '@/lib/analytics/contracts';
import {
  disableExternalAnalytics,
  isAnalyticsOptedOut,
  trackExternalAnalytics,
  type ExternalAnalyticsContext,
} from '@/lib/analytics/external';
import type { Language } from '@/types';

type TrackInput = PublicAnalyticsEvent extends infer Event
  ? Event extends PublicAnalyticsEvent
    ? Omit<Event, 'eventId' | 'locale' | 'surface' | 'attribution'>
    : never
  : never;

let deliveryQueue = Promise.resolve();

function surface(): AnalyticsSurface {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData) ? 'telegram_mini_app' : 'web';
}

function attribution() {
  const params = new URLSearchParams(window.location.search);
  const allowed = {
    utmSource: params.get('utm_source')?.slice(0, 80) || undefined,
    utmMedium: params.get('utm_medium')?.slice(0, 80) || undefined,
    utmCampaign: params.get('utm_campaign')?.slice(0, 120) || undefined,
    utmContent: params.get('utm_content')?.slice(0, 120) || undefined,
    utmTerm: params.get('utm_term')?.slice(0, 80) || undefined,
    referrerHost: (() => { try { return document.referrer ? new URL(document.referrer).hostname.slice(0, 160) : undefined; } catch { return undefined; } })(),
  };
  return Object.values(allowed).some(Boolean) ? allowed : undefined;
}

export function trackAnalytics(locale: Language, input: TrackInput, externalContext?: ExternalAnalyticsContext) {
  if (typeof window === 'undefined' || navigator.doNotTrack === '1' || isAnalyticsOptedOut()) return;
  const payload: PublicAnalyticsEvent = {
    ...input,
    eventId: crypto.randomUUID(),
    locale,
    surface: surface(),
    attribution: attribution(),
  } as PublicAnalyticsEvent;
  try { trackExternalAnalytics(payload, externalContext); } catch { /* External providers are independent from first-party delivery. */ }
  deliveryQueue = deliveryQueue.catch(() => undefined).then(async () => {
    await fetch('/api/analytics/events', {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
  }).catch(() => undefined);
}

export async function optOutAnalytics() {
  disableExternalAnalytics();
  await fetch('/api/analytics/events', { method: 'DELETE', credentials: 'same-origin' });
}
