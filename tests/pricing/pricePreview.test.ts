import { describe, expect, it } from 'vitest';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import { buildPricePreview } from '@/lib/pricing/pricePreview';
import { catalogPriceDigest, manifestRows, priceManifestRowDigest } from '@/lib/pricing/priceRows';
import type { ParsedPriceWorkbookRow, PriceExportManifest, PriceWorkbookRow } from '@/lib/pricing/priceManagerTypes';

const product = createProduct({
  id: 'product-1234567890', sku: 'P-1', titleRu: 'Канонический товар', price: 100_000, priceMode: 'fixed',
  variants: [
    createVariant({ id: 'variant-explicit', sku: 'V-1', titleRu: 'Явный', price: 120_000 }),
    createVariant({ id: 'variant-inherited', sku: 'V-2', titleRu: 'Наследуемый', price: undefined }),
  ],
});

const baseRows: PriceWorkbookRow[] = [
  { rowId: `product:${product.id}`, productId: product.id, priceOwner: 'product', editable: true, exportedPrice: 100_000, group: '', category: '', subcategory: '', sku: 'P-1', productTitle: 'Канонический товар', variantTitle: '', priceLevel: 'Товар', salesUnit: 'шт', priceMode: 'Фиксированная', priceSource: 'Цена товара', currentPrice: 100_000 },
  { rowId: `variant:${product.id}:variant-explicit`, productId: product.id, variantId: 'variant-explicit', priceOwner: 'variant', editable: true, exportedPrice: 120_000, group: '', category: '', subcategory: '', sku: 'V-1', productTitle: 'Канонический товар', variantTitle: 'Явный', priceLevel: 'Вариант', salesUnit: 'шт', priceMode: 'Фиксированная', priceSource: 'Цена варианта', currentPrice: 120_000 },
  { rowId: `variant:${product.id}:variant-inherited`, productId: product.id, variantId: 'variant-inherited', priceOwner: 'inherited', editable: false, exportedPrice: null, group: '', category: '', subcategory: '', sku: 'V-2', productTitle: 'Канонический товар', variantTitle: 'Наследуемый', priceLevel: 'Вариант', salesUnit: 'шт', priceMode: 'Фиксированная', priceSource: 'Цена товара', currentPrice: 100_000 },
];

const manifestRowsValue = manifestRows(baseRows);
const manifest: PriceExportManifest = {
  exportId: '12345678-1234-1234-1234-123456789012', schemaVersion: 1,
  createdAt: '2026-09-20T00:00:00.000Z', expiresAt: new Date('2026-12-20T00:00:00.000Z'),
  actor: { uid: 'admin', email: 'admin@example.com', name: 'Admin' },
  catalogDigest: catalogPriceDigest(manifestRowsValue), rowCount: manifestRowsValue.length, rows: manifestRowsValue,
};

function parsed(overrides: Partial<ParsedPriceWorkbookRow>[] = []): ParsedPriceWorkbookRow[] {
  return manifest.rows.map((row, index) => ({
    ...row, digest: '', newPrice: row.editable ? row.exportedPrice : null,
    ...overrides[index],
  }));
}

function preview(rows = parsed(), products = [product], digest = manifest.catalogDigest) {
  return buildPricePreview({ parsedRows: rows, manifest, products, workbookCatalogDigest: digest });
}

describe('price import preview', () => {
  it('returns the normal unchanged state without writes', () => {
    expect(preview().summary).toEqual({ changes: 0, unchanged: 3, warnings: 0, conflicts: 0, errors: 0 });
  });

  it('detects product and explicit variant changes and warns above 30%', () => {
    const result = preview(parsed([{ newPrice: 110_000 }, { newPrice: 180_000 }]));
    expect(result.rows[0]).toMatchObject({ status: 'change', before: 100_000, after: 110_000, delta: 10_000 });
    expect(result.rows[1]).toMatchObject({ status: 'warning', before: 120_000, after: 180_000 });
    expect(result.summary).toMatchObject({ changes: 2, warnings: 1, errors: 0, conflicts: 0 });
  });

  it.each([
    ['zero', 0], ['negative', -1], ['fraction', 100.5], ['unsafe integer', Number.MAX_SAFE_INTEGER + 1],
  ])('rejects %s prices', (_label, value) => {
    expect(preview(parsed([{ newPrice: value }])).rows[0]).toMatchObject({ status: 'error' });
  });

  it('rejects formula prices and edits to inherited rows', () => {
    const result = preview(parsed([
      { newPrice: 110_000, newPriceFormula: '100000+10000' },
      {},
      { newPrice: 90_000 },
    ]));
    expect(result.rows[0]).toMatchObject({ status: 'error', message: expect.stringContaining('формул') });
    expect(result.rows[2]).toMatchObject({ status: 'error', message: expect.stringContaining('только для просмотра') });
  });

  it('rejects a numeric edit to a request-price row', () => {
    const requestProduct = createProduct({ id: 'request-product', sku: 'REQ-1', price: 99_000, priceMode: 'request' });
    const workbookRow: PriceWorkbookRow = {
      rowId: 'product:request-product', productId: requestProduct.id, priceOwner: 'product', editable: false,
      exportedPrice: null, group: '', category: '', subcategory: '', sku: 'REQ-1', productTitle: requestProduct.titleRu,
      variantTitle: '', priceLevel: 'Товар', salesUnit: 'шт', priceMode: 'По запросу', priceSource: 'По запросу', currentPrice: null,
    };
    const [manifestRow] = manifestRows([workbookRow]);
    const requestManifest: PriceExportManifest = {
      ...manifest, rowCount: 1, rows: [manifestRow], catalogDigest: catalogPriceDigest([manifestRow]),
    };
    const result = buildPricePreview({
      parsedRows: [{ ...manifestRow, digest: '', newPrice: 50_000 }],
      manifest: requestManifest, products: [requestProduct], workbookCatalogDigest: requestManifest.catalogDigest,
    });
    expect(result.rows[0]).toMatchObject({ status: 'error', message: expect.stringContaining('только для просмотра') });
  });

  it('rejects unknown, duplicate, missing and modified identity rows', () => {
    const duplicate = parsed();
    duplicate.push({ ...duplicate[0] });
    expect(preview(duplicate).summary.errors).toBeGreaterThan(0);

    const missing = parsed().slice(0, 2);
    expect(preview(missing).summary.errors).toBeGreaterThan(0);

    const unknown = parsed();
    unknown[0] = { ...unknown[0], rowId: 'product:unknown' };
    expect(preview(unknown).rows.some((row) => row.message?.includes('не относится'))).toBe(true);

    const renamed = parsed();
    renamed[0] = { ...renamed[0], sku: 'TAMPERED' };
    expect(preview(renamed).rows[0]).toMatchObject({ status: 'error', message: expect.stringContaining('Служебные данные') });
  });

  it('detects stale target prices but ignores unrelated content changes', () => {
    const stale = preview(parsed([{ newPrice: 105_000 }]), [{ ...product, price: 101_000 }]);
    expect(stale.rows[0]).toMatchObject({ status: 'conflict', current: 101_000 });

    const unrelated = preview(parsed([{ newPrice: 105_000 }]), [{ ...product, descriptionRu: 'Изменилось независимо' }]);
    expect(unrelated.rows[0]).toMatchObject({ status: 'change', current: 100_000 });
  });

  it('detects a changed pricing mode even when the numeric price is unchanged', () => {
    const result = preview(parsed([{ newPrice: 105_000 }]), [{ ...product, priceMode: 'request' }]);
    expect(result.rows[0]).toMatchObject({ status: 'conflict', message: expect.stringContaining('Режим') });
  });

  it('uses row order independently and validates the catalog digest', () => {
    const reordered = parsed().reverse();
    expect(preview(reordered).summary.errors).toBe(0);
    expect(preview(parsed(), [product], 'b'.repeat(64)).summary.errors).toBeGreaterThan(0);
  });

  it('keeps row digests tied to the visible validation context', () => {
    const row = manifest.rows[0];
    const { digest: _digest, ...identity } = row;
    expect(priceManifestRowDigest({ ...identity, sku: 'CHANGED' })).not.toBe(row.digest);
  });
});
