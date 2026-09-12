import { expect, test } from '@playwright/test';

const pricedProduct = {
  id: 'fixture-grocery', slug: 'fixture-grocery', sku: 'FIXTURE-grocery', status: 'published',
  categoryId: 'grocery', categorySlug: 'grocery', titleRu: 'Fixture grocery', titleUz: 'Fixture grocery',
  titleEn: 'Fixture grocery', titleZh: 'Fixture grocery', descriptionRu: '', descriptionUz: '',
  images: [], mainImage: '', attributes: {}, variants: [], price: 100, currency: 'UZS', showPrice: true,
  stockStatus: 'in_stock', minimumOrder: 1, salesUnit: 'шт', featured: false, newProduct: false,
  ownProduction: false, sortOrder: 0, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

const requestProduct = { ...pricedProduct, id: 'fixture-request-price', slug: 'fixture-request-price', sku: 'FIXTURE-REQUEST', titleRu: 'Цена по запросу fixture', showPrice: false, price: undefined, priceMode: 'request' };

async function seedMixedCart(page: import('@playwright/test').Page) {
  await page.addInitScript(({ priced, request }) => {
    localStorage.setItem('sanpack_request_cart_v1', JSON.stringify([
      { productId: priced.id, productTitleRu: priced.titleRu, productSlug: priced.slug, sku: priced.sku, quantity: 2, unit: 'шт', price: 100, priceMode: 'sale', product: priced },
      { productId: request.id, productTitleRu: request.titleRu, productSlug: request.slug, sku: request.sku, quantity: 1, unit: 'шт', priceMode: 'request', product: request },
    ]));
  }, { priced: pricedProduct, request: requestProduct });
}

test.describe('commercial UX phase 1', () => {
  test('Telegram viewport variables applied before hydration do not produce a root mismatch warning', async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('hydrated but some attributes')) {
        hydrationErrors.push(message.text());
      }
    });
    await page.route('https://telegram.org/js/telegram-web-app.js', (route) => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "document.documentElement.style.setProperty('--tg-viewport-height','100vh');document.documentElement.style.setProperty('--tg-viewport-stable-height','100vh');window.Telegram={WebApp:{initData:'',ready(){},expand(){}}};",
    }));

    await page.goto('/ru', { waitUntil: 'networkidle' });
    await expect(page.locator('header')).toBeVisible();
    expect(await page.locator('html').evaluate((element) => (
      element.style.getPropertyValue('--tg-viewport-height')
    ))).toBe('100vh');
    expect(hydrationErrors).toEqual([]);
  });
  test('mixed request summary separates priced and request-price lines without a zero total', async ({ page, isMobile }) => {
    await seedMixedCart(page);
    await page.goto('/ru/request', { waitUntil: 'domcontentloaded' });
    const form = page.locator('#request-checkout-form');
    await expect(form.getByRole('heading', { name: /Состав заявки/ })).toBeVisible();
    await expect(form).toContainText('Сумма позиций с ценой');
    await expect(form).toContainText('200\u00a0сум');
    await expect(form).toContainText('+ 1 позиция — цена по запросу');
    await expect(form).toContainText('Менеджер подтвердит итоговую стоимость, наличие и доставку');
    await expect(form.getByText(/^0\u00a0сум$/)).toHaveCount(0);

    const composition = form.getByRole('heading', { name: /Состав заявки/ });
    const contact = form.getByRole('heading', { name: 'Контактные данные' });
    if (isMobile) expect((await composition.boundingBox())?.y).toBeLessThan((await contact.boundingBox())?.y ?? 0);
  });

  test('desktop sticky contact panel remains below the complete sticky header', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop two-column checkout only');
    await page.setViewportSize({ width: 1280, height: 720 });
    await seedMixedCart(page);
    await page.goto('/ru/request', { waitUntil: 'networkidle' });
    const header = page.locator('header').first();
    const contactPanel = page.locator('#request-checkout-form > aside');
    const initialPanelBox = await contactPanel.boundingBox();
    expect(initialPanelBox).not.toBeNull();
    await page.evaluate((initialTop) => window.scrollTo(0, Math.max(0, initialTop - 80)), initialPanelBox!.y);
    await expect.poll(async () => (await contactPanel.boundingBox())?.y ?? -1).toBeGreaterThan(100);
    const headerBox = await header.boundingBox();
    const panelBox = await contactPanel.boundingBox();
    expect(panelBox?.y ?? 0).toBeGreaterThanOrEqual((headerBox?.y ?? 0) + (headerBox?.height ?? 0) + 4);
  });

  test('package minimum, manual quantity, step normalization, and wholesale amount stay coherent', async ({ page, isMobile }) => {
    await page.goto('/ru/product/fixture-packaged', { waitUntil: 'networkidle' });
    const variant = page.getByRole('button', { name: /800 мл/ }).filter({ visible: true });
    await expect(variant).toBeVisible();
    await variant.click();
    await expect(variant).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('1\u00a0коробка = 1\u00a0000\u00a0штук').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Минимум 1\u00a0коробка · 1\u00a0100\u00a0000\u00a0сум').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('От 10\u00a0коробок — 980\u00a0сум / шт').filter({ visible: true }).first()).toBeVisible();
    if (isMobile) await page.getByRole('button', { name: 'В корзину', exact: true }).click();
    const quantity = page.getByRole('spinbutton', { name: /Количество: Коробочный fixture — 800 мл/ }).first();
    await quantity.fill('1050');
    await quantity.blur();
    await expect(quantity).toHaveValue('2000');
  });

  test('exact variant SKU search identifies the matching configuration', async ({ page }) => {
    await page.goto('/ru/search?q=SP-FP-005-800', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Коробочный fixture' }).first()).toBeVisible();
    await expect(page.getByText('800 мл · SP-FP-005-800').first()).toBeVisible();
  });

  test('Mini App hides misleading logout while normal browser keeps it', async ({ page, context }) => {
    const browserPage = await context.newPage();
    await browserPage.route('**/api/auth/customer', (route) => route.fulfill({ status: 200, json: { authenticated: true, customer: { name: 'Fixture User', phone: '+998 90 123 45 67', company: '', address: '', inn: '' } } }));
    await browserPage.goto('/ru/profile', { waitUntil: 'networkidle' });
    await expect(browserPage.getByRole('button', { name: 'Выйти' })).toBeVisible();
    await browserPage.close();

    await page.route('https://telegram.org/js/telegram-web-app.js', (route) => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.Telegram={WebApp:{initData:'fixture-proof',ready(){},expand(){},BackButton:{show(){},hide(){},onClick(){},offClick(){}}}};",
    }));
    await page.route('**/api/auth/telegram/mini-app', (route) => route.fulfill({ status: 200, json: { authenticated: true } }));
    await page.route('**/api/auth/customer', (route) => route.fulfill({ status: 200, json: { authenticated: true, customer: { name: 'Fixture User', phone: '+998 90 123 45 67', company: '', address: '', inn: '' } } }));
    await page.goto('/ru/profile', { waitUntil: 'networkidle' });
    await expect(page.getByText(/аккаунт определяется текущим профилем Telegram/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Выйти' })).toHaveCount(0);
  });

  test('narrow mobile layout keeps commercial meaning and controls inside the viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'narrow storefront layout is mobile-only');
    await seedMixedCart(page);
    await page.goto('/ru/catalog/grocery', { waitUntil: 'domcontentloaded' });
    const dock = page.getByRole('link', { name: 'Открыть корзину' });
    await expect(dock).toContainText('Сумма позиций с ценой');
    await expect(dock).toContainText('1 позиция — цена по запросу');
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 700 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });

  test('mobile bottom navigation acknowledges a slow route transition immediately', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile bottom navigation only');
    await page.goto('/ru', { waitUntil: 'networkidle' });
    const navigationBar = page.locator('.mobile-bottom-navigation');
    await expect(navigationBar).toBeVisible();
    // Open/close a client-only panel first so this assertion cannot pass against
    // an SSR link before React has attached the navigation handlers.
    await navigationBar.getByRole('button', { name: 'Поиск', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(navigationBar).toBeVisible();
    const catalogLink = navigationBar.locator('[data-mobile-destination="catalog"]');
    await catalogLink.evaluate((link) => {
      link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    });
    await catalogLink.click();
    await expect(catalogLink.getByTestId('mobile-nav-pending')).toBeVisible();
    await catalogLink.click();
    await expect(page).toHaveURL(/\/ru\/catalog/);
  });
});
