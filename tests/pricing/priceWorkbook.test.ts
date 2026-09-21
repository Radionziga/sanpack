import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { buildPricePreview } from '@/lib/pricing/pricePreview';
import { catalogPriceDigest, manifestRows } from '@/lib/pricing/priceRows';
import {
  buildPriceWorkbookSheetPlan,
  createPriceWorkbook,
  inspectXlsxArchive,
  parsePriceWorkbook,
  sanitizePriceWorksheetName,
} from '@/lib/pricing/priceWorkbook';
import type { PriceExportManifest, PriceWorkbookRow } from '@/lib/pricing/priceManagerTypes';
import { createProduct } from '@/tests/fixtures/products';

function priceRow(overrides: Partial<PriceWorkbookRow>): PriceWorkbookRow {
  return {
    rowId: 'product:product-1234567890',
    productId: 'product-1234567890',
    priceOwner: 'product',
    editable: true,
    exportedPrice: 100_000,
    categoryId: 'beef',
    categoryTitle: 'Говядина',
    categoryBreadcrumb: 'Продукты питания → Мясо, птица и яйца → Говядина',
    categoryOrder: 10,
    group: 'Продукты питания',
    category: 'Мясо, птица и яйца',
    subcategory: 'Говядина',
    sku: '@SKU',
    productTitle: '=1+1',
    variantTitle: '',
    priceLevel: 'Товар',
    salesUnit: 'шт',
    priceMode: 'Фиксированная',
    priceSource: 'Цена товара',
    currentPrice: 100_000,
    ...overrides,
  };
}

const rows: PriceWorkbookRow[] = [
  priceRow({}),
  priceRow({
    rowId: 'variant:product-1234567890:variant-1234567890',
    variantId: 'variant-1234567890',
    priceOwner: 'inherited',
    editable: false,
    exportedPrice: null,
    sku: 'V-1',
    productTitle: 'Товар',
    variantTitle: 'Вариант',
    priceLevel: 'Вариант',
    currentPrice: 100_000,
  }),
  priceRow({
    rowId: 'product:product-chicken',
    productId: 'product-chicken',
    categoryId: 'chicken',
    categoryTitle: 'Курица',
    categoryBreadcrumb: 'Продукты питания → Мясо, птица и яйца → Курица',
    categoryOrder: 20,
    category: 'Мясо, птица и яйца',
    subcategory: 'Курица',
    sku: 'CH-1',
    productTitle: 'Куриное филе',
    exportedPrice: 80_000,
    currentPrice: 80_000,
  }),
];

async function workbookBuffer(workbookRows = rows) {
  return createPriceWorkbook({
    exportId: '12345678-1234-1234-1234-123456789012',
    createdAt: '2026-09-20T08:00:00.000Z',
    catalogDigest: 'a'.repeat(64),
    rows: workbookRows,
  });
}

async function load(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  return workbook;
}

function manifestFor(workbookRows = rows): PriceExportManifest {
  const sheets = buildPriceWorkbookSheetPlan(workbookRows);
  const manifestPriceRows = manifestRows(workbookRows, sheets);
  return {
    exportId: '12345678-1234-1234-1234-123456789012',
    schemaVersion: 2,
    createdAt: '2026-09-20T08:00:00.000Z',
    expiresAt: new Date('2026-12-20T08:00:00.000Z'),
    actor: { uid: 'admin', email: 'admin@example.com', name: 'Admin' },
    catalogDigest: catalogPriceDigest(manifestPriceRows),
    rowCount: manifestPriceRows.length,
    sheets,
    rows: manifestPriceRows,
  };
}

describe('price workbook', () => {
  it('generates ordered category sheets with protected cells, hidden metadata and no master sheet', async () => {
    const buffer = await workbookBuffer();
    if (process.env.SANPACK_PRICE_WORKBOOK_OUTPUT) await writeFile(process.env.SANPACK_PRICE_WORKBOOK_OUTPUT, buffer);
    await expect(inspectXlsxArchive(buffer)).resolves.toBeUndefined();
    const workbook = await load(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Инструкция', 'Говядина', 'Курица', '_SANPACK_META']);
    expect(workbook.getWorksheet('Цены')).toBeUndefined();
    expect(workbook.getWorksheet('_SANPACK_META')?.state).toBe('veryHidden');

    const beef = workbook.getWorksheet('Говядина')!;
    expect(beef.views[0]).toMatchObject({ state: 'frozen', xSplit: 2, ySplit: 4 });
    expect(beef.getCell('A1').value).toBe('Говядина');
    expect(beef.getCell('A2').value).toContain('Продукты питания');
    expect(beef.getColumn(12).hidden).toBe(true);
    expect(beef.getCell('I5').protection.locked).toBe(false);
    expect(beef.getCell('I6').protection?.locked).not.toBe(false);
    expect(beef.getCell('H5').numFmt).toContain('сум');
    expect(beef.getCell('A5').value).toBe('@SKU');
    expect(beef.getCell('B5').value).toBe('=1+1');
    expect(typeof beef.getCell('B5').value).toBe('string');
  });

  it('round-trips unchanged and modified prices from multiple category sheets', async () => {
    const original = await workbookBuffer();
    const parsed = await parsePriceWorkbook(original);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.sheets.map((sheet) => sheet.categoryId)).toEqual(['beef', 'chicken']);
    expect(new Set(parsed.rows.map((row) => row.rowId)).size).toBe(3);

    const workbook = await load(original);
    workbook.getWorksheet('Говядина')!.getCell('I5').value = 110_000;
    workbook.getWorksheet('Курица')!.getCell('I5').value = 85_000;
    const changed = await parsePriceWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(changed.rows.find((row) => row.rowId === rows[0].rowId)?.newPrice).toBe(110_000);
    expect(changed.rows.find((row) => row.rowId === rows[2].rowId)?.newPrice).toBe(85_000);
  });

  it('produces a zero-change preview for an unchanged multi-sheet workbook', async () => {
    const manifest = manifestFor();
    const parsed = await parsePriceWorkbook(await createPriceWorkbook({
      exportId: manifest.exportId,
      createdAt: manifest.createdAt,
      catalogDigest: manifest.catalogDigest,
      rows,
      sheets: manifest.sheets,
    }));
    const products = [
      createProduct({ id: 'product-1234567890', sku: '@SKU', titleRu: '=1+1', price: 100_000 }),
      createProduct({ id: 'product-chicken', sku: 'CH-1', titleRu: 'Куриное филе', price: 80_000 }),
    ];
    const preview = buildPricePreview({
      parsedRows: parsed.rows,
      manifest,
      products,
      workbookCatalogDigest: parsed.catalogDigest,
      workbookSheets: parsed.sheets,
    });
    expect(preview.summary).toEqual({ changes: 0, unchanged: 3, warnings: 0, conflicts: 0, errors: 0 });
  });

  it('rejects a row moved into the wrong category sheet', async () => {
    const workbook = await load(await workbookBuffer());
    const beef = workbook.getWorksheet('Говядина')!;
    const chicken = workbook.getWorksheet('Курица')!;
    const beefValues = beef.getRow(5).values;
    beef.getRow(5).values = chicken.getRow(5).values;
    chicken.getRow(5).values = beefValues;
    await expect(parsePriceWorkbook(Buffer.from(await workbook.xlsx.writeBuffer())))
      .rejects.toThrow(/не на своей вкладке/);
  });

  it('rejects a duplicate identity copied between category sheets', async () => {
    const workbook = await load(await workbookBuffer());
    const beef = workbook.getWorksheet('Говядина')!;
    const chicken = workbook.getWorksheet('Курица')!;
    chicken.getRow(5).values = beef.getRow(5).values;
    chicken.getCell('S5').value = 'chicken';
    await expect(parsePriceWorkbook(Buffer.from(await workbook.xlsx.writeBuffer())))
      .rejects.toThrow(/продублирована между вкладками/);
  });

  it.each(['rename', 'missing', 'unknown'] as const)('rejects %s category sheet structure', async (change) => {
    const workbook = await load(await workbookBuffer());
    const beef = workbook.getWorksheet('Говядина')!;
    if (change === 'rename') beef.name = 'Переименовано';
    if (change === 'missing') workbook.removeWorksheet(beef.id);
    if (change === 'unknown') workbook.addWorksheet('Лишний лист');
    await expect(parsePriceWorkbook(Buffer.from(await workbook.xlsx.writeBuffer())))
      .rejects.toThrow(/вклад|лист/i);
  });

  it('rejects formulas in editable price cells', async () => {
    const workbook = await load(await workbookBuffer());
    workbook.getWorksheet('Говядина')!.getCell('I5').value = { formula: '1+1', result: 2 };
    const parsed = await parsePriceWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(parsed.rows[0].newPriceFormula).toBe('1+1');
  });

  it('sanitizes, truncates and resolves worksheet-name collisions deterministically', () => {
    const longTitle = 'Очень длинное название категории / со знаками [и] вопросом?';
    const planRows = [
      priceRow({ categoryId: 'a', categoryTitle: longTitle, categoryBreadcrumb: longTitle, categoryOrder: 1 }),
      priceRow({ rowId: 'product:b', productId: 'b', categoryId: 'b', categoryTitle: longTitle, categoryBreadcrumb: longTitle, categoryOrder: 2 }),
      priceRow({ rowId: 'product:c', productId: 'c', categoryId: 'c', categoryTitle: 'Цены', categoryBreadcrumb: 'Цены', categoryOrder: 3 }),
    ];
    const first = buildPriceWorkbookSheetPlan(planRows);
    const second = buildPriceWorkbookSheetPlan(planRows);
    expect(first).toEqual(second);
    expect(first.map((sheet) => sheet.sheetName)).toHaveLength(3);
    expect(new Set(first.map((sheet) => sheet.sheetName.toLocaleLowerCase('ru-RU'))).size).toBe(3);
    expect(first.every((sheet) => sheet.sheetName.length <= 31 && !/[:\\/?*\[\]]/.test(sheet.sheetName))).toBe(true);
    expect(first[1].sheetName).toMatch(/\(2\)$/);
    expect(first[2].sheetName).not.toBe('Цены');
    expect(sanitizePriceWorksheetName('Вакуумные пакеты и пакеты для пиццы'))
      .toBe('Вакуумные пакеты и пакеты…');
    expect(sanitizePriceWorksheetName("'' : / ? * [ ] ")).toBe('Категория');
  });

  it('rejects non-XLSX input with a bounded failure', async () => {
    await expect(parsePriceWorkbook(Buffer.from('not-a-zip'))).rejects.toThrow();
  });

  it.each(['xl/vbaProject.bin', 'xl/externalLinks/externalLink1.xml', 'xl/embeddings/object1.bin'])(
    'rejects unsafe archive content at %s', async (entry) => {
      const zip = new JSZip();
      zip.file('[Content_Types].xml', '<Types/>');
      zip.file(entry, 'unsafe');
      await expect(inspectXlsxArchive(await zip.generateAsync({ type: 'nodebuffer' }))).rejects.toThrow(/макросы|внешние/);
    },
  );
});
