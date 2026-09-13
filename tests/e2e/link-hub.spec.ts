import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('link hub is a standalone localized mobile destination', async ({ page }) => {
  const response = await page.goto('/ru/links', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: /Всё для вашего бизнеса/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Открыть каталог' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Написать в Telegram' })).toHaveAttribute('href', 'https://t.me/sanpack_uz');
  await expect(page.locator('.mobile-bottom-navigation')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Связаться' })).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/ru\/links$/);

  await page.getByRole('link', { name: 'Открыть каталог' }).click();
  await expect(page).toHaveURL(/\/ru\/catalog$/);
});

test('link hub remains readable at 320px and passes critical accessibility checks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/en/links', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: /Everything your business needs/ })).toBeVisible();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(horizontalOverflow).toBe(false);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')).toEqual([]);
});

test('link hub renders localized copy across every storefront locale', async ({ page }) => {
  for (const [locale, heading] of [
    ['ru', 'Всё для вашего бизнеса — в одном месте'],
    ['uz', 'Biznesingiz uchun hammasi bir joyda'],
    ['en', 'Everything your business needs, in one place'],
    ['zh', '企业所需，一站汇集'],
  ] as const) {
    await page.goto(`/${locale}/links`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
});

test('admin can edit, validate and round-trip Link Hub settings in the isolated fixture', async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), 'The operational admin editor is covered in its desktop layout; public mobile coverage is separate.');
  let submittedTitle = '';
  await page.route('**/api/admin/data', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON();
    submittedTitle = body.data.linkHub.titleEn;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body.data),
    });
  });
  await page.goto('/admin/links');
  await expect(page.getByRole('heading', { level: 1, name: 'Страница ссылок' })).toBeVisible();
  await page.getByRole('tab', { name: 'EN' }).click();
  const title = page.getByLabel('Заголовок · EN');
  await title.fill('SANPACK business links');
  await page.getByRole('button', { name: 'Добавить ссылку' }).click();
  const lastAddress = page.getByLabel('Адрес').last();
  await lastAddress.fill('javascript:alert(1)');
  await expect(page.getByText('Ссылка имеет недопустимый или небезопасный формат.')).toBeVisible();
  await lastAddress.fill('mailto:sales@sanpack.uz');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByText('Страница ссылок сохранена.')).toBeVisible();
  expect(submittedTitle).toBe('SANPACK business links');
});

test('the 320px home carousel does not widen the document', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/ru', { waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
