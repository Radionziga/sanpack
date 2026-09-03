import { expect, test } from '@playwright/test';

// This suite runs only against the isolated taxonomy fixture: cloud access disabled.
// Admin identity itself is mocked there; real session/role checks live in Vitest.
test('@security actual Next proxy blocks foreign-origin cookie mutations', async ({ request }) => {
  for (const path of ['/api/auth/session', '/api/admin/media', '/api/auth/customer', '/api/auth/telegram/mini-app']) {
    const response = await request.post(path, { headers: { origin: 'https://evil.example' }, data: {} });
    expect(response.status()).toBe(403);
  }
  const checkout = await request.post('/api/requests', { headers: { origin: 'https://evil.example', cookie: '__sanpack_customer=fixture' }, data: {} });
  expect(checkout.status()).toBe(403);
});

test('@security public checkout rejects forged totals before any cloud access', async ({ request }) => {
  const response = await request.post('/api/requests', { data: {
    contactName: 'Fixture customer', phone: '+998901234567', deliveryAddress: 'Fixture address',
    deliveryDate: '2026-09-01', deliveryWindow: '09:00-13:00',
    items: [{ productId: 'fixture-grocery', quantity: 1, unitPrice: 1 }], total: 1,
  } });
  expect(response.status()).toBe(400);
});

test('@security utility pages and API carry noindex and private API cache headers', async ({ request }) => {
  for (const path of ['/ru/request', '/ru/orders', '/ru/profile', '/ru/search', '/ru/favorites', '/ru/catalog/print', '/api/health', '/api/catalog?resource=products']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    if (path.startsWith('/api/')) expect(response.headers()['cache-control']).toContain('no-store');
  }
});
