import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  LEGACY_PRICE_WORKBOOK_SCHEMA_VERSION,
  PRICE_WORKBOOK_MAX_COLUMNS,
  PRICE_WORKBOOK_MAX_ROWS,
  PRICE_WORKBOOK_SCHEMA_VERSION,
  type ParsedPriceWorkbook,
  type ParsedPriceWorkbookRow,
  type PriceWorkbookRow,
  type PriceWorkbookSheet,
} from './priceManagerTypes';

const SHEET_PASSWORD = 'sanpack-price-editor';
const LEGACY_PRICE_SHEET = 'Цены';
const INSTRUCTION_SHEET = 'Инструкция';
const META_SHEET = '_SANPACK_META';
const HEADER_ROW = 4;
const FIRST_DATA_ROW = HEADER_ROW + 1;
const MAX_WORKSHEETS = 64;
const EXCEL_SHEET_NAME_LIMIT = 31;

export const priceWorkbookHeaders = [
  'SKU', 'Товар', 'Вариант', 'Уровень цены', 'Единица продажи', 'Режим цены',
  'Источник цены', 'Текущая цена', 'Новая цена', 'Изменение', 'Изменение %',
  '__rowId', '__productId', '__variantId', '__priceOwner', '__editable',
  '__exportedPrice', '__schemaVersion', '__categoryId',
] as const;

const legacyPriceWorkbookHeaders = [
  'Раздел', 'Категория', 'Подкатегория', 'SKU', 'Товар', 'Вариант', 'Уровень цены',
  'Единица продажи', 'Режим цены', 'Источник цены', 'Текущая цена', 'Новая цена',
  'Изменение', 'Изменение %', '__rowId', '__productId', '__variantId', '__priceOwner',
  '__editable', '__exportedPrice', '__schemaVersion',
] as const;

function safeText(value: string) {
  // ExcelJS stores strings as shared text, not formulas. Prefixing with a quote
  // would change legitimate SKUs such as "-100" in the visible workbook.
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 500);
}

function textOrBlank(value: string) {
  const text = safeText(value);
  return text || null;
}

function workbookDate(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function rowsLabel(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  const noun = mod100 >= 11 && mod100 <= 14 ? 'строк' : mod10 === 1 ? 'строка' : mod10 >= 2 && mod10 <= 4 ? 'строки' : 'строк';
  return `${value} ${noun}`;
}

function shortenWorksheetName(title: string, limit: number, ellipsis = true) {
  if (title.length <= limit) return title;
  const marker = ellipsis ? '…' : '';
  const available = Math.max(1, limit - marker.length);
  const clipped = title.slice(0, available).trimEnd();
  const boundary = clipped.lastIndexOf(' ');
  const readable = boundary >= Math.floor(available * 0.6)
    ? clipped.slice(0, boundary).trimEnd()
    : clipped;
  return `${readable}${marker}`;
}

export function sanitizePriceWorksheetName(title: string) {
  const sanitized = safeText(title)
    .replace(/[:\\/?*\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^'+|'+$/g, '')
    .trim();
  return shortenWorksheetName(sanitized, EXCEL_SHEET_NAME_LIMIT) || 'Категория';
}

function uniqueWorksheetName(title: string, used: Set<string>) {
  const base = sanitizePriceWorksheetName(title);
  let candidate = base;
  for (let suffix = 2; used.has(candidate.toLocaleLowerCase('ru-RU')); suffix += 1) {
    const marker = ` (${suffix})`;
    candidate = `${shortenWorksheetName(base.replace(/…$/u, ''), EXCEL_SHEET_NAME_LIMIT - marker.length, false)}${marker}`;
  }
  used.add(candidate.toLocaleLowerCase('ru-RU'));
  return candidate;
}

export function buildPriceWorkbookSheetPlan(rows: PriceWorkbookRow[]): PriceWorkbookSheet[] {
  const byCategory = new Map<string, Omit<PriceWorkbookSheet, 'sheetName' | 'rowCount'> & { rowCount: number }>();
  for (const row of rows) {
    const existing = byCategory.get(row.categoryId);
    if (existing) existing.rowCount += 1;
    else byCategory.set(row.categoryId, {
      categoryId: row.categoryId,
      categoryTitle: row.categoryTitle,
      breadcrumb: row.categoryBreadcrumb,
      order: row.categoryOrder,
      rowCount: 1,
    });
  }
  const used = new Set([INSTRUCTION_SHEET, META_SHEET, LEGACY_PRICE_SHEET].map((name) => name.toLocaleLowerCase('ru-RU')));
  return [...byCategory.values()]
    .sort((left, right) => left.order - right.order
      || left.categoryTitle.localeCompare(right.categoryTitle, 'ru')
      || left.categoryId.localeCompare(right.categoryId))
    .map((category) => ({ ...category, sheetName: uniqueWorksheetName(category.categoryTitle, used) }));
}

async function addInstructionSheet(workbook: ExcelJS.Workbook, createdAt: string) {
  const instruction = workbook.addWorksheet(INSTRUCTION_SHEET, { views: [{ showGridLines: false }] });
  instruction.columns = [{ width: 3 }, { width: 28 }, { width: 72 }, { width: 3 }];
  instruction.mergeCells('B2:C2');
  instruction.getCell('B2').value = 'Обновление цен SANPACK';
  instruction.getCell('B2').font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0A4B2E' } };
  instruction.getCell('B3').value = 'Файл подготовлен';
  instruction.getCell('C3').value = workbookDate(createdAt);
  instruction.getCell('B3').font = instruction.getCell('C3').font = { name: 'Arial', size: 10, color: { argb: 'FF4C5751' } };
  instruction.mergeCells('B5:C5');
  instruction.getCell('B5').value = 'Как обновить цены';
  instruction.getCell('B5').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF151B18' } };
  const steps = [
    'Выберите нужную категорию на вкладках внизу Excel.',
    'Изменяйте только зелёные ячейки в колонке «Новая цена».',
    'Не перемещайте строки между вкладками, не переименовывайте вкладки и не меняйте служебные данные.',
    'Сохраните файл в формате .xlsx.',
    'Загрузите файл в Admin → Цены и проверьте найденные изменения.',
    'Примените изменения явной кнопкой. Сам Excel ничего на сайте не меняет.',
  ];
  steps.forEach((step, index) => {
    const row = 7 + index * 2;
    instruction.getCell(row, 2).value = index + 1;
    instruction.getCell(row, 2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    instruction.getCell(row, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F6E43' } };
    instruction.getCell(row, 2).alignment = { horizontal: 'center', vertical: 'middle' };
    instruction.getCell(row, 3).value = step;
    instruction.getCell(row, 3).font = { name: 'Arial', size: 10, color: { argb: 'FF151B18' } };
    instruction.getCell(row, 3).alignment = { vertical: 'middle', wrapText: true };
    instruction.getRow(row).height = 28;
  });
  instruction.mergeCells('B20:C20');
  instruction.getCell('B20').value = 'Цены «по запросу» и информационные позиции недоступны для редактирования. Если вариант наследует цену товара, меняйте строку уровня «Товар».';
  instruction.getCell('B20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } };
  instruction.getCell('B20').font = { name: 'Arial', size: 10, color: { argb: 'FF6B4F00' } };
  instruction.getCell('B20').alignment = { wrapText: true, vertical: 'middle' };
  instruction.getRow(20).height = 44;
  await instruction.protect(SHEET_PASSWORD, { selectLockedCells: true, selectUnlockedCells: false });
}

async function addCategorySheet(
  workbook: ExcelJS.Workbook,
  category: PriceWorkbookSheet,
  rows: PriceWorkbookRow[],
  createdAt: string,
  tableIndex: number,
) {
  const sheet = workbook.addWorksheet(category.sheetName, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: HEADER_ROW, topLeftCell: 'C5', showGridLines: false }],
  });
  sheet.getCell('A1').value = category.categoryTitle;
  sheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0A4B2E' } };
  sheet.mergeCells('A1:F1');
  sheet.getCell('A2').value = category.breadcrumb;
  sheet.getCell('A2').font = { name: 'Arial', size: 9, color: { argb: 'FF4C5751' } };
  sheet.mergeCells('A2:G2');
  sheet.getCell('H1').value = `Экспорт: ${workbookDate(createdAt)} · ${rowsLabel(rows.length)}`;
  sheet.getCell('H1').font = { name: 'Arial', size: 9, color: { argb: 'FF4C5751' } };
  sheet.mergeCells('H1:K1');
  sheet.getCell('H2').value = 'Редактируйте только зелёные ячейки →';
  sheet.getCell('H2').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F6E43' } };
  sheet.mergeCells('H2:K2');

  const tableRows = rows.map((row, index) => {
    const excelRow = FIRST_DATA_ROW + index;
    return [
      safeText(row.sku), safeText(row.productTitle), textOrBlank(row.variantTitle), row.priceLevel,
      safeText(row.salesUnit), row.priceMode, row.priceSource, row.currentPrice,
      row.editable ? row.exportedPrice : null,
      { formula: `IF(OR(H${excelRow}="",I${excelRow}=""),"",I${excelRow}-H${excelRow})` },
      { formula: `IF(OR(H${excelRow}="",I${excelRow}="",H${excelRow}=0),"",(I${excelRow}-H${excelRow})/H${excelRow})` },
      row.rowId, row.productId, row.variantId || null, row.priceOwner, row.editable, row.exportedPrice,
      PRICE_WORKBOOK_SCHEMA_VERSION, row.categoryId,
    ];
  });
  sheet.addTable({
    name: `SanpackPriceRows${tableIndex}`,
    ref: `A${HEADER_ROW}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium4', showRowStripes: true },
    columns: priceWorkbookHeaders.map((name) => ({ name })),
    rows: tableRows,
  });
  sheet.getRow(HEADER_ROW).height = 34;
  sheet.getRow(HEADER_ROW).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(HEADER_ROW).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet.columns.forEach((column) => { column.font = { name: 'Arial', size: 9, color: { argb: 'FF151B18' } }; });
  [16, 34, 25, 14, 15, 16, 18, 16, 16, 16, 14].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  for (let index = 12; index <= priceWorkbookHeaders.length; index += 1) sheet.getColumn(index).hidden = true;
  sheet.getColumn(8).numFmt = '#,##0" сум"';
  sheet.getColumn(9).numFmt = '#,##0" сум"';
  sheet.getColumn(10).numFmt = '+#,##0" сум";-#,##0" сум";0" сум"';
  sheet.getColumn(11).numFmt = '+0.0%;-0.0%;0.0%';
  sheet.getColumn(1).alignment = { vertical: 'middle' };
  sheet.getColumn(2).alignment = { vertical: 'middle', wrapText: true };
  sheet.getColumn(3).alignment = { vertical: 'middle', wrapText: true };
  sheet.getColumn(8).alignment = sheet.getColumn(9).alignment = sheet.getColumn(10).alignment = sheet.getColumn(11).alignment = { horizontal: 'right', vertical: 'middle' };
  rows.forEach((row, index) => {
    const excelRow = FIRST_DATA_ROW + index;
    sheet.getRow(excelRow).height = 30;
    const newPrice = sheet.getCell(excelRow, 9);
    if (row.editable) {
      newPrice.protection = { locked: false };
      newPrice.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EC' } };
      newPrice.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0A4B2E' } };
      newPrice.dataValidation = {
        type: 'whole', operator: 'greaterThan', formulae: [0], allowBlank: false,
        showErrorMessage: true, errorTitle: 'Некорректная цена', error: 'Введите целое число больше нуля.',
      };
    } else {
      newPrice.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF2F0' } };
      newPrice.font = { name: 'Arial', size: 9, color: { argb: 'FF7A8580' } };
    }
  });
  const lastRow = FIRST_DATA_ROW + rows.length - 1;
  sheet.addConditionalFormatting({ ref: `K${FIRST_DATA_ROW}:K${lastRow}`, rules: [
    { type: 'cellIs', priority: 1, operator: 'greaterThan', formulae: [0.3], style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } }, font: { color: { argb: 'FF8A5A00' }, bold: true } } },
    { type: 'cellIs', priority: 2, operator: 'lessThan', formulae: [-0.3], style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE8EC' } }, font: { color: { argb: 'FFB4233A' }, bold: true } } },
  ] });
  await sheet.protect(SHEET_PASSWORD, {
    selectLockedCells: true, selectUnlockedCells: true, sort: true, autoFilter: true,
  });
}

export async function createPriceWorkbook(input: {
  exportId: string;
  createdAt: string;
  catalogDigest: string;
  rows: PriceWorkbookRow[];
  sheets?: PriceWorkbookSheet[];
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SANPACK';
  workbook.company = 'SANPACK';
  workbook.subject = 'Массовое обновление базовых цен';
  workbook.created = new Date(input.createdAt);
  workbook.modified = new Date(input.createdAt);
  workbook.calcProperties.fullCalcOnLoad = true;

  const sheets = input.sheets || buildPriceWorkbookSheetPlan(input.rows);
  if (!sheets.length || sheets.some((sheet) => sheet.rowCount < 1)) throw new Error('Для экспорта цен не найдены категории с товарами.');
  await addInstructionSheet(workbook, input.createdAt);
  for (const [index, category] of sheets.entries()) {
    const rows = input.rows.filter((row) => row.categoryId === category.categoryId);
    if (rows.length !== category.rowCount) throw new Error('Структура категорий экспорта цен не совпадает с набором строк.');
    await addCategorySheet(workbook, category, rows, input.createdAt, index + 1);
  }

  const meta = workbook.addWorksheet(META_SHEET, { state: 'veryHidden', views: [{ showGridLines: false }] });
  meta.addRows([
    ['key', 'value'],
    ['exportId', input.exportId],
    ['schemaVersion', PRICE_WORKBOOK_SCHEMA_VERSION],
    ['catalogDigest', input.catalogDigest],
    ['createdAt', input.createdAt],
    ['rowCount', input.rows.length],
    [],
    ['sheetName', 'categoryId', 'categoryTitle', 'breadcrumb', 'order', 'rowCount'],
    ...sheets.map((sheet) => [sheet.sheetName, sheet.categoryId, sheet.categoryTitle, sheet.breadcrumb, sheet.order, sheet.rowCount]),
  ]);
  meta.getColumn(1).width = 32;
  meta.getColumn(2).width = 72;
  await meta.protect(SHEET_PASSWORD, { selectLockedCells: true, selectUnlockedCells: false });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function cellText(cell: ExcelJS.Cell, max = 500) {
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object') {
    if ('richText' in cell.value) return cell.value.richText.map((part) => part.text).join('').trim().slice(0, max);
    return String(cell.text || '').trim().slice(0, max);
  }
  return String(cell.value).trim().slice(0, max);
}

function nullableNumber(cell: ExcelJS.Cell) {
  if (cell.value === null || cell.value === undefined || cell.value === '') return null;
  return typeof cell.value === 'number' ? cell.value : Number.NaN;
}

export async function inspectXlsxArchive(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer, { createFolders: false });
  const entries = Object.values(zip.files);
  if (entries.length > 250) throw new Error('Файл содержит слишком много внутренних частей. Скачайте новый Excel из SANPACK.');
  let uncompressed = 0;
  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    if (name.includes('vbaproject.bin') || name.startsWith('xl/externallinks/') || name.startsWith('xl/embeddings/') || name.startsWith('xl/macrosheets/')) {
      throw new Error('Файл содержит макросы или внешние вложения. Загрузите обычный .xlsx без макросов.');
    }
    const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (typeof size === 'number') uncompressed += size;
    if (uncompressed > 25 * 1024 * 1024) throw new Error('Распакованный Excel слишком большой. Скачайте свежий файл и повторите изменения.');
  }
}

function metadataMap(meta: ExcelJS.Worksheet) {
  const metadata = new Map<string, string>();
  for (let rowNumber = 2; rowNumber <= 6; rowNumber += 1) {
    metadata.set(cellText(meta.getCell(rowNumber, 1), 80), cellText(meta.getCell(rowNumber, 2), 500));
  }
  return metadata;
}

function headerColumns<T extends readonly string[]>(sheet: ExcelJS.Worksheet, headers: T) {
  const headerMap = new Map<string, number>();
  sheet.getRow(HEADER_ROW).eachCell((cell, column) => headerMap.set(cellText(cell, 80), column));
  for (const header of headers) {
    if (!headerMap.has(header)) throw new Error(`На листе «${sheet.name}» отсутствует колонка «${header.startsWith('__') ? 'служебные данные' : header}».`);
  }
  return (header: T[number]) => headerMap.get(header)!;
}

function parseSheetRows(input: {
  sheet: ExcelJS.Worksheet;
  schemaVersion: number;
  categoryId?: string;
  legacy?: boolean;
}) {
  const { sheet, schemaVersion, categoryId, legacy = false } = input;
  if (sheet.rowCount > PRICE_WORKBOOK_MAX_ROWS || sheet.columnCount > PRICE_WORKBOOK_MAX_COLUMNS) {
    throw new Error(`Лист «${sheet.name}» превышает допустимый размер таблицы.`);
  }
  const headers = legacy ? legacyPriceWorkbookHeaders : priceWorkbookHeaders;
  const column = headerColumns(sheet, headers);
  const rows: ParsedPriceWorkbookRow[] = [];
  for (let rowNumber = FIRST_DATA_ROW; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const rowId = cellText(row.getCell(column('__rowId')), 240);
    if (!rowId) continue;
    const priceCell = row.getCell(column('Новая цена'));
    const formula = typeof priceCell.value === 'object' && priceCell.value && 'formula' in priceCell.value
      ? String(priceCell.value.formula)
      : undefined;
    const rowCategoryId = legacy ? undefined : cellText(row.getCell(column('__categoryId')), 160);
    const rowSchemaVersion = Number(row.getCell(column('__schemaVersion')).value);
    if (rowSchemaVersion !== schemaVersion) {
      throw new Error(`Служебная версия строки ${rowId} повреждена. Скачайте свежий Excel.`);
    }
    if (!legacy && rowCategoryId !== categoryId) {
      throw new Error(`Строка ${rowId} находится не на своей вкладке категории. Скачайте свежий Excel и повторите изменения.`);
    }
    rows.push({
      rowId,
      productId: cellText(row.getCell(column('__productId')), 160),
      variantId: cellText(row.getCell(column('__variantId')), 160) || undefined,
      priceOwner: cellText(row.getCell(column('__priceOwner')), 40) as ParsedPriceWorkbookRow['priceOwner'],
      editable: cellText(row.getCell(column('__editable')), 20).toLowerCase() === 'true',
      exportedPrice: nullableNumber(row.getCell(column('__exportedPrice'))),
      categoryId: rowCategoryId,
      sheetName: legacy ? undefined : sheet.name,
      digest: '',
      sku: cellText(row.getCell(column('SKU')), 160),
      productTitle: cellText(row.getCell(column('Товар')), 300),
      variantTitle: cellText(row.getCell(column('Вариант')), 300),
      newPrice: formula ? null : nullableNumber(priceCell),
      newPriceFormula: formula,
    });
  }
  if (schemaVersion !== (legacy ? LEGACY_PRICE_WORKBOOK_SCHEMA_VERSION : PRICE_WORKBOOK_SCHEMA_VERSION)) {
    throw new Error('Версия Excel не поддерживается. Скачайте актуальный файл.');
  }
  return rows;
}

function readSheetManifest(meta: ExcelJS.Worksheet) {
  const sheets: PriceWorkbookSheet[] = [];
  for (let rowNumber = 9; rowNumber <= meta.rowCount; rowNumber += 1) {
    const sheetName = cellText(meta.getCell(rowNumber, 1), EXCEL_SHEET_NAME_LIMIT);
    if (!sheetName) continue;
    const order = Number(meta.getCell(rowNumber, 5).value);
    const rowCount = Number(meta.getCell(rowNumber, 6).value);
    sheets.push({
      sheetName,
      categoryId: cellText(meta.getCell(rowNumber, 2), 160),
      categoryTitle: cellText(meta.getCell(rowNumber, 3), 300),
      breadcrumb: cellText(meta.getCell(rowNumber, 4), 500),
      order,
      rowCount,
    });
  }
  if (!sheets.length || sheets.some((sheet) => !sheet.categoryId || !Number.isSafeInteger(sheet.order) || !Number.isSafeInteger(sheet.rowCount) || sheet.rowCount < 1)) {
    throw new Error('Служебная карта вкладок Excel повреждена. Скачайте новый файл.');
  }
  if (new Set(sheets.map((sheet) => sheet.sheetName.toLocaleLowerCase('ru-RU'))).size !== sheets.length
    || new Set(sheets.map((sheet) => sheet.categoryId)).size !== sheets.length) {
    throw new Error('Служебная карта вкладок Excel содержит дубликаты. Скачайте новый файл.');
  }
  return sheets;
}

export async function parsePriceWorkbook(buffer: Buffer): Promise<ParsedPriceWorkbook> {
  await inspectXlsxArchive(buffer);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  if (workbook.worksheets.length > MAX_WORKSHEETS) throw new Error('В Excel слишком много листов. Используйте файл, скачанный из SANPACK.');
  const meta = workbook.getWorksheet(META_SHEET);
  if (!meta) throw new Error('Не найдены служебные данные Excel. Скачайте новый файл.');
  const metadata = metadataMap(meta);
  const schemaVersion = Number(metadata.get('schemaVersion'));
  if (schemaVersion !== LEGACY_PRICE_WORKBOOK_SCHEMA_VERSION && schemaVersion !== PRICE_WORKBOOK_SCHEMA_VERSION) {
    throw new Error('Версия Excel не поддерживается. Скачайте актуальный файл.');
  }
  const exportId = metadata.get('exportId') || '';
  const catalogDigest = metadata.get('catalogDigest') || '';
  const expectedRowCount = Number(metadata.get('rowCount'));
  if (!/^[a-zA-Z0-9-]{20,160}$/.test(exportId) || !/^[a-f0-9]{64}$/.test(catalogDigest)
    || !Number.isSafeInteger(expectedRowCount) || expectedRowCount < 1 || expectedRowCount > PRICE_WORKBOOK_MAX_ROWS) {
    throw new Error('Служебные данные Excel повреждены. Скачайте новый файл.');
  }

  if (schemaVersion === LEGACY_PRICE_WORKBOOK_SCHEMA_VERSION) {
    const prices = workbook.getWorksheet(LEGACY_PRICE_SHEET);
    if (!prices) throw new Error('Не найден обязательный лист «Цены». Скачайте новый Excel.');
    const rows = parseSheetRows({ sheet: prices, schemaVersion, legacy: true });
    if (rows.length !== expectedRowCount) throw new Error('Количество строк Excel не совпадает со служебными данными. Скачайте новый файл.');
    return { exportId, schemaVersion, catalogDigest, sheets: [], rows };
  }

  if (!workbook.getWorksheet(INSTRUCTION_SHEET)) throw new Error('Не найден обязательный лист «Инструкция». Скачайте новый Excel.');
  if (meta.state !== 'veryHidden') throw new Error('Служебный лист Excel должен оставаться скрытым. Скачайте новый файл.');
  const sheets = readSheetManifest(meta);
  if (sheets.reduce((total, sheet) => total + sheet.rowCount, 0) !== expectedRowCount) {
    throw new Error('Служебные количества строк по вкладкам не совпадают с экспортом. Скачайте новый файл.');
  }
  const expectedNames = sheets.map((sheet) => sheet.sheetName);
  const actualNames = workbook.worksheets
    .filter((sheet) => sheet.name !== INSTRUCTION_SHEET && sheet.name !== META_SHEET)
    .map((sheet) => sheet.name);
  if (actualNames.length !== expectedNames.length || actualNames.some((name, index) => name !== expectedNames[index])) {
    throw new Error('Набор или порядок вкладок категорий изменён. Не переименовывайте, не удаляйте и не добавляйте вкладки.');
  }
  const rows: ParsedPriceWorkbookRow[] = [];
  for (const sheetManifest of sheets) {
    const sheet = workbook.getWorksheet(sheetManifest.sheetName);
    if (!sheet) throw new Error(`Не найдена вкладка категории «${sheetManifest.sheetName}».`);
    if (sheet.state !== 'visible') throw new Error(`Вкладка категории «${sheetManifest.sheetName}» должна оставаться видимой.`);
    const parsed = parseSheetRows({ sheet, schemaVersion, categoryId: sheetManifest.categoryId });
    if (parsed.length !== sheetManifest.rowCount) {
      throw new Error(`Количество строк на вкладке «${sheetManifest.sheetName}» изменено. Скачайте свежий Excel и повторите изменения.`);
    }
    rows.push(...parsed);
  }
  if (new Set(rows.map((row) => row.rowId)).size !== rows.length) {
    throw new Error('Одна и та же строка цены продублирована между вкладками. Скачайте свежий Excel и повторите изменения.');
  }
  if (rows.length > PRICE_WORKBOOK_MAX_ROWS || rows.length !== expectedRowCount) {
    throw new Error('Общее количество строк Excel не совпадает со служебными данными. Скачайте новый файл.');
  }
  return { exportId, schemaVersion, catalogDigest, sheets, rows };
}

export function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}
