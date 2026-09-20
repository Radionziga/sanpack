import { createHash } from 'node:crypto';
import type { Category, Product, ProductPriceMode, ProductVariant } from '@/types';
import { getCategoryLineage, getOrderedCategories } from '@/lib/catalog/categoryHierarchy';
import { getProductPriceMode } from '@/lib/commerce/productOffer';
import type { PriceManifestRow, PriceOwner, PriceWorkbookRow, PriceWorkbookSheet } from './priceManagerTypes';

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isEditableMode(mode: ProductPriceMode) {
  return mode === 'fixed' || mode === 'from';
}

function positiveExplicitPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function workbookText(value: string, max: number) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}

function taxonomyTitles(product: Product, categories: Category[]) {
  const lineage = getCategoryLineage(product.categoryId, categories);
  const directCategory = lineage.at(-1);
  const categoryId = directCategory?.id || product.categoryId;
  const categoryTitle = workbookText(directCategory?.titleRu || product.categorySlug || product.categoryId, 300);
  const categoryBreadcrumb = workbookText(lineage.map((category) => category.titleRu).join(' → ') || categoryTitle, 500);
  const categoryOrder = getOrderedCategories(categories).findIndex((category) => category.id === categoryId);
  if (lineage.length >= 3) {
    return {
      categoryId, categoryTitle, categoryBreadcrumb,
      categoryOrder: categoryOrder === -1 ? Number.MAX_SAFE_INTEGER : categoryOrder,
      group: workbookText(lineage[0].titleRu, 300),
      category: workbookText(lineage[1].titleRu, 300),
      subcategory: workbookText(lineage[2].titleRu, 300),
    };
  }
  if (lineage.length === 2) {
    return {
      categoryId, categoryTitle, categoryBreadcrumb,
      categoryOrder: categoryOrder === -1 ? Number.MAX_SAFE_INTEGER : categoryOrder,
      group: workbookText(lineage[0].titleRu, 300),
      category: workbookText(lineage[1].titleRu, 300),
      subcategory: '',
    };
  }
  return {
    categoryId, categoryTitle, categoryBreadcrumb,
    categoryOrder: categoryOrder === -1 ? Number.MAX_SAFE_INTEGER : categoryOrder,
    group: '', category: categoryTitle, subcategory: '',
  };
}

function sourceFor(owner: PriceOwner, mode: ProductPriceMode) {
  if (mode === 'request') return 'По запросу';
  if (mode === 'informational') return 'Информационный';
  if (owner === 'variant') return 'Цена варианта';
  if (owner === 'inherited') return 'Цена товара';
  return 'Цена товара';
}

function modeLabel(mode: ProductPriceMode) {
  return ({ fixed: 'Фиксированная', from: 'От', request: 'По запросу', informational: 'Информационный' })[mode];
}

function productRow(product: Product, categories: Category[]): PriceWorkbookRow {
  const mode = getProductPriceMode(product);
  const explicit = positiveExplicitPrice(product.price);
  const editable = isEditableMode(mode) && explicit;
  const visiblePrice = isEditableMode(mode) && explicit ? product.price! : null;
  return {
    rowId: `product:${product.id}`,
    productId: product.id,
    priceOwner: explicit ? 'product' : 'none',
    editable,
    exportedPrice: editable ? product.price! : null,
    ...taxonomyTitles(product, categories),
    sku: workbookText(product.sku, 160),
    productTitle: workbookText(product.titleRu, 300),
    variantTitle: '',
    priceLevel: 'Товар',
    salesUnit: workbookText(product.salesUnit, 100),
    priceMode: modeLabel(mode),
    priceSource: sourceFor(explicit ? 'product' : 'none', mode),
    currentPrice: visiblePrice,
  };
}

function variantRow(product: Product, variant: ProductVariant, categories: Category[]): PriceWorkbookRow {
  const mode = getProductPriceMode(product, variant);
  const explicit = positiveExplicitPrice(variant.price);
  const inherited = !explicit && positiveExplicitPrice(product.price);
  const owner: PriceOwner = explicit ? 'variant' : inherited ? 'inherited' : 'none';
  const editable = isEditableMode(mode) && explicit;
  const visiblePrice = isEditableMode(mode)
    ? explicit ? variant.price! : inherited ? product.price! : null
    : null;
  return {
    rowId: `variant:${product.id}:${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    priceOwner: owner,
    editable,
    exportedPrice: editable ? variant.price! : null,
    ...taxonomyTitles(product, categories),
    sku: workbookText(variant.sku, 160),
    productTitle: workbookText(product.titleRu, 300),
    variantTitle: workbookText(variant.titleRu, 300),
    priceLevel: 'Вариант',
    salesUnit: workbookText(product.salesUnit, 100),
    priceMode: modeLabel(mode),
    priceSource: sourceFor(owner, mode),
    currentPrice: visiblePrice,
  };
}

export function buildPriceWorkbookRows(products: Product[], categories: Category[]) {
  const categoryRank = new Map(getOrderedCategories(categories).map((category, index) => [category.id, index]));
  return products
    .slice()
    .sort((left, right) => (categoryRank.get(left.categoryId) ?? Number.MAX_SAFE_INTEGER) - (categoryRank.get(right.categoryId) ?? Number.MAX_SAFE_INTEGER)
      || left.sortOrder - right.sortOrder
      || left.titleRu.localeCompare(right.titleRu, 'ru'))
    .flatMap((product) => [productRow(product, categories), ...(product.variants || []).map((variant) => variantRow(product, variant, categories))]);
}

export function manifestRows(rows: PriceWorkbookRow[], sheets: PriceWorkbookSheet[] = []): PriceManifestRow[] {
  const sheetByCategory = new Map(sheets.map((sheet) => [sheet.categoryId, sheet.sheetName]));
  return rows.map((row) => {
    const baseIdentity = {
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
    const sheetName = sheetByCategory.get(row.categoryId);
    const identity = sheetName
      ? { ...baseIdentity, categoryId: row.categoryId, sheetName }
      : baseIdentity;
    return { ...identity, digest: digest(identity) };
  });
}

export function catalogPriceDigest(rows: PriceManifestRow[]) {
  return digest(rows.map(({ digest: rowDigest }) => rowDigest));
}

export function priceManifestRowDigest(row: Omit<PriceManifestRow, 'digest'>) {
  return digest(row);
}
