import type { Product } from '@/types';
import { getProductPriceMode } from '@/lib/commerce/productOffer';
import {
  PRICE_WORKBOOK_SCHEMA_VERSION,
  type ParsedPriceWorkbookRow,
  type PriceExportManifest,
  type PricePreviewRow,
  type PricePreviewSummary,
} from './priceManagerTypes';
import { priceManifestRowDigest } from './priceRows';

const VALID_OWNERS = new Set(['product', 'variant', 'inherited', 'none']);

function currentTarget(product: Product | undefined, row: ParsedPriceWorkbookRow) {
  if (!product) return { price: null, editable: false };
  if (row.priceOwner === 'product') {
    const mode = getProductPriceMode(product);
    return {
      price: typeof product.price === 'number' ? product.price : null,
      editable: (mode === 'fixed' || mode === 'from') && Number.isSafeInteger(product.price) && product.price! > 0,
    };
  }
  if (row.priceOwner === 'variant') {
    const variant = product.variants.find((candidate) => candidate.id === row.variantId);
    const mode = variant ? getProductPriceMode(product, variant) : null;
    return {
      price: variant && typeof variant.price === 'number' ? variant.price : null,
      editable: Boolean(variant && (mode === 'fixed' || mode === 'from') && Number.isSafeInteger(variant.price) && variant.price! > 0),
    };
  }
  return { price: row.exportedPrice, editable: false };
}

function summary(rows: PricePreviewRow[]): PricePreviewSummary {
  return {
    changes: rows.filter((row) => row.status === 'change' || row.status === 'warning').length,
    unchanged: rows.filter((row) => row.status === 'unchanged').length,
    warnings: rows.filter((row) => row.status === 'warning').length,
    conflicts: rows.filter((row) => row.status === 'conflict').length,
    errors: rows.filter((row) => row.status === 'error').length,
  };
}

function previewError(row: ParsedPriceWorkbookRow, message: string): PricePreviewRow {
  return {
    ...row,
    before: row.exportedPrice,
    current: row.exportedPrice,
    after: row.newPrice,
    delta: null,
    deltaPercent: null,
    status: 'error',
    message,
  };
}

export function buildPricePreview(input: {
  parsedRows: ParsedPriceWorkbookRow[];
  manifest: PriceExportManifest;
  products: Product[];
  workbookCatalogDigest: string;
}) {
  const { parsedRows, manifest, products, workbookCatalogDigest } = input;
  const structuralErrors: string[] = [];
  if (manifest.schemaVersion !== PRICE_WORKBOOK_SCHEMA_VERSION) structuralErrors.push('Версия export manifest больше не поддерживается.');
  if (workbookCatalogDigest !== manifest.catalogDigest) structuralErrors.push('Служебная контрольная сумма Excel не совпадает с экспортом.');

  const manifestById = new Map(manifest.rows.map((row) => [row.rowId, row]));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const seen = new Set<string>();
  const rows: PricePreviewRow[] = [];

  for (const row of parsedRows) {
    if (seen.has(row.rowId)) {
      rows.push(previewError(row, 'Строка продублирована в Excel.'));
      continue;
    }
    seen.add(row.rowId);
    const expected = manifestById.get(row.rowId);
    if (!expected) {
      rows.push(previewError(row, 'Строка не относится к этому экспорту SANPACK.'));
      continue;
    }
    if (!VALID_OWNERS.has(row.priceOwner)) {
      rows.push(previewError(row, 'Служебный тип цены повреждён.'));
      continue;
    }
    const identity = {
      rowId: row.rowId,
      productId: row.productId,
      variantId: row.variantId,
      sku: row.sku,
      productTitle: row.productTitle,
      variantTitle: row.variantTitle,
      priceOwner: row.priceOwner,
      editable: row.editable,
      exportedPrice: row.exportedPrice,
    };
    const identityMatches = expected.digest === priceManifestRowDigest(identity)
      && expected.productId === row.productId
      && expected.variantId === row.variantId
      && expected.sku === row.sku
      && expected.productTitle === row.productTitle
      && expected.variantTitle === row.variantTitle
      && expected.priceOwner === row.priceOwner
      && expected.editable === row.editable
      && expected.exportedPrice === row.exportedPrice;
    if (!identityMatches) {
      rows.push(previewError(row, 'Служебные данные строки были изменены.'));
      continue;
    }
    if (row.newPriceFormula) {
      rows.push(previewError(row, 'Введите новую цену числом, а не формулой.'));
      continue;
    }
    if (!expected.editable) {
      if (row.newPrice !== null) rows.push(previewError(row, 'Эта цена доступна только для просмотра и не может быть изменена через Excel.'));
      else rows.push({ ...previewError(row, ''), status: 'unchanged', message: undefined, current: row.exportedPrice, after: row.exportedPrice });
      continue;
    }
    if (row.newPrice === null || !Number.isSafeInteger(row.newPrice) || row.newPrice <= 0) {
      rows.push(previewError(row, 'Новая цена должна быть целым числом больше нуля.'));
      continue;
    }
    const product = productsById.get(row.productId);
    if (!product) {
      rows.push({ ...previewError(row, 'Товар больше не существует.'), status: 'conflict', current: null });
      continue;
    }
    if (row.priceOwner === 'variant' && !product.variants.some((variant) => variant.id === row.variantId)) {
      rows.push({ ...previewError(row, 'Вариант больше не существует.'), status: 'conflict', current: null });
      continue;
    }
    const target = currentTarget(product, row);
    const current = target.price;
    if (!target.editable) {
      rows.push({
        ...previewError(row, 'Режим или источник этой цены изменился после экспорта. Скачайте свежий Excel.'),
        status: 'conflict', before: expected.exportedPrice, current, after: row.newPrice,
      });
      continue;
    }
    if (current !== expected.exportedPrice) {
      rows.push({
        ...previewError(row, 'Цена в SANPACK изменилась после экспорта. Скачайте свежий Excel.'),
        status: 'conflict',
        before: expected.exportedPrice,
        current,
        after: row.newPrice,
      });
      continue;
    }
    if (row.newPrice === expected.exportedPrice) {
      rows.push({
        ...previewError(row, ''), status: 'unchanged', message: undefined,
        before: expected.exportedPrice, current, after: row.newPrice, delta: 0, deltaPercent: 0,
      });
      continue;
    }
    const delta = row.newPrice - expected.exportedPrice!;
    const deltaPercent = delta / expected.exportedPrice!;
    const warning = Math.abs(deltaPercent) > 0.3;
    rows.push({
      rowId: row.rowId,
      productId: row.productId,
      variantId: row.variantId,
      sku: row.priceOwner === 'variant'
        ? product.variants.find((variant) => variant.id === row.variantId)?.sku || row.sku
        : product.sku,
      productTitle: product.titleRu,
      variantTitle: row.priceOwner === 'variant'
        ? product.variants.find((variant) => variant.id === row.variantId)?.titleRu || row.variantTitle
        : '',
      priceOwner: row.priceOwner,
      before: expected.exportedPrice,
      current,
      after: row.newPrice,
      delta,
      deltaPercent,
      status: warning ? 'warning' : 'change',
      message: warning ? 'Цена изменилась более чем на 30%. Проверьте значение перед применением.' : undefined,
    });
  }

  for (const expected of manifest.rows) {
    if (!seen.has(expected.rowId)) structuralErrors.push(`В Excel отсутствует строка ${expected.rowId}.`);
  }
  if (parsedRows.length !== manifest.rows.length) {
    structuralErrors.push(`Количество строк не совпадает с экспортом: ожидалось ${manifest.rows.length}, найдено ${parsedRows.length}.`);
  }
  if (structuralErrors.length) {
    rows.unshift(...structuralErrors.map((message, index): PricePreviewRow => ({
      rowId: `structure:${index}`,
      productId: '',
      sku: '—',
      productTitle: 'Структура Excel',
      variantTitle: '',
      priceOwner: 'none',
      before: null,
      current: null,
      after: null,
      delta: null,
      deltaPercent: null,
      status: 'error',
      message,
    })));
  }

  return { rows, summary: summary(rows) };
}
