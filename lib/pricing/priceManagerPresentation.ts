import type { PriceImportBatch, PricePreviewRow } from './priceManagerTypes';

function presentRow(row: PricePreviewRow) {
  return {
    sku: row.sku,
    productTitle: row.productTitle,
    variantTitle: row.variantTitle,
    before: row.before,
    current: row.current,
    after: row.after,
    delta: row.delta,
    deltaPercent: row.deltaPercent,
    status: row.status,
    message: row.message,
  };
}

export function presentPriceBatch(batch: PriceImportBatch) {
  return {
    batchId: batch.batchId,
    createdAt: batch.createdAt,
    appliedAt: batch.appliedAt,
    rolledBackAt: batch.rolledBackAt,
    actorLabel: batch.actor.name || batch.actor.email,
    source: batch.source,
    originalFilename: batch.originalFilename,
    status: batch.status,
    summary: batch.summary,
    changedProductCount: batch.changedProductCount,
    changedRowCount: batch.changedRowCount,
    warningCount: batch.warningCount,
    rows: batch.rows.map(presentRow),
  };
}

export function presentRollback(input: Awaited<ReturnType<typeof import('./priceManagerServer').previewPriceRollback>>) {
  return {
    batch: presentPriceBatch(input.batch),
    conflictCount: input.conflictCount,
    rows: input.rows.map((row) => ({ ...presentRow(row), current: row.current, conflict: row.conflict })),
  };
}
