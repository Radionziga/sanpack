import { expect, test } from '@playwright/test';

async function installTelegramMiniApp(page: import('@playwright/test').Page, initData: string) {
  await page.route('https://telegram.org/js/telegram-web-app.js', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.Telegram={WebApp:{initData:${JSON.stringify(initData)},ready(){},expand(){},BackButton:{show(){},hide(){},onClick(){},offClick(){}}}};`,
  }));
}

test.describe('customer identity and isolated order operations', () => {
  test('ordinary browser keeps its valid cookie-backed customer session', async ({ page }) => {
    let miniAppCalls = 0;
    await page.route('**/api/auth/telegram/mini-app', (route) => { miniAppCalls += 1; return route.abort(); });
    await page.route('**/api/auth/customer', (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({
        authenticated: true,
        customer: { name: 'Browser Account A', phone: '+998901234567', company: '', address: '', inn: '' },
      }),
    }));
    await page.goto('/ru/profile');
    await expect(page.getByRole('heading', { name: 'Профиль Telegram' })).toBeVisible();
    await expect(page.getByLabel('Контактное лицо')).toHaveValue('Browser Account A');
    expect(miniAppCalls).toBe(0);
  });

  test('Mini App establishes one customer session before profile state is loaded', async ({ page }) => {
    const sequence: string[] = [];
    await installTelegramMiniApp(page, 'signed-fixture');
    await page.addInitScript(() => {
      window.Telegram = { WebApp: { initData: 'signed-fixture', ready() {}, expand() {} } } as never;
      localStorage.setItem('sanpack_customer_profile_v1', JSON.stringify({
        name: 'Previous Account A', phone: '+998909999999', address: 'Previous address',
      }));
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
    await expect(page.getByLabel('Контактное лицо')).toHaveValue('Mini Fixture');
    await expect(page.getByText('Previous Account A')).toHaveCount(0);
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
    await expect(page.getByRole('alert').filter({ hasText: 'Не удалось завершить выход' })).toBeVisible();
  });

  test('rejected Mini App proof never exposes a previous browser customer in profile, history or checkout', async ({ page }) => {
    let customerReads = 0;
    let orderReads = 0;
    await installTelegramMiniApp(page, 'rejected-account-b');
    await page.addInitScript(() => {
      window.Telegram = { WebApp: { initData: 'rejected-account-b', ready() {}, expand() {} } } as never;
      localStorage.setItem('sanpack_request_cart_v1', JSON.stringify([{
        productId: 'fixture-grocery', productTitleRu: 'Fixture grocery', productTitleUz: 'Fixture grocery',
        productSlug: 'fixture-grocery', sku: 'FIXTURE-grocery', quantity: 1, unit: 'шт', price: 100,
      }]));
      localStorage.setItem('sanpack_customer_profile_v1', JSON.stringify({
        name: 'Stale Browser Account A', phone: '+998901234567', address: 'Stale address',
      }));
    });
    await page.route('**/api/auth/telegram/mini-app', (route) => route.fulfill({
      status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'invalid proof' }),
    }));
    await page.route('**/api/auth/customer', (route) => {
      customerReads += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        authenticated: true,
        customer: { name: 'Cookie Account A', phone: '+998901234567', company: '', address: 'A', inn: '' },
      }) });
    });
    await page.route('**/api/requests', (route) => {
      orderReads += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/ru/profile');
    await expect(page.getByRole('heading', { name: 'Требуется проверка Telegram' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Данные другой сессии скрыты' })).toBeVisible();
    await expect(page.getByText('Cookie Account A')).toHaveCount(0);
    await expect(page.getByLabel('Контактное лицо')).not.toHaveValue('Stale Browser Account A');

    await page.goto('/ru/orders');
    await expect(page.getByRole('alert').filter({ hasText: 'Данные другой сессии не показаны' })).toBeVisible();
    await expect(page.getByText('Cookie Account A')).toHaveCount(0);

    await page.goto('/ru/request');
    await expect(page.getByRole('alert').filter({ hasText: 'Заявка заблокирована' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отправить заявку' }).first()).toBeDisabled();
    await expect(page.getByLabel('Имя')).not.toHaveValue('Stale Browser Account A');
    expect(customerReads).toBe(0);
    expect(orderReads).toBe(0);
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
