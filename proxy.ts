import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { hasTrustedMutationOrigin } from './lib/security/requestOrigin';
import { resolveCategoryRoute } from './lib/catalog/categoryHierarchy';
import { projectPublicCategories } from './lib/catalog/publicProjection';
import { getAdminDb } from './lib/firebase/admin';
import type { Category } from './types';

const handleI18nRouting = createMiddleware(routing);

const categoryCache = new Map<string, { expiresAt: number; categories: Category[]; pending?: Promise<Category[]> }>();

async function readRouteCategories(request: NextRequest) {
  // The isolated browser fixture intentionally has no Firebase credentials.
  // Production reads Firestore directly instead of self-fetching the same Next
  // service: a self-fetch can wait behind the request that initiated it and let
  // a streamed notFound()/redirect degrade to HTTP 200 on App Hosting.
  if (process.env.SANPACK_USE_SEED_DATA === 'true' || process.env.NODE_ENV === 'test') {
    const response = await fetch(new URL('/api/catalog?resource=categories', request.url), {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Category route check returned ${response.status}.`);
    const value: unknown = await response.json();
    if (!Array.isArray(value)) throw new Error('Category route check returned malformed data.');
    return value as Category[];
  }

  const snapshot = await getAdminDb().collection('categories').get();
  return projectPublicCategories(snapshot.docs.map((document) => ({
    ...document.data(),
    id: document.id,
  }) as Category));
}

async function getRouteCategories(request: NextRequest) {
  const cacheKey = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || request.nextUrl.origin;
  const cached = categoryCache.get(cacheKey);
  if (cached?.categories.length && cached.expiresAt > Date.now()) return cached.categories;
  if (cached?.pending) return cached.pending;

  const pending = readRouteCategories(request);
  categoryCache.set(cacheKey, { expiresAt: 0, categories: cached?.categories || [], pending });
  try {
    const categories = await pending;
    categoryCache.set(cacheKey, { expiresAt: Date.now() + 60_000, categories });
    return categories;
  } catch (error) {
    categoryCache.delete(cacheKey);
    throw error;
  }
}

function localizedCatalogNotFound(request: NextRequest, locale: string) {
  const copy = {
    ru: ['Ошибка 404', 'Такой страницы каталога нет', 'Проверьте адрес или продолжите поиск в каталоге.', 'Перейти в каталог'],
    uz: ['404 xatosi', 'Bunday katalog sahifasi yo‘q', 'Manzilni tekshiring yoki katalogda qidirishni davom ettiring.', 'Katalogga o‘tish'],
    en: ['Error 404', 'This catalog page could not be found', 'Check the address or continue browsing the catalog.', 'Browse catalog'],
    zh: ['404 错误', '未找到此目录页面', '请检查地址，或继续浏览商品目录。', '浏览目录'],
  } as const;
  const [eyebrow, title, description, action] = copy[locale as keyof typeof copy] || copy.ru;
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} — SANPACK</title><style>body{margin:0;background:#f6f8f6;color:#142019;font-family:Arial,sans-serif}main{min-height:100vh;display:grid;place-items:center;padding:24px}.card{max-width:640px;background:#fff;border:1px solid #dce4de;border-radius:24px;padding:48px;text-align:center}.eyebrow{color:#17633b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:12px}h1{font-size:36px;line-height:1.1;margin:16px 0 12px}p{color:#5e6a63;line-height:1.6;margin:0 0 28px}a{display:inline-flex;min-height:48px;align-items:center;border-radius:12px;background:#17633b;color:#fff;padding:0 20px;text-decoration:none;font-weight:700}</style></head><body><main><section class="card"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p><a href="/${locale}/catalog">${action}</a></section></main></body></html>`;
  const response = new NextResponse(html, {
    status: 404,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Language': locale,
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
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
