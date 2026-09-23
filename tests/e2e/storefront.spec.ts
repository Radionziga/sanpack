import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const criticalRoutes = [
  '/ru',
  '/ru/catalog',
  '/ru/product/syr-svalya-3-kg-da-013',
  '/ru/bag-designer',
  '/ru/definitely-missing-page',
];

test('image loading prioritizes visible content and caches static artwork', async ({ page, request }) => {
  await page.goto('/ru', { waitUntil: 'domcontentloaded' });
  const banners = page.locator('section[aria-label="Промо-предложения"] img');
  await expect(banners.first()).toHaveAttribute('loading', 'eager');
  await expect(banners.nth(1)).toHaveAttribute('loading', 'lazy');
  await expect(page.locator('section[aria-labelledby^="home-shelf-"] img').first()).toHaveAttribute('loading', 'lazy');

  const artwork = await request.get('/catalog/generated-products/price-2026-vb-001.webp');
  expect(artwork.ok()).toBe(true);
  expect(artwork.headers()['cache-control']).toContain('max-age=3600');

  await page.goto('/ru/product/syr-svalya-3-kg-da-013', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('img[fetchpriority="high"][loading="eager"]').first()).toBeVisible();
});

test('storefront, product and designer render without raw translation keys', async ({ page }) => {
  for (const route of criticalRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText(/PublicDataUnavailableError|Internal Server Error/);
    await expect(page.locator('body')).not.toContainText(/home\.catalog|categories\.itemsCount|titleRu/);
  }
});

test('all supported locales have a localized bag designer', async ({ page }) => {
  const expected = {
    ru: 'Соберите пакет под свой бренд',
    uz: 'Brendingiz uchun paket yarating',
    en: 'Build a bag for your brand',
    zh: '为您的品牌定制包装袋',
  };
  for (const [locale, heading] of Object.entries(expected)) {
    await page.goto(`/${locale}/bag-designer`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('404 offers safe recovery actions', async ({ page }) => {
  await page.goto('/ru/definitely-missing-page', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Такой страницы нет' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'На главную', exact: true })).toBeVisible();
});

for (const route of criticalRoutes) {
  test(`@a11y no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.hasAttribute('lang'));
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => (
      violation.impact === 'critical' || violation.impact === 'serious'
    ))).toEqual([]);
  });
}
