import { expect, test, type Page } from '@playwright/test';

const batchId = '12345678-1234-1234-1234-123456789012';
const changedRow: {
  sku: string; productTitle: string; variantTitle: string; before: number | null; current: number | null;
  after: number | null; delta: number | null; deltaPercent: number | null; status: string; message: string;
} = {
  sku: 'SP-PRICE-001', productTitle: 'Тестовый товар', variantTitle: '', before: 100_000,
  current: 100_000, after: 150_000, delta: 50_000, deltaPercent: 0.5,
  status: 'warning', message: 'Цена изменилась более чем на 30%. Проверьте значение перед применением.',
};
const batch = {
  batchId, createdAt: '2026-09-20T08:00:00.000Z', actorLabel: 'Fixture Admin',
  originalFilename: 'SANPACK_prices_2026-09-20.xlsx', status: 'ready',
  summary: { changes: 1, unchanged: 237, warnings: 1, conflicts: 0, errors: 0 },
  changedProductCount: 1, changedRowCount: 1, warningCount: 1, rows: [changedRow],
};
const history = [{
  batchId, createdAt: batch.createdAt, appliedAt: '2026-09-20T08:05:00.000Z', actorLabel: 'Fixture Admin',
  changedProductCount: 1, changedRowCount: 1, warningCount: 1, status: 'applied',
  originalFilename: batch.originalFilename,
}];

async function fixtureRoutes(page: Page, preview = batch) {
  const mutations: unknown[] = [];
  await page.route('**/api/admin/prices**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/export')) {
      return route.fulfill({
        status: 200, body: Buffer.from('fixture-xlsx'),
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': 'attachment; filename="SANPACK_prices_fixture.xlsx"',
        },
      });
    }
    if (url.pathname.endsWith('/import')) return route.fulfill({ status: 200, json: preview });
    if (url.pathname === '/api/admin/prices') return route.fulfill({ status: 200, json: { history } });
    if (url.searchParams.get('rollback') === 'preview') {
      return route.fulfill({ status: 200, json: { batch: { ...batch, status: 'applied' }, conflictCount: 0, rows: [{ ...changedRow, current: 150_000, conflict: false }] } });
    }
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      mutations.push(body);
      return route.fulfill({ status: 200, json: body.action === 'rollback'
        ? { ...batch, status: 'rolled_back' }
        : { ...batch, status: 'applied', idempotent: false } });
    }
    return route.fulfill({ status: 200, json: { ...batch, status: 'applied' } });
  });
  return mutations;
}

test.describe('Admin Excel price manager', () => {
  test('supports download, guarded preview, explicit apply, history and rollback preview', async ({ page }, testInfo) => {
    const mutations = await fixtureRoutes(page);
    await page.goto('/admin/prices');
    await expect(page.getByRole('heading', { name: 'Цены', exact: true })).toBeVisible();
    await expect(page.getByText('Загрузка только проверяет файл')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать Excel' }).click();
    expect((await download).suggestedFilename()).toBe('SANPACK_prices_fixture.xlsx');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'SANPACK_prices.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('fixture'),
    });
    await expect(page.getByRole('heading', { name: 'Проверка изменений' })).toBeVisible();
    await expect(page.getByText('150 000 сум')).toBeVisible();
    const apply = page.getByRole('button', { name: 'Применить 1 изменение' });
    await expect(apply).toBeDisabled();
    if (process.env.SANPACK_PRICE_UI_SCREENSHOT) {
      await page.screenshot({ path: `${process.env.SANPACK_PRICE_UI_SCREENSHOT}-${testInfo.project.name}.png`, fullPage: true });
    }
    await page.getByRole('checkbox', { name: /Я проверил необычно большие изменения/ }).check();
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(page.getByText('Применено к каталогу: 1 цена.')).toBeVisible();
    expect(mutations).toContainEqual({ action: 'apply', warningsConfirmed: true });

    await page.getByRole('button', { name: 'Отменить' }).first().click();
    await expect(page.getByRole('heading', { name: 'Отменить обновление цен' })).toBeVisible();
    await expect(page.getByText('Будет восстановлено: 1 цена.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Подтвердить откат' })).toBeEnabled();
    await expect(page.locator('body')).not.toContainText('productId');
    await expect(page.locator('body')).not.toContainText('schemaVersion');
  });

  test('presents a no-change upload as a successful non-write state', async ({ page }) => {
    await fixtureRoutes(page, {
      ...batch, status: 'ready', rows: [], warningCount: 0,
      summary: { changes: 0, unchanged: 238, warnings: 0, conflicts: 0, errors: 0 },
      changedProductCount: 0, changedRowCount: 0,
    });
    await page.goto('/admin/prices');
    await page.locator('input[type="file"]').setInputFiles({ name: 'unchanged.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('fixture') });
    await expect(page.getByText('Изменений цен не найдено. Каталог не изменён.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Применить 0 изменений' })).toBeDisabled();
  });

  test('shows a stale-price conflict and keeps apply unavailable', async ({ page }) => {
    await fixtureRoutes(page, {
      ...batch, status: 'invalid', warningCount: 0,
      summary: { changes: 0, unchanged: 237, warnings: 0, conflicts: 1, errors: 0 },
      changedProductCount: 0, changedRowCount: 0,
      rows: [{
        ...changedRow, before: 100_000, current: 110_000, after: 105_000,
        delta: null, deltaPercent: null, status: 'conflict',
        message: 'Цена в SANPACK изменилась после экспорта. Скачайте свежий Excel.',
      }],
    });
    await page.goto('/admin/prices');
    await page.locator('input[type="file"]').setInputFiles({ name: 'stale.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('fixture') });
    await expect(page.getByRole('alert').filter({ hasText: 'Excel проверен' })).toContainText('применить его нельзя');
    await expect(page.getByText('Конфликт', { exact: true })).toBeVisible();
    await expect(page.getByText('110 000 сум')).toBeVisible();
    await expect(page.getByRole('button', { name: /Применить/ })).toHaveCount(0);
  });

  test('keeps the workflow usable in a narrow Admin viewport and hides it from other roles', async ({ context, page }) => {
    await fixtureRoutes(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/prices');
    await expect(page.getByText('Перетащите .xlsx или выберите файл')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Скачать Excel' })).toBeVisible();

    await context.addCookies([{ name: 'fixture_admin_role', value: 'content_manager', domain: '127.0.0.1', path: '/' }]);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Раздел недоступен' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Скачать Excel' })).toHaveCount(0);
  });
});
