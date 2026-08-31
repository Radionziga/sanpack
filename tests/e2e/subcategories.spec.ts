import { expect, test } from '@playwright/test';

test('category scope, compact navigation, nested URL and breadcrumbs', async ({ page }) => {
  await page.goto('/ru/catalog/grocery');
  for (const title of ['Fixture grocery', 'Fixture grains', 'Fixture flour']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Fixture cheese', exact: true })).toHaveCount(0);
  const sections = page.getByRole('navigation', { name: 'Разделы категории' });
  await sections.getByRole('link', { name: 'grains', exact: true }).click();
  await expect(page).toHaveURL(/\/ru\/catalog\/grocery\/grains$/);
  await expect(page.getByRole('heading', { name: 'Fixture grains', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fixture flour', exact: true })).toHaveCount(0);
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  await expect(breadcrumb).toContainText('grocery');
  await expect(breadcrumb).toContainText('grains');
  await expect(breadcrumb).not.toContainText('food');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/ru\/catalog\/grocery\/grains$/);
  await expect(page.locator('link[rel="alternate"][hreflang="uz"]')).toHaveAttribute('href', /\/uz\/catalog\/grocery\/grains$/);
  await sections.getByRole('link', { name: 'Все', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fixture grocery', exact: true })).toBeVisible();
});

test('group scope and legacy subcategory alias, invalid parent and locale', async ({ page }) => {
  await page.goto('/ru/catalog/food');
  for (const id of ['grocery', 'grains', 'flour', 'cheese']) {
    await expect(page.getByRole('heading', { name: `Fixture ${id}`, exact: true })).toBeVisible();
  }
  await page.goto('/uz/catalog/grains');
  await expect(page).toHaveURL(/\/uz\/catalog\/grocery\/grains$/);
  await expect(page.getByRole('heading', { name: 'grains UZ', exact: true })).toBeVisible();
  await page.goto('/ru/catalog/dairy/grains');
  await expect(page.getByRole('heading', { name: 'Такой страницы нет' })).toBeVisible();
});

test('product breadcrumb returns to nested category', async ({ page }) => {
  await page.goto('/ru/product/fixture-grains');
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  await expect(breadcrumb.getByRole('link', { name: 'grains', exact: true })).toHaveAttribute('href', '/ru/catalog/grocery/grains');
  await breadcrumb.getByRole('link', { name: 'grains', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fixture grains', exact: true })).toBeVisible();
});

test('print scope includes descendants once and can select a subcategory', async ({ page }) => {
  await page.goto('/ru/catalog/print?category=grocery&prices=1&lang=ru');
  for (const id of ['grocery', 'grains', 'flour']) {
    await expect(page.getByRole('heading', { name: `Fixture ${id}`, exact: true })).toHaveCount(1);
  }
  await expect(page.getByRole('heading', { name: 'Fixture cheese', exact: true })).toHaveCount(0);
  await page.locator('select').selectOption('grains');
  await expect(page.getByRole('heading', { name: 'Fixture grains', exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Fixture flour', exact: true })).toHaveCount(0);
});

test('desktop navigation reveals the bounded third level', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Desktop disclosure; mobile chips are covered separately.');
  await page.goto('/ru/catalog/grocery/grains');
  const sidebar = page.getByRole('complementary', { name: 'Категории товаров', exact: true });
  await expect(sidebar.getByRole('link', { name: 'grains', exact: true })).toBeVisible();
  await sidebar.getByRole('button', { name: /.*: grocery$/ }).click();
  await expect(sidebar.getByRole('link', { name: 'grains', exact: true })).toBeHidden();
  await sidebar.getByRole('button', { name: /.*: grocery$/ }).click();
  await sidebar.getByRole('link', { name: 'flour', exact: true }).click();
  await expect(page).toHaveURL(/\/ru\/catalog\/grocery\/flour$/);
});

test('admin tree and safe parent selection use lineage', async ({ page }) => {
  await page.goto('/admin/categories');
  await page.getByRole('button', { name: 'Редактировать grains', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Редактирование подкатегории' })).toBeVisible();
  await page.getByLabel('Родительская категория', { exact: true }).click();
  await expect(page.getByRole('option', { name: 'food / grocery', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: /food \/ grocery \/ flour/ })).toHaveCount(0);
  await page.getByRole('option', { name: 'food / dairy', exact: true }).click();
  await expect(page.getByLabel('Родительская категория', { exact: true })).toContainText('food / dairy');
  // No save: fixture admin HTTP writes are disabled. Real save validation is covered by API tests.
});

test('admin product selection inherits all three levels without leaking sibling attrs', async ({ page }) => {
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Добавить товар', exact: true }).click();
  await page.getByLabel('Категория *', { exact: true }).click();
  await page.getByRole('option', { name: 'food / grocery / grains', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Новый товар' });
  for (const key of ['group-fixture-attribute', 'category-fixture-attribute', 'sub-fixture-attribute']) {
    await expect(dialog.getByRole('textbox', { name: key, exact: true })).toBeVisible();
  }
  await page.getByLabel('Категория *', { exact: true }).click();
  await page.getByRole('option', { name: 'food / grocery / flour', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'sub-fixture-attribute', exact: true })).toHaveCount(0);
});
