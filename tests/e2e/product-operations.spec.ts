import { expect, test } from '@playwright/test';

test.describe('Product Operations workspace', () => {
  test('search, URL state, readiness, Quick Edit and bulk preview remain operational', async ({ page }) => {
    await page.goto('/admin/products');
    const search = page.getByPlaceholder('Название, SKU, SKU варианта или бренд…');
    await search.fill('Fixture grocery');
    await expect(page).toHaveURL(/q=Fixture(?:\+|%20)grocery/);
    await expect(page.getByRole('button', { name: 'Fixture grocery', exact: true })).toBeVisible();
    await expect(page.getByText(/Показано 1 из/)).toBeVisible();

    const quickEdit = page.getByRole('button', { name: 'Быстро изменить Fixture grocery', exact: true });
    await quickEdit.click();
    const drawer = page.getByRole('dialog', { name: 'Быстро изменить Fixture grocery' });
    await expect(drawer.getByRole('heading', { name: 'Быстро изменить' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Изменить цену в Price Manager' })).toHaveAttribute('href', '/admin/prices');
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(quickEdit).toBeFocused();

    await page.getByRole('checkbox', { name: 'Выбрать Fixture grocery' }).check();
    await expect(page.getByText('Выбрано: 1')).toBeVisible();
    await page.getByRole('button', { name: 'Изменить категорию' }).click();
    const bulk = page.getByRole('dialog', { name: 'Подтверждение массовой операции' });
    await expect(bulk).toContainText('Операция выполняется целиком');
    await expect(bulk.getByRole('button', { name: 'Применить' })).toBeDisabled();
    await bulk.getByRole('button', { name: 'Отмена' }).click();
  });

  test('new Product offers scratch and copy flows without exposing technical IDs', async ({ page }) => {
    await page.goto('/admin/products');
    await page.getByRole('button', { name: 'Добавить товар', exact: true }).click();
    const chooser = page.getByRole('dialog', { name: 'Новый товар' });
    await expect(chooser.getByRole('button', { name: 'Создать с нуля' })).toBeVisible();
    await chooser.getByPlaceholder('Название, SKU, SKU варианта или категория…').fill('FIXTURE-grocery');
    await chooser.getByRole('button', { name: /Fixture grocery/ }).click();
    const confirmation = page.getByRole('dialog', { name: 'Создать копию товара' });
    await expect(confirmation).toContainText('SKU товара и вариантов необходимо указать заново');
    await expect(confirmation).not.toContainText(/productId|categoryId|Firestore/i);
    await confirmation.getByRole('button', { name: 'Отмена' }).click();
  });

  test('compact filters and responsive table keep core controls reachable', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page.getByRole('button', { name: 'Опубликованные', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Требуют внимания', exact: true }).click();
    await expect(page).toHaveURL(/attention=1/);
    await expect(page.getByLabel('Фильтр по режиму цены')).toBeVisible();
    await expect(page.getByLabel('Фильтр по вариантам')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Массово изменить цены' })).toHaveAttribute('href', '/admin/prices');
  });
});
