import { z } from 'zod';
import type { Language } from '@/types';

export const analyticsEventNames = [
  'page_view',
  'catalog_view',
  'product_view',
  'search',
  'add_to_cart',
  'remove_from_cart',
  'cart_view',
  'request_start',
  'request_created',
  'repeat_composition',
  'link_hub_click',
  'contact_click',
] as const;

export type AnalyticsEventName = typeof analyticsEventNames[number];
export type AnalyticsSurface = 'web' | 'telegram_mini_app';
export type AnalyticsDeviceClass = 'mobile' | 'tablet' | 'desktop';

const boundedId = z.string().trim().min(1).max(120);
const optionalId = boundedId.optional();
const common = {
  eventId: z.string().uuid(),
  locale: z.enum(['ru', 'uz', 'en', 'zh']),
  surface: z.enum(['web', 'telegram_mini_app']),
  attribution: z.object({
    utmSource: z.string().trim().max(80).optional(),
    utmMedium: z.string().trim().max(80).optional(),
    utmCampaign: z.string().trim().max(120).optional(),
    utmContent: z.string().trim().max(120).optional(),
    utmTerm: z.string().trim().max(80).optional(),
    referrerHost: z.string().trim().max(160).optional(),
  }).strict().optional(),
};

export const publicAnalyticsEventSchema = z.discriminatedUnion('name', [
  z.object({ ...common, name: z.literal('page_view'), pathname: z.string().trim().min(1).max(180) }).strict(),
  z.object({ ...common, name: z.literal('catalog_view'), pathname: z.string().trim().min(1).max(180), categoryId: optionalId }).strict(),
  z.object({
    ...common,
    name: z.literal('product_view'),
    productId: boundedId,
    slug: z.string().trim().min(1).max(160),
    categoryId: optionalId,
    variantId: optionalId,
    priceMode: z.enum(['fixed', 'from', 'request', 'informational']).optional(),
  }).strict(),
  z.object({ ...common, name: z.literal('search'), query: z.string().trim().min(1).max(80), resultCount: z.number().int().min(0).max(10_000) }).strict(),
  z.object({
    ...common,
    name: z.enum(['add_to_cart', 'remove_from_cart']),
    productId: boundedId,
    variantId: optionalId,
    categoryId: optionalId,
    quantity: z.number().finite().positive().max(1_000_000_000),
    priceMode: z.enum(['fixed', 'from', 'request', 'informational']).optional(),
  }).strict(),
  z.object({ ...common, name: z.literal('cart_view'), lineCount: z.number().int().min(0).max(500) }).strict(),
  z.object({
    ...common,
    name: z.literal('request_start'),
    lineCount: z.number().int().min(1).max(500),
    pricedLineCount: z.number().int().min(0).max(500),
    requestPriceLineCount: z.number().int().min(0).max(500),
  }).strict(),
  z.object({
    ...common,
    name: z.literal('repeat_composition'),
    lineCount: z.number().int().min(0).max(500),
    acceptedLineCount: z.number().int().min(0).max(500),
    changedLineCount: z.number().int().min(0).max(500),
  }).strict(),
  z.object({
    ...common,
    name: z.literal('link_hub_click'),
    linkId: boundedId,
    linkType: z.enum(['catalog', 'telegram', 'instagram', 'phone', 'location', 'delivery', 'bag', 'website']),
  }).strict(),
  z.object({ ...common, name: z.literal('contact_click'), channel: z.enum(['phone', 'telegram', 'whatsapp', 'email', 'map']) }).strict(),
]);

export type PublicAnalyticsEvent = z.infer<typeof publicAnalyticsEventSchema>;

export interface AnalyticsAttribution {
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrerHost?: string;
  landingPathname: string;
}

export interface StoredAnalyticsEvent {
  name: AnalyticsEventName;
  occurredAt: Date;
  visitorId: string;
  visitorFirstSeenAt: Date;
  sessionId: string;
  locale: Language;
  surface: AnalyticsSurface;
  deviceClass: AnalyticsDeviceClass;
  attribution: AnalyticsAttribution;
  pathname?: string;
  routeType?: string;
  productId?: string;
  slug?: string;
  categoryId?: string;
  variantId?: string;
  priceMode?: 'fixed' | 'from' | 'request' | 'informational';
  query?: string;
  resultCount?: number;
  quantity?: number;
  lineCount?: number;
  pricedLineCount?: number;
  requestPriceLineCount?: number;
  acceptedLineCount?: number;
  changedLineCount?: number;
  linkId?: string;
  linkType?: string;
  channel?: string;
  productIds?: string[];
  variantIds?: string[];
}

export interface AnalyticsFilter {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  locale?: Language;
  surface?: AnalyticsSurface;
  source?: string;
  campaign?: string;
  categoryId?: string;
}

export interface AnalyticsMetric {
  value: number;
  previous: number;
  changePercent: number | null;
}

export interface AnalyticsDashboardReport {
  period: { from: string; to: string; timezone: 'Asia/Tashkent'; granularity: 'hour' | 'day' };
  collectionStartedAt: string | null;
  truncated: boolean;
  metrics: {
    visitors: AnalyticsMetric;
    newVisitors: AnalyticsMetric;
    returningVisitors: AnalyticsMetric;
    sessions: AnalyticsMetric;
    pageViews: AnalyticsMetric;
    productViews: AnalyticsMetric;
    cartAdds: AnalyticsMetric;
    requests: AnalyticsMetric;
    conversionRate: AnalyticsMetric;
  };
  trend: Array<{ bucket: string; visitors: number; sessions: number; pageViews: number; productViews: number; cartAdds: number; requests: number }>;
  funnel: Array<{ key: 'visitors' | 'product_viewers' | 'cart_adders' | 'request_starters' | 'request_creators'; count: number; fromPreviousPercent: number | null; overallPercent: number }>;
  topProducts: Array<{ productId: string; name: string; sku: string; categoryId?: string; views: number; visitors: number; cartAdds: number; requests: number; viewToCartPercent: number; viewToRequestPercent: number }>;
  campaigns: Array<{ source: string; medium: string; campaign: string; sessions: number; productViews: number; cartAdds: number; requests: number; conversionPercent: number }>;
  topPages: Array<{ pathname: string; routeType: string; views: number; visitors: number }>;
  zeroResultSearches: Array<{ query: string; searches: number }>;
  breakdowns: {
    locale: Array<{ key: string; sessions: number }>;
    surface: Array<{ key: string; sessions: number }>;
    device: Array<{ key: string; sessions: number }>;
    source: Array<{ key: string; sessions: number }>;
  };
  filters: { sources: string[]; campaigns: string[]; categories: Array<{ id: string; name: string }> };
}
