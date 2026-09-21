import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { hasTrustedMutationOrigin } from './lib/security/requestOrigin';
import { resolveCategoryRoute } from './lib/catalog/categoryHierarchy';
import type { Category } from './types';

const handleI18nRouting = createMiddleware(routing);

const categoryCache = new Map<string, { expiresAt: number; categories: Category[]; pending?: Promise<Category[]> }>();

async function getRouteCategories(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const cached = categoryCache.get(origin);
  if (cached?.categories.length && cached.expiresAt > Date.now()) return cached.categories;
  if (cached?.pending) return cached.pending;

  const pending = fetch(new URL('/api/catalog?resource=categories', request.url), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(3_000),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Category route check returned ${response.status}.`);
    const value: unknown = await response.json();
    if (!Array.isArray(value)) throw new Error('Category route check returned malformed data.');
    return value as Category[];
  });
  categoryCache.set(origin, { expiresAt: 0, categories: cached?.categories || [], pending });
  try {
    const categories = await pending;
    categoryCache.set(origin, { expiresAt: Date.now() + 60_000, categories });
    return categories;
  } catch (error) {
    categoryCache.delete(origin);
    throw error;
  }
}

function localizedCatalogNotFound(request: NextRequest, locale: string) {
  const target = request.nextUrl.clone();
  target.pathname = `/${locale}/__catalog-not-found`;
  target.search = '';
  const response = NextResponse.rewrite(target, {
    status: 404,
    headers: { 'X-Robots-Tag': 'noindex, nofollow' },
  });
  response.cookies.set('NEXT_LOCALE', locale, { path: '/', sameSite: 'lax' });
  return response;
}

async function handleCatalogRouting(request: NextRequest, locale: string, segments: string[]) {
  if (segments.length > 2) return localizedCatalogNotFound(request, locale);
  try {
    const resolved = resolveCategoryRoute(segments, await getRouteCategories(request));
    if (!resolved) return localizedCatalogNotFound(request, locale);
    if (resolved.redirect) {
      const target = request.nextUrl.clone();
      target.pathname = `/${locale}${resolved.path}`;
      const response = NextResponse.redirect(target, 308);
      response.cookies.set('NEXT_LOCALE', locale, { path: '/', sameSite: 'lax' });
      return response;
    }
  } catch {
    // Availability of the storefront is more important than the early SEO
    // status check. The page still fails closed with noindex if data is down.
  }
  return handleI18nRouting(request);
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const cookieEndpoint = /^\/api\/(?:admin|auth)(?:\/|$)/.test(request.nextUrl.pathname)
      || (request.nextUrl.pathname === '/api/requests' && request.cookies.has('__sanpack_customer'));
    if (cookieEndpoint && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
      && !hasTrustedMutationOrigin(request)) {
      return NextResponse.json({ error: 'Недопустимый источник запроса.' }, { status: 403 });
    }
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const requestHeaders = new Headers(request.headers);
    // Always overwrite a caller-provided value. The dashboard layout uses this
    // server-internal header for its role/path capability gate.
    requestHeaders.set('x-sanpack-admin-path', request.nextUrl.pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (request.method === 'GET' || request.method === 'HEAD') {
    const parts = request.nextUrl.pathname.split('/').filter(Boolean);
    const locale = parts[0];
    if (routing.locales.includes(locale as (typeof routing.locales)[number]) && parts[1] === 'catalog' && parts.length >= 3) {
      const segments = parts.slice(2);
      if (!(segments.length === 1 && segments[0] === 'print')) {
        return handleCatalogRouting(request, locale, segments);
      }
    }
    if (parts[0] === 'catalog' && parts.length >= 2) {
      const segments = parts.slice(1);
      if (!(segments.length === 1 && segments[0] === 'print')) {
        return handleCatalogRouting(request, routing.defaultLocale, segments);
      }
    }
  }
  return handleI18nRouting(request);
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/((?!$|api|admin|_next|_vercel|.*\\..*).*)'],
};
