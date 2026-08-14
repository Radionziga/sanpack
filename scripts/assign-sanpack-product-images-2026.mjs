import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

import { priceList2026Products } from '../lib/catalog/sanpackPriceLists2026.ts';

const EXPECTED_PROJECT = 'stamply-4df8a';
const EXPECTED_BUCKET = 'stamply-4df8a.firebasestorage.app';
const SOURCE_DIR = process.env.SANPACK_IMAGE_DIR || 'C:\\Users\\Радион\\Desktop\\Картинки';
const REPORT_DIR = path.resolve('tmp', 'pdfs', 'sanpack-v1.6');
const OPTIMIZED_DIR = path.join(REPORT_DIR, 'optimized-images');
const apply = process.argv.includes('--apply');
const mappingOnly = process.argv.includes('--mapping-only');
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

if (!mappingOnly && projectId !== EXPECTED_PROJECT) {
  throw new Error(
    `Операция остановлена: ожидался проект ${EXPECTED_PROJECT}, получен ${projectId || 'не указан'}.`,
  );
}

const filesBySku = new Map();
const reviewsBySku = new Map();

function assign(fileName, skus, reviewReason = '') {
  for (const sku of skus) {
    if (filesBySku.has(sku)) throw new Error(`Повторное сопоставление SKU ${sku}.`);
    filesBySku.set(sku, fileName);
    if (reviewReason) reviewsBySku.set(sku, reviewReason);
  }
}

assign('Растр (2).png', ['SP-TB-001']);
assign('Растр (1).png', ['SP-TB-002']);
assign('Растр.png', ['SP-TB-003']);
assign('Группа из 2 объектов (4).png', ['SP-TB-004']);
assign('Группа из 2 объектов (2).png', ['SP-TB-005']);
assign('Группа из 2 объектов (1).png', ['SP-TB-006'], 'На изображении указано 220 л, в карточке товара — 200 л.');
assign('Группа из 2 объектов (3).png', ['SP-TB-007']);
assign('Группа из 2 объектов.png', ['SP-TB-008']);
assign('Растр (12).png', ['SP-TO-001']);
assign('Растр (11).png', ['SP-TO-002']);
assign('Растр (15).png', ['SP-CB-001'], 'На изображении указано 100 пакетов, в карточке — 50.');
assign('Растр (17).png', ['SP-CB-002'], 'На изображении указано 100 пакетов, в карточке — 50.');
assign('Растр (18).png', ['SP-CB-003'], 'На изображении указано 100 пакетов, в карточке — 30.');
assign('Растр (16).png', ['SP-CB-004']);
assign('Растр (13).png', ['SP-CB-005']);
assign('Растр (10).png', ['SP-PB-001'], 'Использовано общее изображение белого пакета; рекомендуется проверить форму изделия.');
assign('Растр (3).png', ['SP-FP-001']);
assign('Растр (5).png', ['SP-FP-002']);
assign('Растр (6).png', ['SP-FP-003']);
assign('Растр (4).png', ['SP-FP-004']);
assign('Растр (7).png', ['SP-GL-001']);
assign('Растр (8).png', ['SP-GL-002', 'SP-GL-003'], 'Одно изображение используется для двух вариантов жёлтых перчаток.');
assign('Растр (9).png', ['SP-GL-004']);
assign('Растр (26).png', ['SP-CL-001']);
assign('Группа из 4 объектов.png', ['SP-CL-002']);
assign('Растр (25).png', ['SP-CL-003']);
assign('Растр (24).png', ['SP-CL-004']);
assign('Растр (25).png', ['SP-CL-005', 'SP-CL-006'], 'Использовано общее изображение микрофибры; размеры на фото не показаны.');
assign('Растр (20).png', ['SP-PG-001']);
assign('Растр (23).png', ['SP-PG-002']);
assign('Растр (23).png', ['SP-PG-003'], 'Использовано общее изображение диспенсерных салфеток; проверьте тип сложения Z.');
assign('Растр (21).png', ['SP-PG-004']);
assign('Растр (22).png', ['SP-PG-005']);
assign('Растр (19).png', ['SP-PG-006'], 'На изображении упаковка из 8 рулонов, в карточке — 6.');
assign('Растр (28).png', ['SP-PG-007']);

assign('Растр (33).png', [
  'SP-BF-001', 'SP-BF-002', 'SP-BF-003', 'SP-BF-004', 'SP-BF-005', 'SP-BF-006',
  'SP-BF-007', 'SP-BF-008', 'SP-BF-009', 'SP-BF-010', 'SP-BF-011', 'SP-BF-012',
], 'Для всех отрубов временно используется одна фотография говядины по согласованному правилу.');
assign('Растр (34).png', [
  'SP-CH-001', 'SP-CH-002', 'SP-CH-003', 'SP-CH-004', 'SP-CH-005', 'SP-CH-006',
  'SP-CH-007', 'SP-CH-008', 'SP-CH-009',
], 'Для всех частей курицы временно используется одна фотография целой тушки по согласованному правилу.');
assign('Растр (30).png', ['SP-EG-001']);

assign('Растр (38).png', ['SP-FL-001', 'SP-FL-002'], 'Одна фотография мешка 50 кг используется также для фасовки 25 кг.');
assign('Растр (38).png', ['SP-FL-003', 'SP-FL-004'], 'Одна фотография «Дани Нан» используется для первого и высшего сорта.');
assign('Растр (37).png', ['SP-FL-005', 'SP-FL-006'], 'Одна фотография «Алтын Нан» используется для первого и высшего сорта.');
assign('Растр (39).png', ['SP-FL-007', 'SP-FL-008'], 'Одна фотография «Муътабар» используется для первого и высшего сорта.');
assign('Растр (36).png', ['SP-SG-001']);
assign('Растр (44).png', ['SP-GR-001']);
assign('Растр (45).png', ['SP-GR-002']);
assign('Растр (41).png', ['SP-GR-003']);
assign('Растр (40).png', ['SP-GR-004']);
assign('Растр (43).png', ['SP-GR-005']);
assign('Растр (42).png', ['SP-GR-006']);
assign('Растр (35).png', ['SP-OI-001']);

assign('Растр (32).png', ['SP-FR-001', 'SP-FR-002', 'SP-FR-003', 'SP-FR-004', 'SP-FR-005', 'SP-FR-006'], 'Временно используется одна общая фотография фруктов; нужны отдельные фото каждой позиции.');
assign('Растр (66).png', ['SP-GN-001']);
assign('Растр (64).png', ['SP-GN-002']);
assign('Растр (63).png', ['SP-GN-003']);
assign('Растр (67).png', ['SP-GN-004']);
assign('Растр (62).png', ['SP-GN-006']);
assign('Растр (61).png', ['SP-GN-008']);
assign('Растр (60).png', ['SP-GN-009']);
assign('Растр (65).png', ['SP-GN-010']);
assign('Растр (68).png', ['SP-GN-012']);
assign('Растр (79).png', ['SP-GN-013']);
assign('Растр (74).png', ['SP-GN-016']);
assign('Растр (71).png', ['SP-GN-018']);
assign('Растр (73).png', ['SP-GN-020']);
assign('Растр (75).png', ['SP-GN-022', 'SP-GN-024'], 'Одна фотография петрушки используется для двух вариантов товара.');
assign('Растр (69).png', ['SP-GN-025']);
assign('Растр (72).png', ['SP-GN-026']);
assign('Растр (70).png', ['SP-GN-028']);
assign('Растр (66).png', ['SP-GN-029'], 'Для резаного айсберга временно используется фотография целого кочана.');
assign('Растр (77).png', ['SP-MG-001']);
assign('Растр (87).png', ['SP-MG-002']);
assign('Растр (78).png', ['SP-MG-003']);
assign('Растр (85).png', ['SP-MG-004']);
assign('Растр (80).png', ['SP-MG-005']);
assign('Растр (84).png', ['SP-MG-006']);
assign('Растр (86).png', ['SP-MG-007']);
assign('Растр (81).png', ['SP-MG-008']);
assign('Растр (84).png', ['SP-MG-009'], 'Для обычного редиса используется то же фото, что для красной редиски.');
assign('Растр (76).png', ['SP-MG-010']);
assign('Растр (82).png', ['SP-MG-011']);
assign('Растр (83).png', ['SP-MG-012']);

assign('Растр (55).png', ['SP-DA-001']);
assign('Растр (56).png', ['SP-DA-002']);
assign('Растр (57).png', ['SP-DA-003']);
assign('Растр (54).png', ['SP-DA-004', 'SP-DA-005'], 'Одно изображение масла Svalya используется для фасовок 25 кг и 1 кг.');
assign('Растр (49).png', ['SP-DA-006']);
assign('Растр (47).png', ['SP-DA-007']);
assign('Растр (50).png', ['SP-DA-008']);
assign('Растр (52).png', ['SP-DA-009']);
assign('Растр (53).png', ['SP-DA-010']);
assign('Группа из 1 объектов.png', ['SP-DA-011'], 'На исходном изображении упаковка Camembert 125 г, в карточке — 500 г.');
assign('Растр (51).png', ['SP-DA-012'], 'На исходном изображении упаковка Brie 125 г, в карточке — 500 г.');
assign('Растр (48).png', ['SP-DA-013']);
assign('Растр (29).png', ['SP-OI-002']);

const sourceProductsBySku = new Map(priceList2026Products.map((product) => [product.sku, product]));
const knownSkus = new Set(sourceProductsBySku.keys());
const unknownMappedSkus = [...filesBySku.keys()].filter((sku) => !knownSkus.has(sku));
if (unknownMappedSkus.length) throw new Error(`В карте есть неизвестные SKU: ${unknownMappedSkus.join(', ')}`);

if (mappingOnly) {
  const uniqueFiles = [...new Set(filesBySku.values())];
  const unmatched = priceList2026Products
    .filter((product) => !filesBySku.has(product.sku))
    .map((product) => productSummary(product));
  const needsReview = priceList2026Products
    .filter((product) => reviewsBySku.has(product.sku))
    .map((product) => productSummary(product, {
      fileName: filesBySku.get(product.sku),
      reason: reviewsBySku.get(product.sku),
    }));
  console.log(JSON.stringify({
    products: priceList2026Products.length,
    matched: filesBySku.size,
    unmatched,
    needsReview: needsReview.length,
    uniqueImages: uniqueFiles.length,
  }, null, 2));
  process.exit(0);
}

const app = initializeApp(
  { credential: applicationDefault(), projectId, storageBucket: EXPECTED_BUCKET },
  'sanpack-image-assignment-2026',
);
const db = getFirestore(app);
const bucket = getStorage(app).bucket(EXPECTED_BUCKET);

function productSummary(product, extra = {}) {
  return {
    sku: product.sku,
    title: product.titleRu,
    ...extra,
  };
}

function restoreValue(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : FieldValue.delete();
}

async function writeJson(fileName, value) {
  await mkdir(REPORT_DIR, { recursive: true });
  const target = path.join(REPORT_DIR, fileName);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return target;
}

async function validateSourceFiles() {
  const uniqueFiles = [...new Set(filesBySku.values())];
  const missing = [];
  for (const fileName of uniqueFiles) {
    try {
      await readFile(path.join(SOURCE_DIR, fileName));
    } catch {
      missing.push(fileName);
    }
  }
  if (missing.length) throw new Error(`Не найдены исходные изображения: ${missing.join(', ')}`);
  return uniqueFiles;
}

async function prepareImage(fileName) {
  const sourcePath = path.join(SOURCE_DIR, fileName);
  const source = await readFile(sourcePath);
  const hash = createHash('sha256').update(source).digest('hex');
  const destination = `media/products/catalog-v1-6/${hash.slice(0, 24)}.webp`;
  const localPath = path.join(OPTIMIZED_DIR, `${hash.slice(0, 24)}.webp`);
  await mkdir(OPTIMIZED_DIR, { recursive: true });
  await sharp(source)
    .rotate()
    .resize(1400, 1400, {
      fit: 'contain',
      background: { r: 248, g: 249, b: 247, alpha: 1 },
      withoutEnlargement: true,
    })
    .webp({ quality: 88, effort: 5, smartSubsample: true })
    .toFile(localPath);
  return { fileName, destination, localPath };
}

async function uploadPreparedImage(prepared) {
  const storageFile = bucket.file(prepared.destination);
  const [exists] = await storageFile.exists();
  let token;
  let created = false;

  if (exists) {
    const [metadata] = await storageFile.getMetadata();
    token = metadata.metadata?.firebaseStorageDownloadTokens?.split(',')[0];
    if (!token) {
      token = randomUUID();
      await storageFile.setMetadata({
        metadata: { ...(metadata.metadata || {}), firebaseStorageDownloadTokens: token },
      });
    }
  } else {
    token = randomUUID();
    await bucket.upload(prepared.localPath, {
      destination: prepared.destination,
      resumable: false,
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public,max-age=31536000,immutable',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    created = true;
  }

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(prepared.destination)}?alt=media&token=${token}`;
  return { ...prepared, url, created };
}

async function commitInChunks(operations) {
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = db.batch();
    for (const operation of operations.slice(offset, offset + 400)) {
      batch.update(operation.ref, operation.data);
    }
    await batch.commit();
  }
}

let uploaded = [];
let backup = [];
let databaseUpdated = false;

try {
  const uniqueFiles = await validateSourceFiles();
  const snapshot = await db.collection('products').get();
  const databaseProductsBySku = new Map(snapshot.docs.map((document) => [document.data().sku, document]));
  const missingDatabaseSkus = [...knownSkus].filter((sku) => !databaseProductsBySku.has(sku));
  const extraDatabaseSkus = [...databaseProductsBySku.keys()].filter((sku) => !knownSkus.has(sku));

  if (snapshot.size !== priceList2026Products.length || missingDatabaseSkus.length || extraDatabaseSkus.length) {
    throw new Error(
      `Состав каталога не совпадает с ожидаемым: в базе ${snapshot.size}, ожидалось ${priceList2026Products.length}; ` +
      `нет SKU: ${missingDatabaseSkus.join(', ') || '—'}; лишние SKU: ${extraDatabaseSkus.join(', ') || '—'}.`,
    );
  }

  const unmatched = priceList2026Products
    .filter((product) => !filesBySku.has(product.sku))
    .map((product) => productSummary(product));
  const needsReview = priceList2026Products
    .filter((product) => reviewsBySku.has(product.sku))
    .map((product) => productSummary(product, {
      fileName: filesBySku.get(product.sku),
      reason: reviewsBySku.get(product.sku),
    }));
  const matched = priceList2026Products
    .filter((product) => filesBySku.has(product.sku))
    .map((product) => productSummary(product, { fileName: filesBySku.get(product.sku) }));

  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    apply,
    totals: {
      products: priceList2026Products.length,
      matched: matched.length,
      unmatched: unmatched.length,
      needsReview: needsReview.length,
      uniqueImages: uniqueFiles.length,
    },
    unmatched,
    needsReview,
    matched,
  };
  const reportPath = await writeJson('image-assignment-report.json', report);
  console.log(JSON.stringify({ reportPath, ...report.totals }, null, 2));

  if (!apply) {
    console.log('Проверочный прогон завершён. Для записи повторите команду с --apply.');
  } else {
    backup = matched.map(({ sku }) => {
      const document = databaseProductsBySku.get(sku);
      const data = document.data();
      return {
        id: document.id,
        sku,
        mainImage: data.mainImage,
        mainImagePath: data.mainImagePath,
        images: data.images,
        updatedAt: data.updatedAt,
      };
    });
    const backupPath = await writeJson(`firestore-image-backup-${Date.now()}.json`, backup);

    const prepared = [];
    for (const fileName of uniqueFiles) prepared.push(await prepareImage(fileName));
    for (const image of prepared) uploaded.push(await uploadPreparedImage(image));
    const uploadsByFileName = new Map(uploaded.map((image) => [image.fileName, image]));

    const updatedAt = new Date().toISOString();
    const operations = matched.map(({ sku, fileName }) => {
      const image = uploadsByFileName.get(fileName);
      return {
        ref: databaseProductsBySku.get(sku).ref,
        data: {
          mainImage: image.url,
          mainImagePath: image.destination,
          images: [image.url],
          updatedAt,
        },
      };
    });
    await commitInChunks(operations);
    databaseUpdated = true;

    const verification = await db.collection('products').get();
    const verifiedBySku = new Map(verification.docs.map((document) => [document.data().sku, document.data()]));
    const invalid = matched.filter(({ sku, fileName }) => {
      const expected = uploadsByFileName.get(fileName);
      const actual = verifiedBySku.get(sku);
      return actual?.mainImage !== expected.url || actual?.mainImagePath !== expected.destination || actual?.images?.[0] !== expected.url;
    });
    if (invalid.length) throw new Error(`После записи не прошли проверку SKU: ${invalid.map(({ sku }) => sku).join(', ')}`);

    console.log(JSON.stringify({
      success: true,
      updatedProducts: matched.length,
      uploadedUniqueImages: uploaded.filter((image) => image.created).length,
      reusedUniqueImages: uploaded.filter((image) => !image.created).length,
      backupPath,
      reportPath,
    }, null, 2));
  }
} catch (error) {
  if (databaseUpdated && backup.length) {
    const rollbackOperations = backup.map((record) => ({
      ref: db.collection('products').doc(record.id),
      data: {
        mainImage: restoreValue(record, 'mainImage'),
        mainImagePath: restoreValue(record, 'mainImagePath'),
        images: restoreValue(record, 'images'),
        updatedAt: restoreValue(record, 'updatedAt'),
      },
    }));
    await commitInChunks(rollbackOperations);
  }
  for (const image of uploaded.filter((entry) => entry.created)) {
    await bucket.file(image.destination).delete({ ignoreNotFound: true }).catch(() => undefined);
  }
  throw error;
} finally {
  await deleteApp(app);
}
