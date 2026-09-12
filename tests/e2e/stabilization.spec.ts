import { expect, test } from '@playwright/test';

const checkoutItem = {
  productId: 'fixture-grocery', productTitleRu: 'Fixture grocery', productTitleUz: 'Fixture grocery',
  productSlug: 'fixture-grocery', sku: 'FIXTURE-grocery', quantity: 1, unit: 'шт', price: 100,
};

const checkoutDraft = {
  contactName: 'Reload Customer', phone: '+998 90 123 45 67', deliveryAddress: 'Tashkent fixture address',
  deliveryDate: '2026-09-10', deliveryWindow: '09:00-13:00', notes: '',
};

async function seedPendingCheckout(page: import('@playwright/test').Page, pendingName = checkoutDraft.contactName) {
  await page.addInitScript(({ item, draft, name }) => {
    localStorage.setItem('sanpack_request_cart_v1', JSON.stringify([item]));
    sessionStorage.setItem('sanpack_checkout_draft_v1', JSON.stringify(draft));
    sessionStorage.setItem('sanpack_checkout_intent_v2', JSON.stringify({
      key: 'checkout-intent-reload-0001',
      input: {
        contactName: name, phone: draft.phone, deliveryAddress: draft.deliveryAddress,
        deliveryDate: draft.deliveryDate, deliveryWindow: draft.deliveryWindow,
        items: [{ productId: item.productId, quantity: item.quantity }],
      },
    }));
  }, { item: checkoutItem, draft: checkoutDraft, name: pendingName });
}

test.describe('production-like hard entries', () => {
  for (const route of ['/ru', '/ru/catalog', '/ru/search?q=Fixture', '/ru/favorites', '/ru/request', '/ru/profile']) {
    test(`hard GET ${route} renders the real application`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.ok()).toBe(true);
      await expect(page.locator('body')).not.toContainText('Каталог временно недоступен');
      await expect(page.locator('header')).toBeVisible();
    });
  }

  test('raw Product HTML contains visible product identity and offer body', async ({ request }) => {
    const response = await request.get('/ru/product/fixture-grocery');
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain('Fixture grocery');
    expect(html).toMatch(/<h1[^>]*>[^<]*Fixture grocery/);
    expect(html).toContain('application/ld+json');
  });

  test('catalog query survives product navigation and browser Back', async ({ page, isMobile }) => {
    await page.goto('/ru/catalog/grocery?sort=name&view=list&stock=1', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/sort=name/);
    const productLink = page.getByRole('link', { name: /Fixture grocery/i }).first();
    const productHref = await productLink.getAttribute('href');
    expect(productHref).toBe('/ru/product/fixture-grocery');
    if (isMobile) {
      await page.goto(productHref!, { waitUntil: 'domcontentloaded' });
    } else {
      await productLink.click();
    }
    await expect(page).toHaveURL(/\/ru\/product\/fixture-grocery$/);
    await page.goBack();
    await expect(page).toHaveURL(/sort=name/);
    await expect(page).toHaveURL(/view=list/);
    await expect(page).toHaveURL(/stock=1/);
  });

  test('mobile Product does not render the contact FAB over its CTA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ru/product/fixture-grocery', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Fixture grocery', level: 1 }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: /Связаться/ })).toHaveCount(0);
  });

  test('mobile cart dock owns the fixed-action area on Category and checkout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ru/product/fixture-grocery', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'В корзину', exact: true }).click();
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/ru/catalog/grocery', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('link', { name: 'Открыть корзину' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Связаться' })).toHaveCount(0);
    }
    await page.goto('/ru/request', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Связаться' })).toHaveCount(0);
  });

  test('checkout reload retries the exact pending intent without catalog revalidation', async ({ page }) => {
    await seedPendingCheckout(page);
    let submittedBody: unknown;
    let submittedKey = '';
    await page.route('**/api/requests', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      submittedBody = request.postDataJSON();
      submittedKey = request.headers()['idempotency-key'];
      await route.fulfill({ status: 200, json: {
        id: 'existing-order', requestNumber: 'ORD-REPLAY', contactName: checkoutDraft.contactName,
        phone: checkoutDraft.phone, deliveryAddress: checkoutDraft.deliveryAddress,
        deliveryDate: checkoutDraft.deliveryDate, deliveryWindow: checkoutDraft.deliveryWindow,
        status: 'new', currency: 'UZS', subtotal: 100, adjustment: 0, total: 100,
        createdAt: '2026-09-08T00:00:00.000Z', items: [checkoutItem],
      } });
    });
    await page.goto('/ru/request', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Отправить заявку', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Заявка №ORD-REPLAY отправлена' })).toBeVisible();
    expect(submittedKey).toBe('checkout-intent-reload-0001');
    expect(submittedBody).toMatchObject({ contactName: checkoutDraft.contactName, items: [{ productId: 'fixture-grocery', quantity: 1 }] });
  });

  test('checkout does not reuse a pending key for a changed form without explicit recovery', async ({ page }) => {
    await seedPendingCheckout(page, 'Original Customer');
    let submissions = 0;
    await page.route('**/api/requests', (route) => { submissions += 1; return route.abort(); });
    await page.goto('/ru/request', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Отправить заявку', exact: true }).first().click();
    const recoveryAlert = page.getByRole('alert').filter({ hasText: 'Предыдущая отправка не получила однозначного ответа' });
    await expect(recoveryAlert).toBeVisible();
    await expect(page.getByRole('button', { name: 'Повторить прежнюю отправку' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Начать новую заявку' })).toBeVisible();
    expect(submissions).toBe(0);
    await page.getByRole('button', { name: 'Начать новую заявку' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Новая попытка подготовлена' })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('sanpack_checkout_intent_v2'))).toBeNull();
  });

  test('global storefront links resolve to real routes', async ({ page, request }) => {
    await page.goto('/ru', { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('header a[href], footer a[href], nav a[href]').evaluateAll((links) => (
      [...new Set(links.map((link) => link.getAttribute('href')).filter((href): href is string => Boolean(href && href.startsWith('/'))))]
    ));
    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), href).toBeLessThan(400);
    }
  });

  test('locale switch preserves search query', async ({ page }) => {
    await page.goto('/ru/search?q=Fixture&sort=name', { waitUntil: 'load' });
    await page.getByRole('button', { name: /Выбрать язык/ }).filter({ visible: true }).first().click();
    await page.getByRole('menuitemradio', { name: /English/ }).filter({ visible: true }).click();
    await expect.poll(() => page.url()).toContain('/en/search');
    expect(new URL(page.url()).searchParams.get('q')).toBe('Fixture');
    expect(new URL(page.url()).searchParams.get('sort')).toBe('name');
  });

  test('favorites API failure is recoverable and is not shown as an empty list', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('sanpack_favorites_v1', JSON.stringify(['fixture-grocery'])));
    await page.route('**/api/catalog?resource=products', (route) => route.fulfill({ status: 503, json: { error: 'fixture' } }));
    await page.goto('/ru/favorites', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('alert').filter({ hasText: 'Не удалось загрузить избранное' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible();
  });

  test('Product price follows the canonical wholesale tier at selected quantity', async ({ page, isMobile }) => {
    await page.goto('/ru/product/fixture-wholesale', { waitUntil: 'load' });
    if (isMobile) {
      await page.getByRole('button', { name: 'В корзину', exact: true }).click();
      const quantity = page.getByRole('spinbutton', { name: /Количество: Оптовый fixture/ }).first();
      await quantity.fill('10');
      await quantity.blur();
      await expect(quantity).toHaveValue('10');
      const commercialDock = page.locator('div.fixed').filter({ hasText: 'Итого: 800 сум' });
      await expect(commercialDock).toContainText('80 сум / штука');
    } else {
      const quantity = page.getByRole('spinbutton', { name: /Количество/i }).first();
      await quantity.fill('10');
      await quantity.blur();
      await expect(page.getByRole('main').first()).toContainText('800 сум');
    }
  });

  test('Product editor keeps key-by-key typing focus, allows section links, restores focus and confirms dirty close', async ({ page }) => {
    await page.goto('/admin/products');
    const trigger = page.getByRole('button', { name: 'Добавить товар', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Новый товар' });
    const close = dialog.getByRole('button', { name: 'Закрыть редактор' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    const title = dialog.getByLabel('Название (RU) *');
    await title.focus();
    for (const key of ['KeyA', 'KeyB', 'KeyC']) await page.keyboard.press(key);
    await expect(title).toHaveValue('abc');
    await expect(title).toBeFocused();

    let discardPrompts = 0;
    page.on('dialog', async (nativeDialog) => {
      discardPrompts += 1;
      await nativeDialog.dismiss();
    });
    await dialog.getByRole('link', { name: 'SEO', exact: true }).click();
    await expect(page).toHaveURL(/#product-seo$/);
    expect(discardPrompts).toBe(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    expect(discardPrompts).toBe(1);
    page.removeAllListeners('dialog');
    page.once('dialog', (nativeDialog) => nativeDialog.accept());
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('Attribute editor initial focus does not restart while typing', async ({ page }) => {
    await page.goto('/admin/attributes');
    const trigger = page.getByRole('button', { name: 'Создать атрибут' }).first();
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Новая характеристика' });
    const close = dialog.getByRole('button', { name: 'Закрыть' });
    await expect(close).toBeFocused();
    const title = dialog.getByLabel('Название RU').first();
    await title.focus();
    for (const key of ['KeyA', 'KeyB', 'KeyC']) await page.keyboard.press(key);
    await expect(title).toHaveValue('abc');
    await expect(title).toBeFocused();
  });

  test('direct Admin URLs render capability denial instead of editable controls', async ({ context, page }) => {
    await context.addCookies([{
      name: 'fixture_admin_role', value: 'sales_manager',
      domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax',
    }]);
    await page.goto('/admin/products');
    await expect(page.getByRole('heading', { name: 'Раздел недоступен' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Добавить товар', exact: true })).toHaveCount(0);
  });

  test('denied Admin route recovers through allowed navigation and browser history', async ({ context, page }) => {
    await context.addCookies([{
      name: 'fixture_admin_role', value: 'content_manager',
      domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax',
    }]);
    const resourceReads: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/admin/data')) resourceReads.push(request.url());
    });
    await page.goto('/admin/settings');
    const denied = page.getByRole('heading', { name: 'Раздел недоступен' });
    const addProduct = page.getByRole('button', { name: 'Добавить товар', exact: true });
    await expect(denied).toBeVisible();
    await expect(page.locator('#admin-content input, #admin-content button')).toHaveCount(0);
    expect(resourceReads).toEqual([]);

    await page.getByRole('link', { name: 'Товары', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(addProduct).toBeVisible();
    await expect(denied).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/settings$/);
    await expect(denied).toBeVisible();
    await expect(addProduct).toHaveCount(0);
    await expect(page.locator('#admin-content input, #admin-content button')).toHaveCount(0);
    expect(resourceReads.some((url) => url.includes('resource=settings'))).toBe(false);

    await page.goForward();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(addProduct).toBeVisible();
    await expect(denied).toHaveCount(0);
  });

  test('owner navigation remains available across Admin routes and Back', async ({ page }) => {
    await page.goto('/admin/products');
    await page.getByRole('link', { name: 'Категории', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/categories$/);
    await expect(page.getByRole('heading', { name: 'Категории каталога', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Добавить товар', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Раздел недоступен' })).toHaveCount(0);
  });
});
