import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createPriceWorkbook, inspectXlsxArchive, parsePriceWorkbook } from '@/lib/pricing/priceWorkbook';
import type { PriceWorkbookRow } from '@/lib/pricing/priceManagerTypes';

const rows: PriceWorkbookRow[] = [
  {
    rowId: 'product:product-1234567890', productId: 'product-1234567890', priceOwner: 'product', editable: true,
    exportedPrice: 100_000, group: '=НЕ ФОРМУЛА', category: '+Категория', subcategory: '-Подкатегория',
    sku: '@SKU', productTitle: '=1+1', variantTitle: '', priceLevel: 'Товар', salesUnit: 'шт',
    priceMode: 'Фиксированная', priceSource: 'Цена товара', currentPrice: 100_000,
  },
  {
    rowId: 'variant:product-1234567890:variant-1234567890', productId: 'product-1234567890',
    variantId: 'variant-1234567890', priceOwner: 'inherited', editable: false, exportedPrice: null,
    group: 'Раздел', category: 'Категория', subcategory: '', sku: 'V-1', productTitle: 'Товар',
    variantTitle: 'Вариант', priceLevel: 'Вариант', salesUnit: 'шт', priceMode: 'Фиксированная',
    priceSource: 'Цена товара', currentPrice: 100_000,
  },
];

async function workbookBuffer() {
  return createPriceWorkbook({
    exportId: '12345678-1234-1234-1234-123456789012',
    createdAt: '2026-09-20T08:00:00.000Z',
    catalogDigest: 'a'.repeat(64),
    rows,
  });
}

async function load(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  return workbook;
}

describe('price workbook', () => {
  it('generates the branded protected workbook with hidden metadata and safe text', async () => {
    const buffer = await workbookBuffer();
    if (process.env.SANPACK_PRICE_WORKBOOK_OUTPUT) {
      await writeFile(process.env.SANPACK_PRICE_WORKBOOK_OUTPUT, buffer);
    }
    await expect(inspectXlsxArchive(buffer)).resolves.toBeUndefined();
    const workbook = await load(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Инструкция', 'Цены', '_SANPACK_META']);
    expect(workbook.getWorksheet('_SANPACK_META')?.state).toBe('veryHidden');
    const sheet = workbook.getWorksheet('Цены')!;
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', xSplit: 5, ySplit: 4 });
    expect(sheet.getColumn(15).hidden).toBe(true);
    expect(sheet.getCell('L5').protection.locked).toBe(false);
    expect(sheet.getCell('L6').protection?.locked).not.toBe(false);
    expect(sheet.getCell('K5').numFmt).toContain('сум');
    expect(sheet.getCell('A5').value).toBe('=НЕ ФОРМУЛА');
    expect(typeof sheet.getCell('A5').value).toBe('string');
    expect(sheet.getCell('E5').value).toBe('=1+1');
  });

  it('round-trips identities and rejects formulas in the new price column', async () => {
    const original = await workbookBuffer();
    const parsed = await parsePriceWorkbook(original);
    expect(parsed.exportId).toBe('12345678-1234-1234-1234-123456789012');
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({ rowId: rows[0].rowId, newPrice: 100_000, sku: '@SKU' });

    const workbook = await load(original);
    workbook.getWorksheet('Цены')!.getCell('L5').value = { formula: '1+1', result: 2 };
    const changed = Buffer.from(await workbook.xlsx.writeBuffer());
    const formula = await parsePriceWorkbook(changed);
    expect(formula.rows[0].newPriceFormula).toBe('1+1');
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
