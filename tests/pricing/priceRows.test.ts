import { describe, expect, it } from 'vitest';
import { createCategory } from '@/tests/fixtures/categories';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import { buildPriceWorkbookRows, catalogPriceDigest, manifestRows } from '@/lib/pricing/priceRows';

const categories = [
  createCategory('food', undefined, { titleRu: 'Продукты' }),
  createCategory('dairy', 'food', { titleRu: 'Молочная продукция' }),
  createCategory('cheese', 'dairy', { titleRu: 'Сыры' }),
];

describe('price workbook rows', () => {
  it('preserves explicit, inherited, request and informational price semantics', () => {
    const rows = buildPriceWorkbookRows([
      createProduct({
        id: 'priced', sku: 'P-1', categoryId: 'cheese', price: 100_000, priceMode: 'from',
        variants: [
          createVariant({ id: 'explicit', sku: 'V-1', price: 125_000 }),
          createVariant({ id: 'inherited', sku: 'V-2', price: undefined }),
        ],
      }),
      createProduct({ id: 'request', sku: 'P-2', categoryId: 'dairy', price: 99_000, priceMode: 'request' }),
      createProduct({ id: 'info', sku: 'P-3', categoryId: 'dairy', price: 88_000, priceMode: 'informational' }),
    ], categories);

    expect(rows.find((row) => row.rowId === 'product:priced')).toMatchObject({
      editable: true, exportedPrice: 100_000, priceOwner: 'product', priceMode: 'От',
      group: 'Продукты', category: 'Молочная продукция', subcategory: 'Сыры',
    });
    expect(rows.find((row) => row.rowId === 'variant:priced:explicit')).toMatchObject({
      editable: true, exportedPrice: 125_000, priceOwner: 'variant', priceSource: 'Цена варианта',
    });
    expect(rows.find((row) => row.rowId === 'variant:priced:inherited')).toMatchObject({
      editable: false, exportedPrice: null, currentPrice: 100_000, priceOwner: 'inherited', priceSource: 'Цена товара',
    });
    expect(rows.find((row) => row.rowId === 'product:request')).toMatchObject({
      editable: false, exportedPrice: null, currentPrice: null, priceMode: 'По запросу',
    });
    expect(rows.find((row) => row.rowId === 'product:info')).toMatchObject({
      editable: false, exportedPrice: null, currentPrice: null, priceMode: 'Информационный',
    });
  });

  it('creates deterministic identities and catalog digests', () => {
    const rows = buildPriceWorkbookRows([createProduct({ id: 'p', sku: 'SKU', categoryId: 'dairy' })], categories);
    const first = manifestRows(rows);
    const second = manifestRows(rows);
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({ rowId: 'product:p', productId: 'p', sku: 'SKU' });
    expect(catalogPriceDigest(first)).toMatch(/^[a-f0-9]{64}$/);
  });
});
