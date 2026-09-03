import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { hasTrustedMutationOrigin } from './lib/security/requestOrigin';

const handleI18nRouting = createMiddleware(routing);

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
  return handleI18nRouting(request);
}

export const config = {
  matcher: ['/api/:path*', '/((?!$|api|admin|_next|_vercel|.*\\..*).*)'],
};
