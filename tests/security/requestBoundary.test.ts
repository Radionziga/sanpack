import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
vi.mock('next-intl/middleware', () => ({ default: () => () => NextResponse.next() }));
import { proxy } from '@/proxy';
import { hasTrustedMutationOrigin } from '@/lib/security/requestOrigin';
import { readJsonBody } from '@/lib/security/readJsonBody';
import { logError } from '@/lib/observability/logger';
import { taxonomyCategories } from '@/tests/fixtures/categories';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('cookie mutation origin boundary', () => {
  it('forwards a trusted admin pathname and overwrites caller spoofing', async () => {
    const response = await proxy(new NextRequest('https://shop.example/admin/settings', {
      headers: { 'x-sanpack-admin-path': '/admin/products' },
    }));
    expect(response.headers.get('x-middleware-request-x-sanpack-admin-path')).toBe('/admin/settings');
  });
  it.each(['/api/auth/session', '/api/admin/data', '/api/admin/media', '/api/admin/order-tests', '/api/auth/customer', '/api/auth/telegram/mini-app'])('rejects cross-site POST before %s handler', async (path) => {
    const r = await proxy(new NextRequest(`https://shop.example${path}`, { method: 'POST', headers: { origin: 'https://evil.example' } }));
    expect(r.status).toBe(403);
  });
  it.each(['null', 'https://evil.shop.example', 'https://shop.example.evil.test'])('rejects opaque/lookalike origins: %s', (origin) => {
    expect(hasTrustedMutationOrigin(new Request('https://shop.example/api/auth/session', { headers: { origin } }))).toBe(false);
  });
  it('requires Origin and permits real same-origin requests', async () => {
    expect(hasTrustedMutationOrigin(new Request('https://shop.example/api/admin/data'))).toBe(false);
    const r = new NextRequest('https://shop.example/api/admin/data', { method: 'POST', headers: { origin: 'https://shop.example' } });
    expect((await proxy(r)).status).toBe(200);
  });
  it('permits configured HTTPS origin behind an internal proxy', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shop.example');
    expect(hasTrustedMutationOrigin(new Request('http://backend/api/auth/session', { headers: { origin: 'https://shop.example' } }))).toBe(true);
  });
  it('does not intercept Telegram GET callback or public checkout API', async () => {
    expect((await proxy(new NextRequest('https://shop.example/api/auth/telegram/callback'))).status).toBe(200);
    expect((await proxy(new NextRequest('https://shop.example/api/requests', { method: 'POST' }))).status).toBe(200);
  });
  it('protects checkout using customer cookies while keeping guest API available', async () => {
    const request = new NextRequest('https://shop.example/api/requests', {
      method: 'POST', headers: { cookie: '__sanpack_customer=signed', origin: 'https://untrusted.shop.example' },
    });
    expect((await proxy(request)).status).toBe(403);
  });
});

describe('canonical category routing boundary', () => {
  it('returns an HTTP redirect for a flat Subcategory and a real 404 for an unknown Category', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(taxonomyCategories), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const redirect = await proxy(new NextRequest('https://seo-route.example/ru/catalog/grains'));
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get('location')).toBe('https://seo-route.example/ru/catalog/grocery/grains');

    const unprefixed = await proxy(new NextRequest('https://seo-route.example/catalog/grains'));
    expect(unprefixed.status).toBe(308);
    expect(unprefixed.headers.get('location')).toBe('https://seo-route.example/ru/catalog/grocery/grains');

    const missing = await proxy(new NextRequest('https://seo-route.example/ru/catalog/not-a-category'));
    expect(missing.status).toBe(404);
    expect(missing.headers.get('x-middleware-rewrite')).toBeNull();
    expect(missing.headers.get('content-type')).toContain('text/html');
    expect(missing.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(await missing.text()).toContain('<h1>Такой страницы нет</h1>');
  });
});

describe('bounded untrusted JSON', () => {
  it('reads JSON and rejects malformed or excessive bodies', async () => {
    const request = (body: string) => new Request('https://shop.example/api', { method: 'POST', body });
    expect(await readJsonBody(request('{"a":1}'))).toEqual({ a: 1 });
    expect(await readJsonBody(request('{'))).toBeNull();
    expect(await readJsonBody(request('{"a":"0123456789"}'), 8)).toBeNull();
  });
  it('enforces actual bytes on a chunked body without Content-Length', async () => {
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"a":')); c.enqueue(new Uint8Array(1024)); c.close(); } });
    const request = new Request('https://shop.example/api', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
    expect(await readJsonBody(request, 512)).toBeNull();
  });
  it('does not put upstream tokens, PII, causes or stack in structured logs', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logError('test.failure', new Error('https://api.example/token=SECRET phone=PRIVATE', { cause: new Error('SECRET') }));
    expect(String(output.mock.calls[0][0])).not.toMatch(/SECRET|PRIVATE|stack|cause/);
  });
});
