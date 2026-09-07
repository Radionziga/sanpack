import { expect, test } from '@playwright/test';

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
    await page.goto('/ru/product/fixture-grocery', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Fixture grocery', level: 1 }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: /Связаться/ })).toHaveCount(0);
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
    await page.goto('/ru/search?q=Fixture&sort=name', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Выбрать язык/ }).click();
    await page.getByRole('menuitemradio', { name: /English/ }).click();
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
    await page.goto('/ru/product/fixture-wholesale', { waitUntil: 'domcontentloaded' });
    if (isMobile) {
      await page.getByRole('button', { name: 'В корзину', exact: true }).click();
      const cartControl = page.getByRole('group', { name: 'Оптовый fixture' });
      const increase = cartControl.getByRole('button', { name: 'Увеличить количество' });
      for (let step = 1; step < 10; step += 1) await increase.click();
      await expect(cartControl).toContainText('10');
      await expect(page.locator('div.fixed').filter({ hasText: 'Цена за штуку' })).toContainText('80 сум');
    } else {
      const quantity = page.getByRole('spinbutton', { name: /Количество/i }).first();
      await quantity.fill('10');
      await quantity.blur();
      await expect(page.getByRole('main').first()).toContainText('800 сум');
    }
  });

  test('Product editor traps focus, restores focus and confirms dirty close', async ({ page }) => {
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
    await dialog.getByLabel('Название (RU) *').fill('Несохранённый товар');
    page.once('dialog', (nativeDialog) => nativeDialog.dismiss());
    await close.click();
    await expect(dialog).toBeVisible();
    page.once('dialog', (nativeDialog) => nativeDialog.accept());
    await close.click();
    await expect(dialog).toHaveCount(0);
  });
});
