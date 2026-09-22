import { expect, test } from '@playwright/test';

test('localized Home has one meaningful server-rendered H1', async ({ page }) => {
  const response = await page.goto('/ru', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText(/SANPACK.*HoReCa/i);
});

test('static content routes have their own canonical localized metadata', async ({ page }) => {
  const response = await page.goto('/en/about');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/About us/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/about$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute('href', /\/ru\/about$/);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /\/en\/about$/);
});

test('product metadata and JSON-LD use the canonical offer page', async ({ page, request }) => {
  const products = await (await request.get('/api/catalog?resource=products')).json() as Array<{ slug: string }>;
  const product = products[0];
  expect(product).toBeTruthy();
  const response = await page.goto(`/ru/product/${product.slug}`, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/ru/product/${product.slug}$`));
  const structured = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent || '{}')));
  expect(structured.some((item) => item['@type'] === 'Product')).toBe(true);
  expect(structured.some((item) => item['@type'] === 'BreadcrumbList')).toBe(true);
});

test('nested subcategory metadata follows its real lineage when available', async ({ page, request }) => {
  const categories = await (await request.get('/api/catalog?resource=categories')).json() as Array<{ id: string; parentId?: string; slug: string }>;
  const byId = new Map(categories.map((category) => [category.id, category]));
  const subcategory = categories.find((category) => category.parentId && byId.get(category.parentId)?.parentId);
  test.skip(!subcategory, 'Current fixture has no Subcategory document.');
  const parent = byId.get(subcategory!.parentId!);
  const path = `/ru/catalog/${parent!.slug}/${subcategory!.slug}`;
  expect((await page.goto(path))?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
});

test('legacy flat subcategories redirect once and missing categories return a real 404', async ({ request }) => {
  const categories = await (await request.get('/api/catalog?resource=categories')).json() as Array<{ id: string; parentId?: string; slug: string }>;
  const byId = new Map(categories.map((category) => [category.id, category]));
  const subcategory = categories.find((category) => category.parentId && byId.get(category.parentId)?.parentId);
  test.skip(!subcategory, 'Current fixture has no Subcategory document.');
  const parent = byId.get(subcategory!.parentId!);

  const legacy = await request.get(`/ru/catalog/${subcategory!.slug}`, { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toBe(`/ru/catalog/${parent!.slug}/${subcategory!.slug}`);

  const missing = await request.get('/ru/catalog/__seo-missing-category__', { maxRedirects: 0 });
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('noindex');
});

test('query variants keep a clean canonical and absolute locale alternates', async ({ page, request }) => {
  const products = await (await request.get('/api/catalog?resource=products')).json() as Array<{ slug: string; variants?: Array<{ id: string }> }>;
  const product = products.find((candidate) => candidate.variants?.length) || products[0];
  expect(product).toBeTruthy();
  const variant = product.variants?.[0]?.id || 'representative';
  const path = `/ru/product/${product.slug}`;
  const response = await page.goto(`${path}?variant=${encodeURIComponent(variant)}&utm_source=seo-test`, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', new RegExp(`${path}$`));
});

test('known retired taxonomy URLs redirect directly to their current public replacements', async ({ request }) => {
  const branding = await request.get('/ru/catalog/branding-polygraphy', { maxRedirects: 0 });
  expect(branding.status()).toBe(308);
  expect(branding.headers().location).toBe('/ru/branding');

  const greens = await request.get('/uz/catalog/svezhaya-zelen-novagreen', { maxRedirects: 0 });
  expect(greens.status()).toBe(308);
  expect(greens.headers().location).toBe('/uz/catalog/ovoshchi-frukty-zelen/svezhaya-zelen');

  const home = await (await request.get('/ru')).text();
  expect(home).not.toContain('href="/ru/catalog/svezhaya-zelen-novagreen"');
  expect(home).toContain('href="/ru/catalog/ovoshchi-frukty-zelen/svezhaya-zelen"');
});
