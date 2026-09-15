import { expect, test } from '@playwright/test';

test('external providers never load in local or automated storefront tests', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (/googletagmanager\.com|google-analytics\.com|mc\.yandex\.(?:ru|com)/.test(request.url())) externalRequests.push(request.url());
  });
  await page.goto('/ru?utm_source=e2e&utm_campaign=must-not-leak', { waitUntil: 'networkidle' });
  await expect(page.locator('script[src*="googletagmanager.com"], script[src*="mc.yandex.ru"]')).toHaveCount(0);
  expect(externalRequests).toEqual([]);
});

test('Admin Integrations exposes bounded external analytics configuration', async ({ page }) => {
  await page.goto('/admin/integrations', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Внешняя аналитика' })).toBeVisible();
  await expect(page.getByLabel('Measurement ID')).toHaveValue('G-0NGEJGYW2Z');
  await expect(page.getByLabel('Номер счётчика')).toHaveValue('');
  await expect(page.getByText(/Вебвизор, запись сессий/)).toBeVisible();
});
