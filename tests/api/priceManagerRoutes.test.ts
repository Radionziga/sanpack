import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(), exportPrices: vi.fn(), preview: vi.fn(), apply: vi.fn(), rollback: vi.fn(),
  getBatch: vi.fn(), listHistory: vi.fn(), previewRollback: vi.fn(), revalidate: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({ getAdminSession: mocks.session }));
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidate }));
vi.mock('@/lib/pricing/priceManagerServer', () => ({
  exportCurrentPrices: mocks.exportPrices,
  previewPriceWorkbook: mocks.preview,
  applyPriceBatch: mocks.apply,
  rollbackPriceBatch: mocks.rollback,
  getPriceBatch: mocks.getBatch,
  listPriceHistory: mocks.listHistory,
  previewPriceRollback: mocks.previewRollback,
  isPriceConflict: () => false,
  priceOperationMessage: (error: unknown) => error instanceof Error ? error.message : null,
}));

import { GET as exportWorkbook } from '@/app/api/admin/prices/export/route';
import { POST as importWorkbook } from '@/app/api/admin/prices/import/route';
import { POST as mutateBatch } from '@/app/api/admin/prices/[batchId]/route';
import { PRICE_WORKBOOK_MAX_BYTES } from '@/lib/pricing/priceManagerTypes';

const context = { params: Promise.resolve({ batchId: '12345678-1234-1234-1234-123456789012' }) };
const batch = {
  batchId: '12345678-1234-1234-1234-123456789012', exportId: 'export', schemaVersion: 1,
  createdAt: '2026-09-20T00:00:00.000Z', previewExpiresAt: '2026-09-21T00:00:00.000Z',
  actor: { uid: 'admin', email: 'admin@example.com', name: 'Admin' }, source: 'excel' as const,
  originalFilename: 'prices.xlsx', workbookSha256: 'a'.repeat(64), catalogDigest: 'b'.repeat(64),
  status: 'applied' as const, summary: { changes: 1, unchanged: 0, warnings: 0, conflicts: 0, errors: 0 },
  changedProductCount: 1, changedRowCount: 1, warningCount: 0, rows: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ uid: 'admin', email: 'admin@example.com', name: 'Admin', role: 'super_admin' });
});

describe('price manager routes', () => {
  it('serves a private XLSX download with catalog counts', async () => {
    mocks.exportPrices.mockResolvedValue({ workbook: Buffer.from('xlsx'), rowCount: 300, productCount: 238, createdAt: '2026-09-20T08:30:00.000Z' });
    const response = await exportWorkbook();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('spreadsheetml');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-sanpack-product-count')).toBe('238');
    expect(response.headers.get('x-sanpack-price-row-count')).toBe('300');
    expect(response.headers.get('content-disposition')).toMatch(/SANPACK_prices_2026-09-20_/);
  });

  it('rejects oversized upload bodies before parsing multipart data', async () => {
    const request = new Request('https://shop.example/api/admin/prices/import', {
      method: 'POST', headers: { 'content-length': String(PRICE_WORKBOOK_MAX_BYTES + 300_000) },
    });
    const response = await importWorkbook(request);
    expect(response.status).toBe(413);
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it('requires a bounded request length before multipart parsing', async () => {
    const response = await importWorkbook(new Request('https://shop.example/api/admin/prices/import', { method: 'POST' }));
    expect(response.status).toBe(411);
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it('invalidates the canonical product cache after apply and rollback', async () => {
    mocks.apply.mockResolvedValue({ batch, idempotent: false });
    const applied = await mutateBatch(new Request('https://shop.example/api/admin/prices/batch', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'apply', warningsConfirmed: false }),
    }), context);
    expect(applied.status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith(expect.objectContaining({ uid: 'admin' }), batch.batchId, false);
    expect(mocks.revalidate).toHaveBeenCalledWith('products', { expire: 0 });

    mocks.revalidate.mockClear();
    mocks.rollback.mockResolvedValue({ ...batch, status: 'rolled_back' });
    const rolledBack = await mutateBatch(new Request('https://shop.example/api/admin/prices/batch', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'rollback' }),
    }), context);
    expect(rolledBack.status).toBe(200);
    expect(mocks.revalidate).toHaveBeenCalledWith('products', { expire: 0 });
  });
});
