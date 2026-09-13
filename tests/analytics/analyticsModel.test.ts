import { describe, expect, it } from 'vitest';
import { publicAnalyticsEventSchema } from '@/lib/analytics/contracts';
import { analyticsRouteType, classifyDevice, normalizeAnalyticsPathname, normalizeAttribution, normalizeSearchQuery } from '@/lib/analytics/model';

describe('privacy-conscious analytics contract', () => {
  it('accepts engagement and rejects forged conversions or extra PII', () => {
    const base = { eventId: crypto.randomUUID(), locale: 'ru', surface: 'web' };
    expect(publicAnalyticsEventSchema.safeParse({ ...base, name: 'product_view', productId: 'p1', slug: 'p1' }).success).toBe(true);
    expect(publicAnalyticsEventSchema.safeParse({ ...base, name: 'request_created', lineCount: 1 }).success).toBe(false);
    expect(publicAnalyticsEventSchema.safeParse({ ...base, name: 'page_view', pathname: '/ru', phone: '+998' }).success).toBe(false);
  });

  it('normalizes paths and attribution without arbitrary query strings', () => {
    expect(normalizeAnalyticsPathname('/ru/catalog?q=private&utm_source=x')).toBe('/ru/catalog');
    expect(analyticsRouteType('/ru/product/item')).toBe('product');
    expect(normalizeAttribution({ utmSource: 'Instagram', utmCampaign: 'horeca', landingPathname: '/ru/catalog?secret=1', surface: 'web' })).toEqual({ source: 'instagram', campaign: 'horeca', landingPathname: '/ru/catalog' });
    expect(classifyDevice('Mozilla/5.0 (iPhone; Mobile)')).toBe('mobile');
    expect(normalizeSearchQuery('телефон +998 90 123 45 67 test@example.com')).toBe('телефон [redacted] [redacted]');
  });
});
