import { expect, test } from '@playwright/test';

test.describe('customer identity and isolated order operations', () => {
  test('Mini App establishes one customer session before profile state is loaded', async ({ page }) => {
    const sequence: string[] = [];
    await page.addInitScript(() => {
      window.Telegram = { WebApp: { initData: 'signed-fixture', ready() {}, expand() {} } } as never;
    });
    await page.route('**/api/auth/telegram/mini-app', async (route) => {
      sequence.push('mini-app');
      await new Promise((resolve) => setTimeout(resolve, 80));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true }) });
    });
    await page.route('**/api/auth/customer', async (route) => {
      sequence.push('customer');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        authenticated: true,
        customer: { name: 'Mini Fixture', phone: '+998901234567', company: '', address: '', inn: '' },
      }) });
    });
    await page.goto('/ru/profile');
    await expect(page.getByRole('heading', { name: 'Профиль Telegram' })).toBeVisible();
    expect(sequence.indexOf('mini-app')).toBeLessThan(sequence.indexOf('customer'));
  });

  test('browser login preserves the full localized intended destination', async ({ page }) => {
    await page.route('**/api/auth/customer', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, customer: null }) }));
    const started = page.waitForRequest((request) => request.url().includes('/api/auth/telegram/start'));
    await page.route('**/api/auth/telegram/start**', (route) => route.abort());
    await page.goto('/ru/profile?tab=history#contact');
    await page.getByRole('button', { name: 'Войти через Telegram' }).click();
    const request = await started;
    expect(new URL(request.url()).searchParams.get('returnTo')).toBe('/ru/profile?tab=history#contact');
  });

  test('logout clears customer UI and protected history recovers with login prompt', async ({ page }) => {
    let authenticated = true;
    await page.route('**/api/auth/customer', async (route) => {
      if (route.request().method() === 'DELETE') {
        authenticated = false;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        authenticated,
        customer: authenticated ? { name: 'Fixture Customer', phone: '+998901234567', company: '', address: '', inn: '' } : null,
      }) });
    });
    await page.route('**/api/requests', (route) => route.fulfill({ status: authenticated ? 200 : 401, contentType: 'application/json', body: authenticated ? '[]' : JSON.stringify({ error: 'login' }) }));
    await page.goto('/ru/profile');
    await expect(page.getByRole('heading', { name: 'Профиль Telegram' })).toBeVisible();
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByRole('heading', { name: 'Гостевой профиль' })).toBeVisible();
    await page.goto('/ru/orders');
    await expect(page.getByRole('heading', { name: 'Войдите через Telegram' })).toBeVisible();
  });

  test('failed logout does not pretend that the active customer session was cleared', async ({ page }) => {
    await page.route('**/api/auth/customer', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        authenticated: true,
        customer: { name: 'Fixture Customer', phone: '+998901234567', company: '', address: '', inn: '' },
      }) });
    });
    await page.goto('/ru/profile');
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByRole('heading', { name: 'Профиль Telegram' })).toBeVisible();
    await expect(page.locator('p[role="alert"]')).toContainText('Не удалось завершить выход');
  });

  test('order operator can run a server-authorized isolated smoke without public checkout', async ({ page }) => {
    let publicCheckoutCalls = 0;
    let testPayload: Record<string, unknown> | null = null;
    await page.route('**/api/requests', (route) => { publicCheckoutCalls += 1; return route.abort(); });
    await page.route('**/api/admin/order-tests', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        return;
      }
      testPayload = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        id: 'test-1', requestNumber: 'TEST-FIXTURE', contactName: 'SANPACK — изолированный тест',
        phone: '+998 00 000 00 00', status: 'new', createdAt: new Date().toISOString(), items: [], total: 100,
        notification: { status: 'suppressed', delivered: false, channel: 'test_sink', reason: 'suppressed_test' },
        test: { isolated: true, runId: 'fixture', createdBy: 'fixture', idempotencyReferenceId: 'fixture' },
      }) });
    });
    await page.goto('/admin/requests');
    await page.getByRole('button', { name: 'Безопасный smoke test' }).click();
    await page.getByLabel('Товар').click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: 'Запустить test' }).click();
    await expect(page.getByText(/canonical pricing проверен/)).toBeVisible();
    expect(testPayload).toMatchObject({ confirmation: 'CREATE_ISOLATED_TEST_REQUEST' });
    expect(testPayload).not.toHaveProperty('suppressNotification');
    expect(publicCheckoutCalls).toBe(0);
  });
});
