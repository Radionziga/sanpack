import 'server-only';

import { Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase-admin/firestore';
import type { AdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import type { Category, Product } from '@/types';
import { getProductPriceMode } from '@/lib/commerce/productOffer';
import { buildPriceWorkbookRows, catalogPriceDigest, manifestRows } from './priceRows';
import { buildPricePreview } from './pricePreview';
import { buildPriceWorkbookSheetPlan, createPriceWorkbook, parsePriceWorkbook, sha256 } from './priceWorkbook';
import {
  PRICE_EXPORT_RETENTION_DAYS,
  PRICE_PREVIEW_RETENTION_HOURS,
  PRICE_WORKBOOK_SCHEMA_VERSION,
  type PriceExportManifest,
  type PriceHistoryItem,
  type PriceImportBatch,
  type PricePreviewRow,
} from './priceManagerTypes';

const MANIFESTS = 'priceExportManifests';
const BATCHES = 'priceImportBatches';

class PriceConflictError extends Error {}
class PriceOperationError extends Error {}

function actor(admin: AdminSession) {
  return { uid: admin.uid, email: admin.email, name: admin.name };
}

function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(removeUndefined) as T;
  if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Timestamp)) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, field]) => field !== undefined)
      .map(([key, field]) => [key, removeUndefined(field)])) as T;
  }
  return value;
}

function timestampDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date(Number.NaN);
}

function manifestFromSnapshot(snapshot: DocumentSnapshot<DocumentData>): PriceExportManifest | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  return {
    ...(data as Omit<PriceExportManifest, 'expiresAt'>),
    exportId: snapshot.id,
    expiresAt: timestampDate(data.expiresAt),
  };
}

function batchFromSnapshot(snapshot: DocumentSnapshot<DocumentData>): PriceImportBatch | null {
  return snapshot.exists ? { batchId: snapshot.id, ...snapshot.data() } as PriceImportBatch : null;
}

async function readCatalog() {
  const db = getAdminDb();
  const [productsSnapshot, categoriesSnapshot] = await Promise.all([
    db.collection('products').get(),
    db.collection('categories').get(),
  ]);
  return {
    products: productsSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Product),
    categories: categoriesSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Category),
  };
}

export async function exportCurrentPrices(admin: AdminSession) {
  const now = new Date();
  const createdAt = now.toISOString();
  const exportId = crypto.randomUUID();
  const { products, categories } = await readCatalog();
  const rows = buildPriceWorkbookRows(products, categories);
  const sheets = buildPriceWorkbookSheetPlan(rows);
  const manifestPriceRows = manifestRows(rows, sheets);
  const digest = catalogPriceDigest(manifestPriceRows);
  const manifest: PriceExportManifest = {
    exportId,
    schemaVersion: PRICE_WORKBOOK_SCHEMA_VERSION,
    createdAt,
    expiresAt: new Date(now.getTime() + PRICE_EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1_000),
    actor: actor(admin),
    catalogDigest: digest,
    rowCount: rows.length,
    sheets,
    rows: manifestPriceRows,
  };
  const workbook = await createPriceWorkbook({ exportId, createdAt, catalogDigest: digest, rows, sheets });
  await getAdminDb().collection(MANIFESTS).doc(exportId).set(removeUndefined({
    ...manifest,
    expiresAt: Timestamp.fromDate(manifest.expiresAt),
  }));
  return { workbook, rowCount: rows.length, productCount: products.length, createdAt, exportId };
}

export async function previewPriceWorkbook(admin: AdminSession, file: { name: string; buffer: Buffer }) {
  let parsed: Awaited<ReturnType<typeof parsePriceWorkbook>>;
  try {
    parsed = await parsePriceWorkbook(file.buffer);
  } catch (error) {
    const message = error instanceof Error && /Excel|файл|лист|вклад|строк|таблиц|колонк|категор|служебн|цену числом|макрос|вложен/i.test(error.message)
      ? error.message
      : 'Excel повреждён или имеет неподдерживаемую структуру. Скачайте свежий файл и повторите изменения.';
    throw new PriceOperationError(message);
  }
  const db = getAdminDb();
  const manifestSnapshot = await db.collection(MANIFESTS).doc(parsed.exportId).get();
  const manifest = manifestFromSnapshot(manifestSnapshot);
  if (!manifest) throw new PriceOperationError('Этот Excel не найден среди экспортов SANPACK. Скачайте актуальный файл.');
  if (!Number.isFinite(manifest.expiresAt.getTime()) || manifest.expiresAt.getTime() <= Date.now()) {
    throw new PriceOperationError('Этот файл слишком старый. Скачайте актуальный Excel и внесите изменения заново.');
  }
  const { products } = await readCatalog();
  const preview = buildPricePreview({
    parsedRows: parsed.rows,
    manifest,
    products,
    workbookCatalogDigest: parsed.catalogDigest,
    workbookSheets: parsed.sheets,
  });
  const changed = preview.rows.filter((row) => row.status === 'change' || row.status === 'warning');
  const now = new Date();
  const batchId = crypto.randomUUID();
  const batch: PriceImportBatch = {
    batchId,
    exportId: parsed.exportId,
    schemaVersion: parsed.schemaVersion,
    createdAt: now.toISOString(),
    previewExpiresAt: new Date(now.getTime() + PRICE_PREVIEW_RETENTION_HOURS * 60 * 60 * 1_000).toISOString(),
    actor: actor(admin),
    source: 'excel',
    originalFilename: file.name.slice(0, 240),
    workbookSha256: sha256(file.buffer),
    catalogDigest: manifest.catalogDigest,
    status: preview.summary.errors || preview.summary.conflicts ? 'invalid' : 'ready',
    summary: preview.summary,
    changedProductCount: new Set(changed.map((row) => row.productId)).size,
    changedRowCount: changed.length,
    warningCount: preview.summary.warnings,
    // Unchanged rows are summarized but do not need to inflate the persistent
    // audit document. The manifest remains the complete exported row set.
    rows: preview.rows.filter((row) => row.status !== 'unchanged'),
  };
  await db.collection(BATCHES).doc(batchId).set(removeUndefined(batch));
  return batch;
}

function actionableRows(batch: PriceImportBatch) {
  return batch.rows.filter((row) => row.status === 'change' || row.status === 'warning');
}

function livePrice(product: Product, row: PricePreviewRow) {
  if (row.priceOwner === 'product') return typeof product.price === 'number' ? product.price : null;
  if (row.priceOwner === 'variant') {
    const variant = product.variants.find((candidate) => candidate.id === row.variantId);
    return variant && typeof variant.price === 'number' ? variant.price : null;
  }
  return null;
}

function remainsEditable(product: Product, row: PricePreviewRow) {
  if (row.priceOwner === 'product') {
    const mode = getProductPriceMode(product);
    return (mode === 'fixed' || mode === 'from') && Number.isSafeInteger(product.price) && product.price! > 0;
  }
  if (row.priceOwner === 'variant') {
    const variant = product.variants.find((candidate) => candidate.id === row.variantId);
    const mode = variant ? getProductPriceMode(product, variant) : null;
    return Boolean(variant && (mode === 'fixed' || mode === 'from') && Number.isSafeInteger(variant.price) && variant.price! > 0);
  }
  return false;
}

function changedRowsByProduct(rows: PricePreviewRow[]) {
  const grouped = new Map<string, PricePreviewRow[]>();
  for (const row of rows) grouped.set(row.productId, [...(grouped.get(row.productId) || []), row]);
  return grouped;
}

export async function applyPriceBatch(admin: AdminSession, batchId: string, warningsConfirmed: boolean) {
  const db = getAdminDb();
  const batchReference = db.collection(BATCHES).doc(batchId);
  let idempotent = false;
  await db.runTransaction(async (transaction) => {
    const batchSnapshot = await transaction.get(batchReference);
    const batch = batchFromSnapshot(batchSnapshot);
    if (!batch) throw new PriceOperationError('Предпросмотр не найден. Загрузите Excel заново.');
    if (batch.status === 'applied') { idempotent = true; return; }
    if (batch.status !== 'ready') throw new PriceOperationError('Этот предпросмотр нельзя применить. Исправьте ошибки и загрузите файл заново.');
    if (new Date(batch.previewExpiresAt).getTime() <= Date.now()) throw new PriceOperationError('Предпросмотр устарел. Загрузите Excel заново.');
    if (batch.warningCount > 0 && !warningsConfirmed) throw new PriceOperationError('Подтвердите, что проверили необычно большие изменения цен.');
    const manifestReference = db.collection(MANIFESTS).doc(batch.exportId);
    const manifestSnapshot = await transaction.get(manifestReference);
    const manifest = manifestFromSnapshot(manifestSnapshot);
    if (!manifest || manifest.expiresAt.getTime() <= Date.now()) throw new PriceOperationError('Исходный экспорт устарел. Скачайте свежий Excel.');

    const rows = actionableRows(batch);
    if (!rows.length) throw new PriceOperationError('В Excel нет изменений цен для применения.');
    const grouped = changedRowsByProduct(rows);
    if (grouped.size + 1 > 500) throw new PriceOperationError('Изменений слишком много для одной безопасной операции. Разделите обновление.');
    const references = [...grouped.keys()].map((productId) => db.collection('products').doc(productId));
    const snapshots = await transaction.getAll(...references);
    const now = new Date().toISOString();
    for (const snapshot of snapshots) {
      if (!snapshot.exists) throw new PriceConflictError('Один из товаров больше не существует.');
      const product = { id: snapshot.id, ...snapshot.data() } as Product;
      const productRows = grouped.get(product.id)!;
      for (const row of productRows) {
        if (!remainsEditable(product, row)) throw new PriceConflictError(`Режим или источник цены ${row.sku} изменился после проверки.`);
        if (livePrice(product, row) !== row.before) throw new PriceConflictError(`Цена ${row.sku} изменилась после проверки.`);
      }
      const update: Record<string, unknown> = { updatedAt: now, updatedBy: admin.uid };
      const productPrice = productRows.find((row) => row.priceOwner === 'product');
      if (productPrice) update.price = productPrice.after;
      const variantRows = new Map(productRows.filter((row) => row.priceOwner === 'variant').map((row) => [row.variantId, row]));
      if (variantRows.size) {
        update.variants = product.variants.map((variant) => {
          const row = variantRows.get(variant.id);
          return row ? { ...variant, price: row.after! } : variant;
        });
      }
      transaction.update(snapshot.ref, update);
    }
    transaction.update(batchReference, {
      status: 'applied',
      appliedAt: now,
      appliedBy: actor(admin),
    });
  });
  const saved = batchFromSnapshot(await batchReference.get());
  return { batch: saved!, idempotent };
}

export async function getPriceBatch(batchId: string) {
  return batchFromSnapshot(await getAdminDb().collection(BATCHES).doc(batchId).get());
}

export async function listPriceHistory(limit = 20): Promise<PriceHistoryItem[]> {
  const snapshot = await getAdminDb().collection(BATCHES).orderBy('createdAt', 'desc').limit(Math.min(50, Math.max(1, limit))).get();
  return snapshot.docs.map((document) => {
    const batch = batchFromSnapshot(document)!;
    return {
      batchId: batch.batchId,
      createdAt: batch.createdAt,
      appliedAt: batch.appliedAt,
      rolledBackAt: batch.rolledBackAt,
      actorLabel: batch.appliedBy?.name || batch.actor.name || batch.actor.email,
      changedProductCount: batch.changedProductCount,
      changedRowCount: batch.changedRowCount,
      warningCount: batch.warningCount,
      status: batch.status,
      originalFilename: batch.originalFilename,
    };
  });
}

export async function previewPriceRollback(batchId: string) {
  const batch = await getPriceBatch(batchId);
  if (!batch) throw new PriceOperationError('Обновление не найдено.');
  if (batch.status !== 'applied') throw new PriceOperationError('Это обновление уже отменено или ещё не применено.');
  const rows = actionableRows(batch);
  const productIds = [...new Set(rows.map((row) => row.productId))];
  const snapshots = await getAdminDb().getAll(...productIds.map((id) => getAdminDb().collection('products').doc(id)));
  const products = new Map(snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => [snapshot.id, { id: snapshot.id, ...snapshot.data() } as Product]));
  const preview = rows.map((row) => {
    const product = products.get(row.productId);
    const current = product ? livePrice(product, row) : null;
    return { ...row, current, conflict: current !== row.after };
  });
  return { batch, rows: preview, conflictCount: preview.filter((row) => row.conflict).length };
}

export async function rollbackPriceBatch(admin: AdminSession, batchId: string) {
  const db = getAdminDb();
  const batchReference = db.collection(BATCHES).doc(batchId);
  await db.runTransaction(async (transaction) => {
    const batchSnapshot = await transaction.get(batchReference);
    const batch = batchFromSnapshot(batchSnapshot);
    if (!batch) throw new PriceOperationError('Обновление не найдено.');
    if (batch.status !== 'applied') throw new PriceOperationError('Это обновление уже отменено или ещё не применено.');
    const rows = actionableRows(batch);
    const grouped = changedRowsByProduct(rows);
    const references = [...grouped.keys()].map((productId) => db.collection('products').doc(productId));
    const snapshots = await transaction.getAll(...references);
    const now = new Date().toISOString();
    for (const snapshot of snapshots) {
      if (!snapshot.exists) throw new PriceConflictError('Один из товаров больше не существует.');
      const product = { id: snapshot.id, ...snapshot.data() } as Product;
      const productRows = grouped.get(product.id)!;
      for (const row of productRows) {
        if (!remainsEditable(product, row)) throw new PriceConflictError(`Режим или источник цены ${row.sku} изменился после импорта.`);
        if (livePrice(product, row) !== row.after) throw new PriceConflictError(`Цена ${row.sku} изменилась после импорта.`);
      }
      const update: Record<string, unknown> = { updatedAt: now, updatedBy: admin.uid };
      const productPrice = productRows.find((row) => row.priceOwner === 'product');
      if (productPrice) update.price = productPrice.before;
      const variantRows = new Map(productRows.filter((row) => row.priceOwner === 'variant').map((row) => [row.variantId, row]));
      if (variantRows.size) {
        update.variants = product.variants.map((variant) => {
          const row = variantRows.get(variant.id);
          return row ? { ...variant, price: row.before! } : variant;
        });
      }
      transaction.update(snapshot.ref, update);
    }
    transaction.update(batchReference, {
      status: 'rolled_back',
      rolledBackAt: now,
      rolledBackBy: actor(admin),
    });
  });
  return (await getPriceBatch(batchId))!;
}

export function isPriceConflict(error: unknown) {
  return error instanceof PriceConflictError;
}

export function priceOperationMessage(error: unknown) {
  return error instanceof PriceOperationError || error instanceof PriceConflictError ? error.message : null;
}
