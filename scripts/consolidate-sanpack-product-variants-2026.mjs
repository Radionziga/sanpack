import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { priceList2026Products } from '../lib/catalog/sanpackPriceLists2026.ts';

const EXPECTED_PROJECT = 'stamply-4df8a';
const REPORT_DIR = path.resolve('tmp', 'product-variant-consolidation-2026-08-15');
const apply = process.argv.includes('--apply');
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

const consolidations = [
  { canonicalSku: 'SP-DA-004', absorbedSku: 'SP-DA-005', reason: 'Весовые варианты сливочного масла Svalya' },
  { canonicalSku: 'SP-CL-005', absorbedSku: 'SP-CL-006', reason: 'Размеры половой тряпки из микрофибры' },
];

if (projectId !== EXPECTED_PROJECT) {
  throw new Error(`Ожидался проект ${EXPECTED_PROJECT}, получен ${projectId || 'не указан'}.`);
}

const sourceBySku = new Map(priceList2026Products.map((product) => [product.sku, product]));
for (const consolidation of consolidations) {
  const source = sourceBySku.get(consolidation.canonicalSku);
  if (!source?.variants?.length) {
    throw new Error(`В исходном каталоге нет вариантов для ${consolidation.canonicalSku}.`);
  }
  const variantSkus = new Set(source.variants.map((variant) => variant.sku));
  if (!variantSkus.has(consolidation.canonicalSku) || !variantSkus.has(consolidation.absorbedSku)) {
    throw new Error(`Исходный каталог не сохраняет оба SKU для ${consolidation.canonicalSku}.`);
  }
}

await mkdir(REPORT_DIR, { recursive: true });

async function saveJson(fileName, data) {
  const target = path.join(REPORT_DIR, fileName);
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return target;
}

function publicSnapshot(document) {
  if (!document) return null;
  const data = document.data();
  return {
    id: document.id,
    sku: data.sku,
    titleRu: data.titleRu,
    price: data.price,
    mainImagePath: data.mainImagePath || null,
    variantSkus: (data.variants || []).map((variant) => variant.sku),
  };
}

function variantWithExistingImage(variant, documentsBySku) {
  const document = documentsBySku.get(variant.sku);
  const image = document?.data()?.mainImage;
  return image ? { ...variant, image } : variant;
}

function canonicalUpdate(source, documentsBySku) {
  return {
    titleRu: source.titleRu,
    titleUz: source.titleUz,
    titleEn: source.titleEn || source.titleRu,
    shortDescriptionRu: source.shortDescriptionRu,
    shortDescriptionUz: source.shortDescriptionUz,
    shortDescriptionEn: source.shortDescriptionEn || source.shortDescriptionRu,
    price: source.price,
    attributes: source.attributes,
    variants: source.variants.map((variant) => variantWithExistingImage(variant, documentsBySku)),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function matchesExpected(document, source) {
  if (!document || !source) return false;
  const data = document.data();
  const variants = data.variants || [];
  return data.titleRu === source.titleRu
    && data.price === source.price
    && variants.length === source.variants.length
    && source.variants.every((expected) => {
      const actual = variants.find((variant) => variant.id === expected.id);
      return actual?.sku === expected.sku && actual.price === expected.price;
    });
}

const app = initializeApp(
  { credential: applicationDefault(), projectId: EXPECTED_PROJECT },
  'sanpack-product-variant-consolidation-2026',
);
const db = getFirestore(app);

try {
  const initialSnapshot = await db.collection('products').get();
  const documentsBySku = new Map(initialSnapshot.docs.map((document) => [document.data().sku, document]));
  const alreadyApplied = consolidations.every(({ canonicalSku, absorbedSku }) => (
    !documentsBySku.has(absorbedSku)
    && matchesExpected(documentsBySku.get(canonicalSku), sourceBySku.get(canonicalSku))
  ));

  if (alreadyApplied) {
    const report = {
      generatedAt: new Date().toISOString(),
      projectId,
      apply,
      alreadyApplied: true,
      verifiedProductCount: initialSnapshot.size,
      expectedProductCount: priceList2026Products.length,
    };
    const reportPath = await saveJson('consolidation-report.json', report);
    if (initialSnapshot.size !== priceList2026Products.length) {
      throw new Error(`Варианты уже объединены, но в каталоге ${initialSnapshot.size} товаров вместо ${priceList2026Products.length}.`);
    }
    console.log(JSON.stringify({ success: true, reportPath, ...report }, null, 2));
    process.exitCode = 0;
  } else {
    const missing = consolidations.flatMap(({ canonicalSku, absorbedSku }) => (
      [canonicalSku, absorbedSku].filter((sku) => !documentsBySku.has(sku))
    ));
    if (missing.length) throw new Error(`Не найдены исходные SKU для объединения: ${missing.join(', ')}.`);
    if (initialSnapshot.size !== priceList2026Products.length + consolidations.length) {
      throw new Error(`Перед объединением ожидалось ${priceList2026Products.length + consolidations.length} товаров, найдено ${initialSnapshot.size}.`);
    }

    const plan = consolidations.map((item) => {
      const source = sourceBySku.get(item.canonicalSku);
      const canonical = documentsBySku.get(item.canonicalSku);
      const absorbed = documentsBySku.get(item.absorbedSku);
      return {
        ...item,
        canonicalDocument: publicSnapshot(canonical),
        absorbedDocument: publicSnapshot(absorbed),
        result: {
          id: canonical.id,
          sku: source.sku,
          titleRu: source.titleRu,
          price: source.price,
          variants: source.variants.map(({ id, sku, titleRu, price, attributes }) => ({ id, sku, titleRu, price, attributes })),
          preservedMainImagePath: canonical.data().mainImagePath || null,
        },
        retainedStoragePaths: [canonical.data().mainImagePath, absorbed.data().mainImagePath].filter(Boolean),
      };
    });

    const dryReport = {
      generatedAt: new Date().toISOString(),
      projectId,
      apply,
      beforeProductCount: initialSnapshot.size,
      expectedAfterProductCount: priceList2026Products.length,
      plan,
      note: 'Файлы изображений не удаляются: оба прежних Storage path сохранены для безопасного отката.',
    };
    const reportPath = await saveJson('consolidation-report.json', dryReport);
    console.log(JSON.stringify({ reportPath, ...dryReport }, null, 2));

    if (!apply) {
      console.log('Dry run завершён. Для применения добавьте --apply.');
    } else {
      const backup = consolidations.flatMap(({ canonicalSku, absorbedSku }) => [canonicalSku, absorbedSku])
        .map((sku) => {
          const document = documentsBySku.get(sku);
          return { id: document.id, sku, data: document.data() };
        });
      const backupPath = await saveJson(`consolidation-backup-${Date.now()}.json`, backup);
      let writeCommitted = false;

      try {
        const batch = db.batch();
        for (const { canonicalSku, absorbedSku } of consolidations) {
          const canonical = documentsBySku.get(canonicalSku);
          const absorbed = documentsBySku.get(absorbedSku);
          batch.update(canonical.ref, canonicalUpdate(sourceBySku.get(canonicalSku), documentsBySku));
          batch.delete(absorbed.ref);
        }
        await batch.commit();
        writeCommitted = true;

        const verificationSnapshot = await db.collection('products').get();
        const verificationBySku = new Map(verificationSnapshot.docs.map((document) => [document.data().sku, document]));
        const failures = consolidations.flatMap(({ canonicalSku, absorbedSku }) => {
          const errors = [];
          if (verificationBySku.has(absorbedSku)) errors.push(`${absorbedSku} не удалён`);
          if (!matchesExpected(verificationBySku.get(canonicalSku), sourceBySku.get(canonicalSku))) {
            errors.push(`${canonicalSku} не соответствует ожидаемым вариантам`);
          }
          return errors;
        });
        if (verificationSnapshot.size !== priceList2026Products.length) {
          failures.push(`после записи найдено ${verificationSnapshot.size} товаров вместо ${priceList2026Products.length}`);
        }
        if (failures.length) throw new Error(`Проверка после записи не пройдена: ${failures.join('; ')}.`);

        const finalReport = {
          ...dryReport,
          completedAt: new Date().toISOString(),
          success: true,
          backupPath,
          afterProductCount: verificationSnapshot.size,
          verifiedCanonicalSkus: consolidations.map(({ canonicalSku }) => canonicalSku),
          removedDuplicateSkus: consolidations.map(({ absorbedSku }) => absorbedSku),
        };
        await saveJson('consolidation-report.json', finalReport);
        console.log(JSON.stringify({
          success: true,
          backupPath,
          reportPath,
          afterProductCount: verificationSnapshot.size,
          verifiedCanonicalSkus: finalReport.verifiedCanonicalSkus,
          removedDuplicateSkus: finalReport.removedDuplicateSkus,
        }, null, 2));
      } catch (error) {
        if (writeCommitted) {
          const rollback = db.batch();
          for (const record of backup) rollback.set(db.collection('products').doc(record.id), record.data);
          await rollback.commit();
        }
        throw new Error(`Объединение не завершено; исходные документы восстановлены. ${error instanceof Error ? error.message : ''}`.trim());
      }
    }
  }
} finally {
  await deleteApp(app);
}
