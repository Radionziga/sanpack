import { expect, test } from '@playwright/test';

async function captureAnalytics(page: import('@playwright/test').Page) {
  const events: Array<Record<string, unknown>> = [];
  await page.route('**/api/analytics/events', async (route) => {
    if (route.request().method() === 'POST') events.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 204 });
  });
  return events;
}

test.describe('first-party analytics admin', () => {
  test('owner sees an aggregated privacy-safe report and filters', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Аналитика', level: 1 })).toBeVisible();
    await expect(page.getByText('Посетители', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Воронка' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Самые интересные товары' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'autumn-horeca' })).toBeVisible();
    await page.getByLabel('Поверхность').selectOption('telegram_mini_app');
    await expect(page.getByLabel('Поверхность')).toHaveValue('telegram_mini_app');
    await page.getByLabel('Показатель графика').selectOption('requests');
    await page.getByLabel('Сортировка товаров').selectOption('requests');
  });

  test('non-owner roles do not receive the analytics surface', async ({ page, context }) => {
    await context.addCookies([{ name: 'fixture_admin_role', value: 'content_manager', domain: '127.0.0.1', path: '/' }]);
    const apiResponse = await context.request.get('/api/admin/analytics?from=2026-09-01&to=2026-09-13');
    expect(apiResponse.status()).toBe(403);
    await page.goto('/admin/analytics', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Раздел недоступен' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Аналитика' })).toHaveCount(0);
  });
});

test('storefront journey emits bounded engagement events without blocking commerce', async ({ page }) => {
  const events = await captureAnalytics(page);
  await page.goto('/ru?utm_source=instagram&utm_medium=paid_social&utm_campaign=autumn-horeca&phone=private', { waitUntil: 'networkidle' });
  await expect.poll(() => events.some((event) => event.name === 'page_view')).toBe(true);
  const landing = events.find((event) => event.name === 'page_view');
  expect(landing?.attribution).toMatchObject({ utmSource: 'instagram', utmMedium: 'paid_social', utmCampaign: 'autumn-horeca' });
  expect(JSON.stringify(landing)).not.toContain('private');

  await page.goto('/ru/product/fixture-packaged', { waitUntil: 'networkidle' });
  await expect.poll(() => events.some((event) => event.name === 'product_view')).toBe(true);
  await page.getByRole('button', { name: /800 мл/ }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'В корзину', exact: true }).click();
  await expect.poll(() => events.some((event) => event.name === 'add_to_cart')).toBe(true);

  await page.goto('/ru/request', { waitUntil: 'networkidle' });
  await expect.poll(() => ['cart_view', 'request_start'].every((name) => events.some((event) => event.name === name))).toBe(true);
  expect(events.some((event) => 'customerUid' in event || 'phone' in event || 'telegramId' in event)).toBe(false);
});

test('Telegram Mini App surface is classified without customer identity', async ({ page }) => {
  const events = await captureAnalytics(page);
  await page.route('https://telegram.org/js/telegram-web-app.js', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "window.Telegram={WebApp:{initData:'fixture-proof',ready(){},expand(){}}};",
  }));
  await page.route('**/api/auth/telegram/mini-app', (route) => route.fulfill({ status: 401, json: { error: 'Rejected fixture proof.' } }));
  await page.goto('/ru/product/fixture-packaged', { waitUntil: 'networkidle' });
  await expect.poll(() => events.some((event) => event.name === 'product_view' && event.surface === 'telegram_mini_app')).toBe(true);
  expect(events.some((event) => 'customerUid' in event || 'telegramId' in event)).toBe(false);
});

test('category editor explains independent navigation and home artwork fallbacks', async ({ page }) => {
  await page.goto('/admin/categories', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Куриные яйца/ }).first().click();
  await expect(page.getByText('Иконка для боковой навигации')).toBeVisible();
  await expect(page.getByText('Обложка карточки на главной')).toBeVisible();
  await expect(page.getByText(/резервная иконка/)).toBeVisible();
  await expect(page.getByText(/резервная обложка/)).toBeVisible();
});
