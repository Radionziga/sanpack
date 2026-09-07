import { expect, test } from '@playwright/test';

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
