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
    await expect(page.getByRole('heading', { name: 'Путь до заявки' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Самые интересные товары' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'autumn-horeca' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Активность по времени' })).toBeVisible();
    const activityChart = page.locator('[data-chart="analytics"]');
    await expect(activityChart).toBeVisible();
    await activityChart.locator('.recharts-area-dot').first().hover();
    await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Источники трафика' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Источники трафика' }).getByText('Instagram', { exact: true })).toBeVisible();
    await expect(page.getByText('internal', { exact: true })).toHaveCount(0);
    await page.getByLabel('Платформа').selectOption('telegram_mini_app');
    await expect(page.getByLabel('Платформа')).toHaveValue('telegram_mini_app');
    await page.getByLabel('Показатель графика').selectOption('requests');
    await page.getByLabel('Показатель графика').selectOption('pageViews');
    await page.getByLabel('Сортировка товаров').selectOption('requests');
  });

  test('multi-point, low-data and zero-data chart states stay honest and responsive', async ({ page }) => {
    await page.route('**/api/admin/analytics?**', async (route) => {
      const response = await route.fetch();
      const report = await response.json();
      if (new URL(route.request().url()).searchParams.get('locale') === 'zh') {
        for (const metric of Object.values(report.metrics) as Array<{ value: number; previous: number; changePercent: number | null }>) {
          metric.value = 0;
          metric.previous = 0;
          metric.changePercent = 0;
        }
        report.trend = report.trend.map((point: Record<string, string | number>) => ({
          ...point, visitors: 0, sessions: 0, pageViews: 0, productViews: 0, cartAdds: 0, requests: 0,
        }));
        report.funnel = report.funnel.map((step: Record<string, string | number | null>) => ({ ...step, count: 0, overallPercent: 0, fromPreviousPercent: null }));
        report.breakdowns = { locale: [], surface: [], device: [], source: [] };
      }
      await route.fulfill({ status: response.status(), contentType: 'application/json', body: JSON.stringify(report) });
    });
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-chart="analytics"] .recharts-area')).toBeVisible();
    await expect(page.locator('[data-chart="analytics"]')).toContainText('08.09');
    await page.getByRole('button', { name: 'Сегодня' }).click();
    await expect(page.locator('[data-chart="analytics"]')).toContainText(/\d{2}:00/);
    await page.getByLabel('Показатель графика').selectOption('requests');
    await expect(page.getByText(/Пока мало данных для устойчивой динамики/)).toBeVisible();
    await expect(page.locator('[data-chart="analytics"] .recharts-bar')).toBeVisible();
    await page.getByLabel('Показатель графика').selectOption('cartAdds');
    await expect(page.getByText(/Пока мало данных для устойчивой динамики/)).toBeVisible();

    await page.getByLabel('Язык').selectOption('zh');
    await expect(page.getByText('За выбранный период активности пока нет')).toBeVisible();
    await expect(page.locator('[data-chart="analytics"]')).toHaveCount(0);
    await page.setViewportSize({ width: 820, height: 900 });
    await expect(page.getByRole('heading', { name: 'Путь до заявки' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Источники трафика' })).toBeVisible();
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
  await expect(page.getByText(/На главной · позиция/).first()).toBeVisible();
  await expect(page.getByText('Не показывается на главной', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /Куриные яйца/ }).first().click();
  await expect(page.getByText('Иконка для боковой навигации')).toBeVisible();
  await expect(page.getByText('Обложка карточки на главной')).toBeVisible();
  await expect(page.getByText(/резервная иконка/)).toBeVisible();
  await expect(page.getByText(/резервная обложка/)).toBeVisible();
  await expect(page.getByText('Показывать карточку на главной', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Позиция карточки на главной')).toBeVisible();
});
