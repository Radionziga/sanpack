import { describe, expect, it } from 'vitest';
import type { PublicAnalyticsEvent } from '@/lib/analytics/contracts';
import {
  appendConversionReceipt,
  mapConfirmedRequest,
  mapExternalAnalyticsEvent,
  normalizeExternalAnalyticsSettings,
  shouldEnableExternalAnalytics,
} from '@/lib/analytics/external';

const common = {
  eventId: '2fa418d2-8910-4d55-a432-bd8fc532d45f',
  locale: 'ru' as const,
  surface: 'web' as const,
};

describe('external analytics bridge', () => {
  it('enables providers only on the canonical production host outside automation and privacy opt-out', () => {
    const production = { nodeEnv: 'production', hostname: 'sanpack.uz', webdriver: false, optedOut: false, doNotTrack: '0', globalPrivacyControl: false };
    expect(shouldEnableExternalAnalytics(production)).toBe(true);
    expect(shouldEnableExternalAnalytics({ ...production, hostname: 'localhost' })).toBe(false);
    expect(shouldEnableExternalAnalytics({ ...production, nodeEnv: 'test' })).toBe(false);
    expect(shouldEnableExternalAnalytics({ ...production, webdriver: true })).toBe(false);
    expect(shouldEnableExternalAnalytics({ ...production, optedOut: true })).toBe(false);
    expect(shouldEnableExternalAnalytics({ ...production, doNotTrack: '1' })).toBe(false);
    expect(shouldEnableExternalAnalytics({ ...production, globalPrivacyControl: true })).toBe(false);
  });

  it('validates public provider identifiers and never enables an invalid tag', () => {
    expect(normalizeExternalAnalyticsSettings({
      googleAnalytics: { enabled: true, measurementId: 'G-XW6EZGTB80' },
      yandexMetrica: { enabled: true, counterId: '12345678' },
    })).toEqual({
      googleAnalytics: { enabled: true, measurementId: 'G-XW6EZGTB80' },
      yandexMetrica: { enabled: true, counterId: '12345678' },
    });
    expect(normalizeExternalAnalyticsSettings({
      googleAnalytics: { enabled: true, measurementId: 'UA-OLD' },
      yandexMetrica: { enabled: true, counterId: 'javascript:1' },
    })).toMatchObject({ googleAnalytics: { enabled: false }, yandexMetrica: { enabled: false } });
  });

  it('maps one explicit route view and preserves only allowlisted UTM attribution', () => {
    const event: PublicAnalyticsEvent = {
      ...common,
      name: 'page_view',
      pathname: '/ru/catalog',
      attribution: { utmSource: 'instagram', utmCampaign: 'horeca', utmMedium: 'paid_social', referrerHost: 'instagram.com' },
    };
    const mapped = mapExternalAnalyticsEvent(event);
    expect(mapped.google?.name).toBe('page_view');
    expect(mapped.yandex).toMatchObject({ kind: 'hit' });
    const location = String(mapped.google?.params.page_location);
    expect(location).toContain('utm_source=instagram');
    expect(location).toContain('utm_campaign=horeca');
    expect(location).not.toContain('customer');
    expect(mapped.google?.params.page_referrer).toBe('https://instagram.com/');
  });

  it('maps the full product-event taxonomy without forwarding free-form search text', () => {
    const catalog = mapExternalAnalyticsEvent({ ...common, name: 'catalog_view', pathname: '/ru/catalog', categoryId: 'packaging' });
    expect(catalog.google).toMatchObject({ name: 'catalog_view', params: { category_id: 'packaging' } });

    const search = mapExternalAnalyticsEvent({ ...common, name: 'search', query: 'somebody@example.com', resultCount: 0 });
    expect(search.google).toEqual({ name: 'site_search', params: { result_count: 0, has_results: false } });
    expect(JSON.stringify(search)).not.toContain('somebody@example.com');

    expect(mapExternalAnalyticsEvent({ ...common, name: 'cart_view', lineCount: 2 }).google?.name).toBe('view_cart');
    expect(mapExternalAnalyticsEvent({ ...common, name: 'repeat_composition', lineCount: 4, acceptedLineCount: 3, changedLineCount: 1 }).google?.name).toBe('repeat_composition');
    expect(mapExternalAnalyticsEvent({ ...common, name: 'contact_click', channel: 'phone' }).google).toEqual({ name: 'contact_click', params: { channel: 'phone' } });
  });

  it('maps known Product data to GA4 ecommerce and Yandex goals', () => {
    const event: PublicAnalyticsEvent = {
      ...common,
      name: 'product_view',
      productId: 'prod-1',
      slug: 'foil-container',
      categoryId: 'cat-food-packaging',
      variantId: '800ml',
      priceMode: 'fixed',
    };
    const mapped = mapExternalAnalyticsEvent(event, { item: {
      itemId: 'SP-FP-005-800', itemName: 'Контейнер 800 мл', itemCategory: 'cat-food-packaging', itemVariant: '800 мл', price: 1_100, currency: 'UZS',
    } });
    expect(mapped.google).toEqual({ name: 'view_item', params: expect.objectContaining({ currency: 'UZS', value: 1_100 }) });
    expect(mapped.yandex).toMatchObject({ kind: 'goal', target: 'product_view' });
    expect(JSON.stringify(mapped)).not.toMatch(/phone|address|telegram|customerUid/i);
  });

  it('does not invent zero price or value for request-price Products', () => {
    const event: PublicAnalyticsEvent = {
      ...common,
      name: 'add_to_cart',
      productId: 'prod-request',
      categoryId: 'cat-produce',
      quantity: 4,
      priceMode: 'request',
    };
    const mapped = mapExternalAnalyticsEvent(event, { item: {
      itemId: 'SP-REQ-1', itemName: 'Томаты', itemCategory: 'cat-produce', quantity: 4,
    } });
    expect(mapped.google?.name).toBe('add_to_cart');
    expect(mapped.google?.params).not.toHaveProperty('value');
    expect(mapped.google?.params).not.toHaveProperty('currency');
    expect(JSON.stringify(mapped.google?.params)).not.toContain('"price":0');
  });

  it('maps Request start and confirmed conversion as lead, never purchase', () => {
    const start = mapExternalAnalyticsEvent({ ...common, name: 'request_start', lineCount: 3, pricedLineCount: 2, requestPriceLineCount: 1 });
    expect(start.google?.name).toBe('request_start');
    expect(start.yandex?.target).toBe('request_start');
    const conversion = mapConfirmedRequest('uz', 3);
    expect(conversion.google).toMatchObject({ name: 'generate_lead', params: { request_type: 'b2b_request', line_count: 3 } });
    expect(conversion.yandex).toMatchObject({ kind: 'goal', target: 'request_created' });
    expect(JSON.stringify(conversion)).not.toContain('purchase');
  });

  it('deduplicates confirmed request receipts and keeps bounded session storage state', () => {
    const first = appendConversionReceipt([], 'request-safe-receipt');
    expect(first).toEqual({ accepted: true, receipts: ['request-safe-receipt'] });
    expect(appendConversionReceipt(first.receipts, 'request-safe-receipt')).toEqual({ accepted: false, receipts: ['request-safe-receipt'] });
    const bounded = Array.from({ length: 70 }, (_, index) => `receipt-${index}`)
      .reduce((state, receipt) => appendConversionReceipt(state.receipts, receipt), { accepted: true, receipts: [] as string[] });
    expect(bounded.receipts).toHaveLength(50);
    expect(bounded.receipts.at(-1)).toBe('receipt-69');
  });

  it('maps Link Hub clicks without sending the destination URL', () => {
    const mapped = mapExternalAnalyticsEvent({ ...common, name: 'link_hub_click', linkId: 'telegram', linkType: 'telegram' });
    expect(mapped.google).toMatchObject({ name: 'link_hub_click', params: { link_id: 'telegram', link_type: 'telegram' } });
    expect(mapped.yandex).toMatchObject({ target: 'link_hub_click' });
    expect(JSON.stringify(mapped)).not.toContain('https://');
  });
});
