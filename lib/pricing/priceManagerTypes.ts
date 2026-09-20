export const PRICE_WORKBOOK_SCHEMA_VERSION = 1;
export const PRICE_WORKBOOK_MAX_BYTES = 5 * 1024 * 1024;
export const PRICE_WORKBOOK_MAX_ROWS = 2_000;
export const PRICE_WORKBOOK_MAX_COLUMNS = 30;
export const PRICE_EXPORT_RETENTION_DAYS = 90;
export const PRICE_PREVIEW_RETENTION_HOURS = 24;

export type PriceOwner = 'product' | 'variant' | 'inherited' | 'none';
export type PricePreviewStatus = 'change' | 'unchanged' | 'warning' | 'conflict' | 'error';
export type PriceBatchStatus = 'ready' | 'invalid' | 'applied' | 'rolled_back';

export interface PriceWorkbookRow {
  rowId: string;
  productId: string;
  variantId?: string;
  priceOwner: PriceOwner;
  editable: boolean;
  exportedPrice: number | null;
  group: string;
  category: string;
  subcategory: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  priceLevel: string;
  salesUnit: string;
  priceMode: string;
  priceSource: string;
  currentPrice: number | null;
}

export interface PriceManifestRow {
  rowId: string;
  productId: string;
  variantId?: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  priceOwner: PriceOwner;
  editable: boolean;
  exportedPrice: number | null;
  digest: string;
}

export interface PriceExportManifest {
  exportId: string;
  schemaVersion: number;
  createdAt: string;
  expiresAt: Date;
  actor: { uid: string; email: string; name: string };
  catalogDigest: string;
  rowCount: number;
  rows: PriceManifestRow[];
}

export interface ParsedPriceWorkbookRow extends PriceManifestRow {
  sku: string;
  productTitle: string;
  variantTitle: string;
  newPrice: number | null;
  newPriceFormula?: string;
}

export interface PricePreviewRow {
  rowId: string;
  productId: string;
  variantId?: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  priceOwner: PriceOwner;
  before: number | null;
  current: number | null;
  after: number | null;
  delta: number | null;
  deltaPercent: number | null;
  status: PricePreviewStatus;
  message?: string;
}

export interface PricePreviewSummary {
  changes: number;
  unchanged: number;
  warnings: number;
  conflicts: number;
  errors: number;
}

export interface PriceImportBatch {
  batchId: string;
  exportId: string;
  schemaVersion: number;
  createdAt: string;
  previewExpiresAt: string;
  appliedAt?: string;
  rolledBackAt?: string;
  actor: { uid: string; email: string; name: string };
  appliedBy?: { uid: string; email: string; name: string };
  rolledBackBy?: { uid: string; email: string; name: string };
  source: 'excel';
  originalFilename: string;
  workbookSha256: string;
  catalogDigest: string;
  status: PriceBatchStatus;
  summary: PricePreviewSummary;
  changedProductCount: number;
  changedRowCount: number;
  warningCount: number;
  rows: PricePreviewRow[];
}

export interface PriceHistoryItem {
  batchId: string;
  createdAt: string;
  appliedAt?: string;
  rolledBackAt?: string;
  actorLabel: string;
  changedProductCount: number;
  changedRowCount: number;
  warningCount: number;
  status: PriceBatchStatus;
  originalFilename: string;
}
