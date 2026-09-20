import ExcelJS from 'exceljs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import type { AdminSession } from '@/lib/auth/server';
import { createCategory } from '@/tests/fixtures/categories';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import {
  applyPriceBatch,
  exportCurrentPrices,
  getPriceBatch,
  previewPriceRollback,
  previewPriceWorkbook,
  rollbackPriceBatch,
} from '@/lib/pricing/priceManagerServer';

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const collections = ['products', 'categories', 'priceExportManifests', 'priceImportBatches'];
const admin: AdminSession = { uid: 'price-admin', email: 'prices@example.com', name: 'Price Admin', role: 'super_admin' };

async function clearCollection(name: string) {
  const snapshot = await getAdminDb().collection(name).get();
  if (snapshot.empty) return;
  const batch = getAdminDb().batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

async function editWorkbook(buffer: Buffer, changes: Record<string, number>) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  for (const sheet of workbook.worksheets.filter((candidate) => candidate.name !== 'Инструкция' && candidate.name !== '_SANPACK_META')) {
    const headers = new Map<string, number>();
    sheet.getRow(4).eachCell((cell, column) => headers.set(String(cell.value || ''), column));
    for (let row = 5; row <= sheet.rowCount; row += 1) {
      const rowId = String(sheet.getCell(row, headers.get('__rowId')!).value || '');
      if (changes[rowId] !== undefined) sheet.getCell(row, headers.get('Новая цена')!).value = changes[rowId];
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe.runIf(emulatorEnabled)('Excel price manager with the Firestore emulator', () => {
  beforeEach(async () => {
    await Promise.all(collections.map(clearCollection));
    await getAdminDb().collection('categories').doc('category-1').set(JSON.parse(JSON.stringify(createCategory('category-1'))));
    const product = JSON.parse(JSON.stringify(createProduct({
      id: 'product-1', sku: 'P-1', titleRu: 'Молоко', price: 100_000,
      descriptionRu: 'Не менять', wholesaleTiers: [{ minQuantity: 10, price: 90_000 }],
      variants: [
        createVariant({ id: 'explicit', sku: 'V-1', titleRu: '1 л', price: 120_000, stockQuantity: 7 }),
        createVariant({ id: 'explicit-2', sku: 'V-3', titleRu: '2 л', price: 140_000, stockQuantity: 5 }),
        createVariant({ id: 'inherited', sku: 'V-2', titleRu: '500 мл', price: undefined, stockQuantity: 9 }),
      ],
    })));
    await getAdminDb().collection('products').doc(product.id).set(product);
    await getAdminDb().collection('products').doc('product-unchanged').set(JSON.parse(JSON.stringify(createProduct({
      id: 'product-unchanged', sku: 'P-2', titleRu: 'Неизменяемый товар', price: 80_000,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }))));
  });

  afterAll(async () => Promise.all(collections.map(clearCollection)));

  it('exports, previews, atomically applies once, preserves unrelated data and rolls back safely', async () => {
    const exported = await exportCurrentPrices(admin);
    expect(exported.productCount).toBe(2);
    expect(exported.rowCount).toBe(5);
    const manifest = await getAdminDb().collection('priceExportManifests').doc(exported.exportId).get();
    expect(manifest.exists).toBe(true);
    expect(manifest.data()).toMatchObject({ rowCount: 5, actor: { uid: admin.uid } });

    const workbook = await editWorkbook(exported.workbook, {
      'product:product-1': 110_000,
      'variant:product-1:explicit': 130_000,
      'variant:product-1:explicit-2': 145_000,
    });
    const preview = await previewPriceWorkbook(admin, { name: 'prices.xlsx', buffer: workbook });
    expect(preview.status).toBe('ready');
    expect(preview.summary).toMatchObject({ changes: 3, conflicts: 0, errors: 0 });
    expect((await getAdminDb().collection('products').doc('product-1').get()).data()?.price).toBe(100_000);

    await getAdminDb().collection('products').doc('product-1').update({
      descriptionRu: 'Параллельное изменение',
      'seo.titleRu': 'SEO осталось',
    });
    const concurrent = await Promise.all([
      applyPriceBatch(admin, preview.batchId, false),
      applyPriceBatch(admin, preview.batchId, false),
    ]);
    expect(concurrent.map((result) => result.idempotent).sort()).toEqual([false, true]);
    const productAfter = (await getAdminDb().collection('products').doc('product-1').get()).data()!;
    expect(productAfter.price).toBe(110_000);
    expect(productAfter.descriptionRu).toBe('Параллельное изменение');
    expect(productAfter.seo.titleRu).toBe('SEO осталось');
    expect(productAfter.wholesaleTiers).toEqual([{ minQuantity: 10, price: 90_000 }]);
    expect(productAfter.variants.find((variant: { id: string }) => variant.id === 'explicit')).toMatchObject({ price: 130_000, stockQuantity: 7 });
    expect(productAfter.variants.find((variant: { id: string }) => variant.id === 'explicit-2')).toMatchObject({ price: 145_000, stockQuantity: 5 });
    expect(productAfter.variants.find((variant: { id: string }) => variant.id === 'inherited')).not.toHaveProperty('price');
    expect((await getAdminDb().collection('products').doc('product-unchanged').get()).data()?.updatedAt).toBe('2026-01-01T00:00:00.000Z');

    const replay = await applyPriceBatch(admin, preview.batchId, false);
    expect(replay.idempotent).toBe(true);
    expect((await getAdminDb().collection('priceImportBatches').get()).size).toBe(1);

    const rollbackPreview = await previewPriceRollback(preview.batchId);
    expect(rollbackPreview.conflictCount).toBe(0);
    await getAdminDb().collection('products').doc('product-1').update({ descriptionRu: 'Свежее описание' });
    const rolledBack = await rollbackPriceBatch(admin, preview.batchId);
    expect(rolledBack.status).toBe('rolled_back');
    const restored = (await getAdminDb().collection('products').doc('product-1').get()).data()!;
    expect(restored.price).toBe(100_000);
    expect(restored.descriptionRu).toBe('Свежее описание');
    expect(restored.variants.find((variant: { id: string }) => variant.id === 'explicit').price).toBe(120_000);
    expect(restored.variants.find((variant: { id: string }) => variant.id === 'explicit-2').price).toBe(140_000);
    await expect(rollbackPriceBatch(admin, preview.batchId)).rejects.toThrow('уже отменено');
  });

  it('blocks stale prices, inherited edits, expired manifests and rollback conflicts', async () => {
    const firstExport = await exportCurrentPrices(admin);
    const staleWorkbook = await editWorkbook(firstExport.workbook, { 'product:product-1': 105_000 });
    await getAdminDb().collection('products').doc('product-1').update({ price: 101_000 });
    const stale = await previewPriceWorkbook(admin, { name: 'stale.xlsx', buffer: staleWorkbook });
    expect(stale.status).toBe('invalid');
    expect(stale.summary.conflicts).toBe(1);

    await getAdminDb().collection('products').doc('product-1').update({ price: 100_000 });
    const inheritedWorkbook = await editWorkbook(firstExport.workbook, { 'variant:product-1:inherited': 95_000 });
    const inherited = await previewPriceWorkbook(admin, { name: 'inherited.xlsx', buffer: inheritedWorkbook });
    expect(inherited.status).toBe('invalid');
    expect(inherited.summary.errors).toBe(1);

    await getAdminDb().collection('priceExportManifests').doc(firstExport.exportId).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });
    await expect(previewPriceWorkbook(admin, { name: 'expired.xlsx', buffer: firstExport.workbook })).rejects.toThrow('слишком старый');

    const secondExport = await exportCurrentPrices(admin);
    const cleanWorkbook = await editWorkbook(secondExport.workbook, { 'product:product-1': 110_000 });
    const clean = await previewPriceWorkbook(admin, { name: 'clean.xlsx', buffer: cleanWorkbook });
    await applyPriceBatch(admin, clean.batchId, false);
    await getAdminDb().collection('products').doc('product-1').update({ price: 115_000 });
    const rollback = await previewPriceRollback(clean.batchId);
    expect(rollback.conflictCount).toBe(1);
    await expect(rollbackPriceBatch(admin, clean.batchId)).rejects.toThrow('изменилась после импорта');
    expect((await getPriceBatch(clean.batchId))?.status).toBe('applied');
  });

  it('blocks a mode change during apply even when the numeric price is unchanged', async () => {
    const exported = await exportCurrentPrices(admin);
    const workbook = await editWorkbook(exported.workbook, { 'product:product-1': 110_000 });
    const preview = await previewPriceWorkbook(admin, { name: 'mode.xlsx', buffer: workbook });
    await getAdminDb().collection('products').doc('product-1').update({ priceMode: 'request' });
    await expect(applyPriceBatch(admin, preview.batchId, false)).rejects.toThrow('Режим');
    expect((await getAdminDb().collection('products').doc('product-1').get()).data()?.price).toBe(100_000);
  });
});
