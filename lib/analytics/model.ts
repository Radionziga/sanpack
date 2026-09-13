import type { AnalyticsAttribution, AnalyticsDeviceClass } from '@/lib/analytics/contracts';

export const ANALYTICS_SESSION_IDLE_MS = 30 * 60 * 1000;
export const ANALYTICS_RAW_RETENTION_DAYS = 190;
export const ANALYTICS_VISITOR_RETENTION_DAYS = 400;
export const ANALYTICS_MAX_REPORT_DAYS = 90;
export const ANALYTICS_TIMEZONE = 'Asia/Tashkent' as const;

const BOT_PATTERN = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|telegrambot|whatsapp|headlesschrome|lighthouse/i;

export function isLikelyBot(userAgent: string) {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export function classifyDevice(userAgent: string): AnalyticsDeviceClass {
  if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

export function normalizeAnalyticsPathname(value: string) {
  const pathname = value.trim().split(/[?#]/, 1)[0] || '/';
  if (!pathname.startsWith('/') || pathname.length > 180) return '/';
  return pathname.replace(/\/{2,}/g, '/');
}

export function analyticsRouteType(pathname: string) {
  const parts = normalizeAnalyticsPathname(pathname).split('/').filter(Boolean);
  const route = ['ru', 'uz', 'en', 'zh'].includes(parts[0] || '') ? parts.slice(1) : parts;
  if (route.length === 0) return 'home';
  if (route[0] === 'catalog' && route.length === 1) return 'catalog';
  if (route[0] === 'catalog') return 'category';
  if (route[0] === 'product') return 'product';
  if (route[0] === 'search') return 'search';
  if (route[0] === 'request') return 'request';
  if (route[0] === 'links') return 'link_hub';
  if (route[0] === 'favorites') return 'favorites';
  if (route[0] === 'profile') return 'profile';
  if (route[0] === 'orders') return 'history';
  return 'content';
}

function bounded(value: string | undefined, max: number) {
  const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
  return normalized || undefined;
}

function normalizedHost(value: string | undefined) {
  return bounded(value, 160)?.toLocaleLowerCase().replace(/^www\./, '').replace(/:\d+$/, '');
}

export function normalizeAcquisitionSource(value: string | undefined) {
  const source = bounded(value, 80)?.toLocaleLowerCase();
  return !source || source === 'internal' ? 'direct' : source;
}

export function classifyTrafficSource(input: { utmSource?: string; referrerHost?: string; surface?: string; currentHost?: string }) {
  const utm = bounded(input.utmSource, 80)?.toLocaleLowerCase();
  if (utm && utm !== 'internal') return utm;
  const host = normalizedHost(input.referrerHost);
  const currentHost = normalizedHost(input.currentHost);
  const isExternal = Boolean(host && (!currentHost || host !== currentHost));
  if (isExternal && /telegram|t\.me$/.test(host!)) return 'telegram';
  if (isExternal && /instagram|facebook|fb\.com$/.test(host!)) return 'social';
  if (isExternal && /google|bing|yandex|duckduckgo/.test(host!)) return 'search';
  if (isExternal) return 'referral';
  if (input.surface === 'telegram_mini_app') return 'telegram';
  return 'direct';
}

export function normalizeAttribution(input: {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrerHost?: string;
  landingPathname: string;
  surface: string;
  currentHost?: string;
}): AnalyticsAttribution {
  const source = classifyTrafficSource(input);
  return {
    source,
    ...(bounded(input.utmMedium, 80) ? { medium: bounded(input.utmMedium, 80) } : {}),
    ...(bounded(input.utmCampaign, 120) ? { campaign: bounded(input.utmCampaign, 120) } : {}),
    ...(bounded(input.utmContent, 120) ? { content: bounded(input.utmContent, 120) } : {}),
    ...(bounded(input.utmTerm, 80) ? { term: bounded(input.utmTerm, 80) } : {}),
    ...(bounded(input.referrerHost, 160) ? { referrerHost: bounded(input.referrerHost, 160)?.toLocaleLowerCase() } : {}),
    landingPathname: normalizeAnalyticsPathname(input.landingPathname),
  };
}

export function normalizeSearchQuery(value: string) {
  return value.trim()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[redacted]')
    .replace(/(?:\+?\d[\s()-]*){6,}\d/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

export function isLocalAnalyticsRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
