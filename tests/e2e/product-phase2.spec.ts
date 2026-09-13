import { expect, test } from '@playwright/test';

test.describe('Product UX Phase 2', () => {
  test('catalog renders a bounded result set and preserves the expanded page in the URL', async ({ page }) => {
    await page.goto('/ru/catalog');
    const cards = page.locator('main article');
    await expect(cards).toHaveCount(24);
    await expect(page.getByText(/Показано 24 из \d+/)).toBeVisible();
    const firstCardTop = await cards.first().evaluate((node) => node.getBoundingClientRect().top + window.scrollY);
    expect(firstCardTop).toBeLessThan(800);

    await page.getByRole('button', { name: 'Показать ещё' }).click();
    await expect(cards).toHaveCount(48);
    await expect(page).toHaveURL(/(?:\?|&)page=2(?:&|$)/);
    await page.reload();
    await expect(cards).toHaveCount(48);
  });

  test('search query and matched variant survive Product navigation and Back', async ({ page }) => {
    await page.goto('/ru/search?q=SP-FP-005-800');
    await expect(page.getByText('800 мл · SP-FP-005-800')).toBeVisible();
    const productLink = page.locator('main article a[href*="/product/fixture-packaged"]').first();
    await expect(productLink).toHaveAttribute('href', /variant=fixture-packaged-800/);
    await productLink.click();
    await expect(page).toHaveURL(/\/ru\/product\/fixture-packaged\?variant=fixture-packaged-800/);
    await expect(page.getByRole('button', { name: /800 мл/ }).first()).toHaveAttribute('aria-pressed', 'true');
    await page.goBack();
    await expect(page).toHaveURL(/\/ru\/search\?q=SP-FP-005-800/);
    await expect(page.getByText('800 мл · SP-FP-005-800')).toBeVisible();
  });

  test('search restores a useful result scroll position after Product and Back', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto('/ru/search?q=fixture');
    const links = page.locator('main article a[href*="/product/"]');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(3);
    await links.last().scrollIntoViewIfNeeded();
    const rememberedScroll = await page.evaluate(() => window.scrollY);
    expect(rememberedScroll).toBeGreaterThan(100);
    const destination = await links.last().getAttribute('href');
    expect(destination).toMatch(/^\/ru\/product\//);
    await links.last().click();
    await expect(page).toHaveURL(new RegExp(destination!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await page.goBack();
    await expect(page).toHaveURL(/\/ru\/search\?q=fixture/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  });

  test('search distinguishes loading failure, retry and an empty result', async ({ page }) => {
    let productAttempts = 0;
    await page.route('**/api/catalog?resource=products', async (route) => {
      productAttempts += 1;
      if (productAttempts === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'fixture unavailable' }) });
        return;
      }
      await route.continue();
    });
    await page.goto('/ru/search?q=fixture');
    await expect(page.getByRole('alert').getByRole('heading', { name: 'Не удалось загрузить поиск' })).toBeVisible();
    await page.getByRole('button', { name: 'Повторить' }).click();
    await expect(page.getByText(/Показано \d+ из \d+/)).toBeVisible();
    await page.goto('/ru/search?q=definitely-no-such-product');
    await expect(page.getByRole('heading', { name: 'Подходящих товаров нет' })).toBeVisible();
  });

  test('history repeat reviews current terms and merges into the existing cart without submitting', async ({ page }) => {
    let requestWrites = 0;
    await page.addInitScript(() => {
      localStorage.setItem('sanpack_request_cart_v1', JSON.stringify([{
        productId: 'fixture-grocery', productTitleRu: 'Fixture grocery', productSlug: 'fixture-grocery',
        sku: 'FIXTURE-grocery', quantity: 1, unit: 'шт', price: 100,
      }]));
    });
    await page.route('**/api/auth/customer', (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({
        authenticated: true, customer: { name: 'Repeat Fixture', phone: '+998901234567' },
      }),
    }));
    await page.route('**/api/requests', async (route) => {
      if (route.request().method() !== 'GET') {
        requestWrites += 1;
        await route.abort();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'history-1', requestNumber: 'REQ-HISTORY-1', contactName: 'Repeat Fixture', phone: '+998901234567',
          deliveryAddress: '', deliveryDate: '', deliveryWindow: '', notes: '', status: 'new', currency: 'UZS',
          subtotal: 80, adjustment: 0, total: 80, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z',
          items: [
            { lineId: 'line-current', productId: 'fixture-grocery', productTitleRu: 'Fixture grocery', productSlug: 'fixture-grocery', sku: 'FIXTURE-grocery', quantity: 1, unit: 'шт', price: 80 },
            { lineId: 'line-removed', productId: 'fixture-packaged', variantId: 'removed-variant', productTitleRu: 'Коробочный fixture', productSlug: 'fixture-packaged', sku: 'REMOVED', quantity: 1000, unit: 'шт', price: 1100 },
            { lineId: 'line-hidden', productId: 'missing-product', productTitleRu: 'Скрытый товар', productSlug: 'missing-product', sku: 'MISSING', quantity: 1, unit: 'шт', price: 5 },
          ],
        }]),
      });
    });

    await page.goto('/ru/orders');
    await page.getByRole('button', { name: 'Повторить состав' }).click();
    await expect(page.getByText(/Цена изменилась: 80.*100/)).toBeVisible();
    await expect(page.getByText('Этот вариант больше недоступен. Выберите новый вариант.')).toBeVisible();
    await expect(page.getByText('Товар больше недоступен.')).toBeVisible();
    await page.getByRole('button', { name: 'Добавить актуальный состав в корзину' }).click();
    await expect(page.getByText('Состав добавлен в корзину.')).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('sanpack_request_cart_v1') || '[]') as Array<{ productId: string; quantity: number }>;
      return items.find((item) => item.productId === 'fixture-grocery')?.quantity;
    })).toBe(2);
    expect(requestWrites).toBe(0);
  });

  for (const width of [320, 390]) {
    test(`catalog and repeat controls fit a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      await page.goto('/ru/catalog');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      await expect(page.getByRole('button', { name: 'Показать ещё' })).toBeVisible();
    });
  }
});
