'use client';

import type { ExternalAnalyticsSettings, Language } from '@/types';
import type { PublicAnalyticsEvent } from '@/lib/analytics/contracts';

export const ANALYTICS_OPTOUT_KEY = 'sanpack_analytics_opt_out_v1';
const CONVERSION_DEDUPE_KEY = 'sanpack_external_conversion_receipts_v1';
const MAX_CONVERSION_RECEIPTS = 50;

export interface ExternalAnalyticsItem {
  itemId: string;
  itemName: string;
  itemCategory?: string;
  itemVariant?: string;
  price?: number;
  currency?: string;
  quantity?: number;
}

export interface ExternalAnalyticsContext {
  item?: ExternalAnalyticsItem;
}

export interface ExternalRuntimePolicyInput {
  nodeEnv: string | undefined;
  hostname: string;
  webdriver: boolean;
  optedOut: boolean;
  doNotTrack: string | null;
  globalPrivacyControl: boolean;
}

export interface GoogleCommand {
  name: 'page_view' | 'catalog_view' | 'view_item' | 'site_search' | 'add_to_cart' | 'remove_from_cart' | 'view_cart' | 'request_start' | 'repeat_composition' | 'link_hub_click' | 'contact_click' | 'generate_lead';
  params: Record<string, unknown>;
}

export interface YandexCommand {
  kind: 'hit' | 'goal';
  target: string;
  params?: Record<string, unknown>;
}

export interface ExternalEventMapping {
  google?: GoogleCommand;
  yandex?: YandexCommand;
}

type Gtag = (...args: unknown[]) => void;
type YandexMetrica = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: Gtag;
    ym?: YandexMetrica;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

const disabledSettings: ExternalAnalyticsSettings = {
  googleAnalytics: { enabled: false, measurementId: '' },
  yandexMetrica: { enabled: false, counterId: '' },
};

let currentSettings = disabledSettings;
let initializedGoogle = '';
let initializedYandex = '';

function bounded(value: string | undefined, limit: number) {
  const normalized = value?.trim().slice(0, limit);
  return normalized || undefined;
}

export function normalizeExternalAnalyticsSettings(
  settings: ExternalAnalyticsSettings | undefined,
): ExternalAnalyticsSettings {
  const measurementId = bounded(settings?.googleAnalytics.measurementId, 32) ?? '';
  const counterId = bounded(settings?.yandexMetrica.counterId, 24) ?? '';
  return {
    googleAnalytics: {
      enabled: Boolean(settings?.googleAnalytics.enabled && /^G-[A-Z0-9]{4,20}$/.test(measurementId)),
      measurementId,
    },
    yandexMetrica: {
      enabled: Boolean(settings?.yandexMetrica.enabled && /^\d{5,20}$/.test(counterId)),
      counterId,
    },
  };
}

export function shouldEnableExternalAnalytics(input: ExternalRuntimePolicyInput) {
  return input.nodeEnv === 'production'
    && ['sanpack.uz', 'www.sanpack.uz'].includes(input.hostname.toLowerCase())
    && !input.webdriver
    && !input.optedOut
    && input.doNotTrack !== '1'
    && !input.globalPrivacyControl;
}

export function isAnalyticsOptedOut() {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(ANALYTICS_OPTOUT_KEY) === '1'; } catch { return false; }
}

export function canUseExternalAnalytics() {
  if (typeof window === 'undefined') return false;
  return shouldEnableExternalAnalytics({
    nodeEnv: process.env.NODE_ENV,
    hostname: window.location.hostname,
    webdriver: navigator.webdriver,
    optedOut: isAnalyticsOptedOut(),
    doNotTrack: navigator.doNotTrack,
    globalPrivacyControl: Boolean(navigator.globalPrivacyControl),
  });
}

function googleTag() {
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => { window.dataLayer!.push(args); };
  return window.gtag;
}

function yandexTag() {
  if (!window.ym) {
    const stub: YandexMetrica = (...args: unknown[]) => {
      stub.a ??= [];
      stub.a.push(args);
    };
    stub.l = Date.now();
    window.ym = stub;
  }
  return window.ym;
}

export function configureExternalAnalytics(settings: ExternalAnalyticsSettings | undefined) {
  currentSettings = normalizeExternalAnalyticsSettings(settings);
  if (!canUseExternalAnalytics()) return currentSettings;

  const google = currentSettings.googleAnalytics;
  if (google.enabled && initializedGoogle !== google.measurementId) {
    googleTag()('js', new Date());
    googleTag()('config', google.measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    initializedGoogle = google.measurementId;
  }

  const yandex = currentSettings.yandexMetrica;
  if (yandex.enabled && initializedYandex !== yandex.counterId) {
    yandexTag()(Number(yandex.counterId), 'init', {
      defer: true,
      clickmap: false,
      trackLinks: false,
      accurateTrackBounce: true,
      webvisor: false,
      ecommerce: false,
    });
    initializedYandex = yandex.counterId;
  }
  return currentSettings;
}

function safeItem(item: ExternalAnalyticsItem | undefined, fallbackId: string, fallbackName: string) {
  const id = bounded(item?.itemId, 120) ?? bounded(fallbackId, 120)!;
  const name = bounded(item?.itemName, 160) ?? bounded(fallbackName, 160)!;
  const value: Record<string, unknown> = { item_id: id, item_name: name };
  const category = bounded(item?.itemCategory, 120);
  const variant = bounded(item?.itemVariant, 120);
  if (category) value.item_category = category;
  if (variant) value.item_variant = variant;
  if (typeof item?.price === 'number' && Number.isFinite(item.price) && item.price > 0) value.price = item.price;
  if (typeof item?.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0) value.quantity = item.quantity;
  return value;
}

function safePageLocation(event: Extract<PublicAnalyticsEvent, { name: 'page_view' }>, origin: string) {
  const url = new URL(event.pathname, origin);
  const pairs: Array<[string, string | undefined]> = [
    ['utm_source', event.attribution?.utmSource],
    ['utm_medium', event.attribution?.utmMedium],
    ['utm_campaign', event.attribution?.utmCampaign],
    ['utm_content', event.attribution?.utmContent],
    ['utm_term', event.attribution?.utmTerm],
  ];
  for (const [key, value] of pairs) if (value) url.searchParams.set(key, value);
  return url.toString();
}

function safePageReferrer(event: Extract<PublicAnalyticsEvent, { name: 'page_view' }>) {
  const host = bounded(event.attribution?.referrerHost, 160);
  return host ? `https://${host}/` : undefined;
}

export function mapExternalAnalyticsEvent(
  event: PublicAnalyticsEvent,
  context: ExternalAnalyticsContext = {},
  origin = 'https://sanpack.uz',
): ExternalEventMapping {
  if (event.name === 'page_view') {
    return {
      google: { name: 'page_view', params: {
        page_path: event.pathname,
        page_location: safePageLocation(event, origin),
        page_referrer: safePageReferrer(event),
        language: event.locale,
      } },
      yandex: { kind: 'hit', target: safePageLocation(event, origin), params: { title: documentTitle() } },
    };
  }
  if (event.name === 'catalog_view') {
    return {
      google: { name: 'catalog_view', params: { page_path: event.pathname, category_id: event.categoryId, language: event.locale } },
      yandex: { kind: 'goal', target: 'catalog_view', params: { category_id: event.categoryId } },
    };
  }
  if (event.name === 'product_view') {
    const item = safeItem(context.item, event.productId, event.slug);
    return {
      google: { name: 'view_item', params: { items: [item], ...currencyAndValue(context.item) } },
      yandex: { kind: 'goal', target: 'product_view', params: { product_id: event.productId, variant_id: event.variantId, price_mode: event.priceMode } },
    };
  }
  if (event.name === 'search') {
    // Search text is deliberately not forwarded: free-form queries can contain PII.
    const params = { result_count: event.resultCount, has_results: event.resultCount > 0 };
    return {
      google: { name: 'site_search', params },
      yandex: { kind: 'goal', target: 'site_search', params },
    };
  }
  if (event.name === 'add_to_cart' || event.name === 'remove_from_cart') {
    const contextItem = context.item ? { ...context.item, quantity: event.quantity } : undefined;
    const item = safeItem(contextItem, event.productId, event.productId);
    return {
      google: { name: event.name, params: { items: [item], ...currencyAndValue(contextItem) } },
      yandex: { kind: 'goal', target: event.name, params: { product_id: event.productId, variant_id: event.variantId, quantity: event.quantity, price_mode: event.priceMode } },
    };
  }
  if (event.name === 'cart_view') {
    return {
      google: { name: 'view_cart', params: { line_count: event.lineCount } },
      yandex: { kind: 'goal', target: 'cart_view', params: { line_count: event.lineCount } },
    };
  }
  if (event.name === 'request_start') {
    return {
      google: { name: 'request_start', params: { line_count: event.lineCount, priced_line_count: event.pricedLineCount, request_price_line_count: event.requestPriceLineCount } },
      yandex: { kind: 'goal', target: 'request_start', params: { line_count: event.lineCount } },
    };
  }
  if (event.name === 'repeat_composition') {
    const params = { line_count: event.lineCount, accepted_line_count: event.acceptedLineCount, changed_line_count: event.changedLineCount };
    return {
      google: { name: 'repeat_composition', params },
      yandex: { kind: 'goal', target: 'repeat_composition', params },
    };
  }
  if (event.name === 'link_hub_click') {
    return {
      google: { name: 'link_hub_click', params: { link_id: event.linkId, link_type: event.linkType } },
      yandex: { kind: 'goal', target: 'link_hub_click', params: { link_id: event.linkId, link_type: event.linkType } },
    };
  }
  if (event.name === 'contact_click') {
    return {
      google: { name: 'contact_click', params: { channel: event.channel } },
      yandex: { kind: 'goal', target: 'contact_click', params: { channel: event.channel } },
    };
  }
  return {};
}

function documentTitle() {
  return typeof document === 'undefined' ? undefined : document.title.slice(0, 200);
}

function currencyAndValue(item: ExternalAnalyticsItem | undefined) {
  if (typeof item?.price !== 'number' || !Number.isFinite(item.price) || item.price <= 0) return {};
  const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
  return { currency: bounded(item.currency, 8) ?? 'UZS', value: item.price * quantity };
}

function dispatchMapping(mapping: ExternalEventMapping) {
  if (!canUseExternalAnalytics()) return;
  try {
    const google = currentSettings.googleAnalytics;
    if (google.enabled && mapping.google) googleTag()('event', mapping.google.name, mapping.google.params);
  } catch { /* Marketing measurement must never interrupt the storefront. */ }
  try {
    const yandex = currentSettings.yandexMetrica;
    if (!yandex.enabled || !mapping.yandex) return;
    if (mapping.yandex.kind === 'hit') yandexTag()(Number(yandex.counterId), 'hit', mapping.yandex.target, mapping.yandex.params);
    else yandexTag()(Number(yandex.counterId), 'reachGoal', mapping.yandex.target, mapping.yandex.params);
  } catch { /* Marketing measurement must never interrupt the storefront. */ }
}

export function trackExternalAnalytics(event: PublicAnalyticsEvent, context?: ExternalAnalyticsContext) {
  dispatchMapping(mapExternalAnalyticsEvent(event, context, window.location.origin));
}

function rememberConversion(receiptId: string) {
  const normalized = bounded(receiptId, 120);
  if (!normalized || typeof window === 'undefined') return false;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(CONVERSION_DEDUPE_KEY) || '[]') as unknown;
    const receipts = Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string').slice(-MAX_CONVERSION_RECEIPTS) : [];
    const result = appendConversionReceipt(receipts, normalized);
    if (!result.accepted) return false;
    window.sessionStorage.setItem(CONVERSION_DEDUPE_KEY, JSON.stringify(result.receipts));
    return result.accepted;
  } catch { return true; }
}

export function appendConversionReceipt(existing: string[], receiptId: string) {
  const normalized = bounded(receiptId, 120);
  const receipts = existing.filter((value) => typeof value === 'string').map((value) => value.slice(0, 120)).slice(-MAX_CONVERSION_RECEIPTS);
  if (!normalized || receipts.includes(normalized)) return { accepted: false, receipts };
  return { accepted: true, receipts: [...receipts, normalized].slice(-MAX_CONVERSION_RECEIPTS) };
}

export function trackConfirmedRequest(locale: Language, receiptId: string, lineCount: number) {
  if (!rememberConversion(receiptId) || !canUseExternalAnalytics()) return false;
  const mapping = mapConfirmedRequest(locale, lineCount);
  try {
    if (currentSettings.googleAnalytics.enabled && mapping.google) googleTag()('event', mapping.google.name, mapping.google.params);
  } catch { /* Best effort only. */ }
  try {
    if (currentSettings.yandexMetrica.enabled && mapping.yandex) yandexTag()(Number(currentSettings.yandexMetrica.counterId), 'reachGoal', mapping.yandex.target, mapping.yandex.params);
  } catch { /* Best effort only. */ }
  return true;
}

export function mapConfirmedRequest(locale: Language, lineCount: number): ExternalEventMapping {
  const safeLineCount = Math.max(0, Math.min(500, Math.trunc(lineCount)));
  return {
    google: { name: 'generate_lead', params: { method: 'request', request_type: 'b2b_request', line_count: safeLineCount, language: locale } },
    yandex: { kind: 'goal', target: 'request_created', params: { request_type: 'b2b_request', line_count: safeLineCount } },
  };
}

export function disableExternalAnalytics() {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ANALYTICS_OPTOUT_KEY, '1');
    if (currentSettings.googleAnalytics.enabled && window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    if (currentSettings.yandexMetrica.enabled && window.ym) window.ym(Number(currentSettings.yandexMetrica.counterId), 'destruct');
  } catch { /* Opt-out remains server-enforced by the DELETE request. */ }
}
