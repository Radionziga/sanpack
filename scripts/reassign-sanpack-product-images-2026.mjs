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
const manifestFlagIndex = process.argv.indexOf('--manifest');
const manifestPath = manifestFlagIndex >= 0 ? process.argv[manifestFlagIndex + 1] : '';
if (manifestFlagIndex >= 0 && !manifestPath) throw new Error('После --manifest нужно указать путь к JSON-файлу.');
const manifest = manifestPath ? JSON.parse(await readFile(path.resolve(manifestPath), 'utf8')) : null;
const packageName = manifest?.packageName || 'catalog-products-2026-08';
if (!/^[a-z0-9][a-z0-9-]*$/.test(packageName)) throw new Error(`Недопустимое имя пакета: ${packageName}`);
const batchMode = Boolean(manifest);
const SOURCE_DIR = process.env.SANPACK_IMAGE_DIR || 'C:\\Users\\Радион\\Desktop\\ТОвары';
const OLD_PREFIX = 'media/products/catalog-v1-6/';
const NEW_PREFIX = `media/products/${packageName}/`;
const REPORT_DIR = batchMode
  ? path.resolve('tmp', 'product-image-batches', packageName)
  : path.resolve('tmp', 'new-product-images');
const OPTIMIZED_DIR = path.join(REPORT_DIR, 'optimized');
const apply = process.argv.includes('--apply');
const mappingOnly = process.argv.includes('--mapping-only');
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

const filesBySku = new Map();
const reviewsBySku = new Map();

function assign(fileName, skus, reviewReason = '') {
  for (const sku of skus) {
    if (filesBySku.has(sku)) throw new Error(`Повторное сопоставление SKU ${sku}.`);
    filesBySku.set(sku, fileName);
    if (reviewReason) reviewsBySku.set(sku, reviewReason);
  }
}

// Упаковка и расходные материалы: здесь используются изображения с читаемой маркировкой.
if (!manifest) {
assign('sanpack_trash_bag_roll_6.jpg', ['SP-TB-001']);
assign('sanpack_trash_bag_roll_3.jpg', ['SP-TB-002']);
assign('sanpack_trash_bag_roll_4.jpg', ['SP-TB-003']);
assign('sanpack_trash_bag_roll_1.jpg', ['SP-TB-005']);
assign('commercial_packaging_3.jpg', ['SP-TB-006']);
assign('sanpack_trash_bag_roll_2.jpg', ['SP-TB-007']);
assign('sanpack_trash_bag_roll_5.jpg', ['SP-TB-008']);
assign('commercial_packaging_4.jpg', ['SP-TO-001']);
assign('commercial_packaging_5.jpg', ['SP-TO-002']);
assign('commercial_packaging_9.jpg', ['SP-CB-001']);
assign('commercial_packaging_10.jpg', ['SP-CB-002']);
assign('commercial_packaging_8.jpg', ['SP-CB-003']);
assign('commercial_packaging_6.jpg', ['SP-CB-004']);
assign('commercial_packaging_7.jpg', ['SP-CB-005']);
assign('commercial_packaging_2.jpg', ['SP-FP-001', 'SP-FP-002'], 'Одно изображение стрейч-плёнки используется для двух размеров рулона.');
assign('commercial_packaging_1.jpg', ['SP-FP-003']);
assign('sanpack_trash_bag_roll_10.jpg', ['SP-GL-001']);
assign('ChatGPT Image 20 июл. 2026 г., 03_26_58.png', ['SP-GL-002', 'SP-GL-003'], 'Одно изображение жёлтых перчаток используется для обычного и утолщённого варианта.');
assign('commercial_packaging_11.jpg', ['SP-GL-004']);
assign('ChatGPT Image 5 авг. 2026 г., 22_30_51 (1).png', ['SP-CL-003'], 'Проверьте соответствие упаковки позиции «Цветная тряпка для столов».');

// Бумажная продукция. Неоднозначные виды сложения вынесены в ручную проверку.
assign('ChatGPT Image 5 авг. 2026 г., 22_03_39.png', ['SP-PG-001']);
assign('ChatGPT Image 5 авг. 2026 г., 21_53_02.png', ['SP-PG-002', 'SP-PG-003'], 'Одна фотография диспенсерных салфеток используется для V- и Z-сложения; проверьте упаковку.');
assign('ChatGPT Image 5 авг. 2026 г., 21_55_46.png', ['SP-PG-004'], 'Проверьте количество салфеток на упаковке.');
assign('ChatGPT Image 5 авг. 2026 г., 22_11_54.png', ['SP-PG-005']);
assign('ChatGPT Image 5 авг. 2026 г., 22_16_52 (2).png', ['SP-PG-006']);

// Для групп мяса и курицы заказчик разрешил временно использовать одно групповое фото.
assign('ChatGPT Image 21 июл. 2026 г., 20_08_15 (2).png', [
  'SP-BF-001', 'SP-BF-002', 'SP-BF-003', 'SP-BF-004', 'SP-BF-005', 'SP-BF-006',
  'SP-BF-007', 'SP-BF-008', 'SP-BF-009', 'SP-BF-010', 'SP-BF-011', 'SP-BF-012',
], 'Временно используется общее фото говядины; позже желательно снять отдельные отрубы.');
assign('ChatGPT Image 21 июл. 2026 г., 20_08_15 (1).png', [
  'SP-CH-001', 'SP-CH-002', 'SP-CH-003', 'SP-CH-004', 'SP-CH-005', 'SP-CH-006',
  'SP-CH-007', 'SP-CH-008', 'SP-CH-009',
], 'Временно используется общее фото целой курицы; позже желательно снять отдельные части.');

// Бакалея.
assign('ChatGPT Image 21 июл. 2026 г., 19_21_01 (2).png', ['SP-FL-001', 'SP-FL-002', 'SP-FL-003', 'SP-FL-004'], 'Одно фото муки Dani Nan используется для обоих сортов и двух весов.');
assign('ChatGPT Image 21 июл. 2026 г., 19_29_34 (3).png', ['SP-FL-005', 'SP-FL-006'], 'Одно фото муки Altyn Nan используется для двух сортов.');
assign('ChatGPT Image 21 июл. 2026 г., 19_21_00 (1).png', ['SP-FL-007', 'SP-FL-008'], 'Одно фото муки Mutabar используется для двух сортов.');
assign('ChatGPT Image 21 июл. 2026 г., 19_29_34 (2).png', ['SP-SG-001']);
assign('ChatGPT Image 21 июл. 2026 г., 19_06_49 (1).png', ['SP-GR-001']);
assign('ChatGPT Image 21 июл. 2026 г., 19_06_49 (2).png', ['SP-GR-002']);
assign('ChatGPT Image 21 июл. 2026 г., 19_09_15 (2).png', ['SP-GR-003']);
assign('ChatGPT Image 21 июл. 2026 г., 19_09_15 (3).png', ['SP-GR-004']);
assign('ChatGPT Image 21 июл. 2026 г., 19_09_15 (1).png', ['SP-GR-005']);
assign('ChatGPT Image 21 июл. 2026 г., 19_06_49 (3).png', ['SP-GR-006']);
assign('ChatGPT Image 21 июл. 2026 г., 19_29_34 (1).png', ['SP-OI-001']);

// Зелень — только уверенно распознанные позиции.
assign('ChatGPT Image 12 авг. 2026 г., 23_06_58 (1).png', ['SP-GN-012']);
assign('ChatGPT Image 20 июл. 2026 г., 17_13_18 (10).png', ['SP-GN-013']);
assign('ChatGPT Image 20 июл. 2026 г., 17_17_34 (2).png', ['SP-GN-016']);
assign('ChatGPT Image 20 июл. 2026 г., 17_17_58 (4).png', ['SP-GN-018']);
assign('ChatGPT Image 20 июл. 2026 г., 17_17_32 (1).png', ['SP-GN-020']);
assign('ChatGPT Image 20 июл. 2026 г., 17_17_57 (3).png', ['SP-GN-022', 'SP-GN-024'], 'Одно фото петрушки используется для двух товарных позиций.');
assign('ChatGPT Image 12 авг. 2026 г., 23_06_58 (2).png', ['SP-GN-025']);
assign('ChatGPT Image 20 июл. 2026 г., 17_12_49 (1).png', ['SP-GN-026']);
assign('ChatGPT Image 12 авг. 2026 г., 23_06_58 (3).png', ['SP-GN-028']);

// Микрозелень.
assign('ChatGPT Image 20 июл. 2026 г., 17_12_59 (5).png', ['SP-MG-001']);
assign('ChatGPT Image 20 июл. 2026 г., 17_13_18 (9).png', ['SP-MG-002']);
assign('ChatGPT Image 20 июл. 2026 г., 17_12_59 (6).png', ['SP-MG-003'], 'Проверьте, что на фото именно микрозелень гороха.');
assign('ChatGPT Image 20 июл. 2026 г., 17_13_16 (8).png', ['SP-MG-004']);
assign('ChatGPT Image 12 авг. 2026 г., 23_06_59 (4).png', ['SP-MG-005'], 'Проверьте, что на фото именно микрозелень дайкона.');
assign('ChatGPT Image 20 июл. 2026 г., 17_12_56 (3).png', ['SP-MG-006', 'SP-MG-009'], 'Одно фото редиса используется для красного редиса и редиса.');
assign('ChatGPT Image 20 июл. 2026 г., 17_13_01 (7).png', ['SP-MG-007']);
assign('ChatGPT Image 12 авг. 2026 г., 23_06_59 (5).png', ['SP-MG-008'], 'Проверьте, что на фото именно микрозелень латука.');
assign('ChatGPT Image 12 авг. 2026 г., 23_07_00 (7).png', ['SP-MG-010'], 'Проверьте, что на фото именно микрозелень рукколы.');
assign('ChatGPT Image 12 авг. 2026 г., 23_06_59 (6).png', ['SP-MG-011']);
assign('ChatGPT Image 20 июл. 2026 г., 17_12_57 (4).png', ['SP-MG-012'], 'Проверьте, что на фото именно микрозелень щавеля.');

// Молочная продукция: несовпадающие веса и продукты намеренно пропущены.
assign('product-11.jpg', ['SP-DA-001']);
assign('product-2.jpg', ['SP-DA-002']);
assign('product-1.jpg', ['SP-DA-003']);
assign('product-8.jpg', ['SP-DA-006']);
assign('product-17.jpg', ['SP-DA-007']);
assign('product-7.jpg', ['SP-DA-008']);
assign('product-4.jpg', ['SP-DA-009']);
assign('product-13.jpg', ['SP-DA-010']);
assign('product-10.jpg', ['SP-DA-013']);
} else {
  if (!Array.isArray(manifest.mappings) || manifest.mappings.length === 0) {
    throw new Error('Manifest должен содержать непустой массив mappings.');
  }
  for (const mapping of manifest.mappings) {
    if (!mapping?.fileName || !Array.isArray(mapping.skus) || mapping.skus.length === 0) {
      throw new Error('Каждое сопоставление manifest должно содержать fileName и непустой массив skus.');
    }
    assign(mapping.fileName, mapping.skus, mapping.reviewReason || '');
  }
}

const productsBySku = new Map(priceList2026Products.map((product) => [product.sku, product]));
const unknownSkus = [...filesBySku.keys()].filter((sku) => !productsBySku.has(sku));
if (unknownSkus.length) throw new Error(`В карте есть неизвестные SKU: ${unknownSkus.join(', ')}`);

const targetProducts = batchMode
  ? priceList2026Products.filter((product) => filesBySku.has(product.sku))
  : priceList2026Products;

function summary(product, extra = {}) {
  return { sku: product.sku, title: product.titleRu, ...extra };
}

function reportData(uniqueFiles) {
  const matched = targetProducts.map((product) => summary(product, { fileName: filesBySku.get(product.sku) }));
  const unmatched = batchMode
    ? (manifest.skipped || [])
    : priceList2026Products.filter((product) => !filesBySku.has(product.sku)).map((product) => summary(product));
  const mappedReviews = targetProducts
    .filter((product) => reviewsBySku.has(product.sku))
    .map((product) => summary(product, { fileName: filesBySku.get(product.sku), reason: reviewsBySku.get(product.sku) }));
  const needsReview = [...mappedReviews, ...(manifest?.needsReview || [])];
  return {
    matched,
    unmatched,
    needsReview,
    totals: {
      products: batchMode ? targetProducts.length : priceList2026Products.length,
      matched: matched.length,
      unmatched: unmatched.length,
      needsReview: needsReview.length,
      uniqueImages: uniqueFiles.length,
    },
  };
}

if (mappingOnly) {
  console.log(JSON.stringify(reportData([...new Set(filesBySku.values())]), null, 2));
  process.exit(0);
}

if (projectId !== EXPECTED_PROJECT) throw new Error(`Ожидался проект ${EXPECTED_PROJECT}, получен ${projectId || 'не указан'}.`);

const app = initializeApp({ credential: applicationDefault(), projectId, storageBucket: EXPECTED_BUCKET }, 'sanpack-product-images-reassignment-2026');
const db = getFirestore(app);
const bucket = getStorage(app).bucket(EXPECTED_BUCKET);

async function saveJson(fileName, value) {
  await mkdir(REPORT_DIR, { recursive: true });
  const target = path.join(REPORT_DIR, fileName);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return target;
}

async function validateFiles() {
  const uniqueFiles = [...new Set(filesBySku.values())];
  const missing = [];
  const invalid = [];
  const inspections = [];
  for (const fileName of uniqueFiles) {
    try {
      const source = await readFile(path.join(SOURCE_DIR, fileName));
      const metadata = await sharp(source).metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || !metadata.width || !metadata.height) {
        invalid.push(`${fileName}: неподдерживаемый формат или отсутствуют размеры`);
        continue;
      }
      const { data, info } = await sharp(source)
        .flatten({ background: '#ffffff' })
        .resize(64, 64, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let borderPixels = 0;
      let nearWhitePixels = 0;
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          if (x !== 0 && y !== 0 && x !== info.width - 1 && y !== info.height - 1) continue;
          borderPixels += 1;
          const offset = (y * info.width + x) * info.channels;
          if (data[offset] >= 245 && data[offset + 1] >= 245 && data[offset + 2] >= 245) nearWhitePixels += 1;
        }
      }
      const whiteBorderRatio = Number((nearWhitePixels / borderPixels).toFixed(3));
      inspections.push({ fileName, format: metadata.format, width: metadata.width, height: metadata.height, whiteBorderRatio });
      if (whiteBorderRatio < 0.9) invalid.push(`${fileName}: фон по краям не является белым (${whiteBorderRatio})`);
    } catch {
      missing.push(fileName);
    }
  }
  if (missing.length) throw new Error(`Не найдены исходные изображения: ${missing.join(', ')}`);
  if (invalid.length) throw new Error(`Проверку изображений не прошли: ${invalid.join('; ')}`);
  return { uniqueFiles, inspections };
}

async function prepareImage(fileName, sku = '') {
  const source = await readFile(path.join(SOURCE_DIR, fileName));
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 24);
  const outputName = batchMode ? sku.toLowerCase() : hash;
  const destination = `${NEW_PREFIX}${outputName}.webp`;
  const localPath = path.join(OPTIMIZED_DIR, `${outputName}.webp`);
  await mkdir(OPTIMIZED_DIR, { recursive: true });
  await sharp(source)
    .rotate()
    .resize(1400, 1400, { fit: 'contain', position: 'centre', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 90, effort: 5, smartSubsample: true })
    .toFile(localPath);
  const optimized = await readFile(localPath);
  return { fileName, sku, destination, localPath, sha256: createHash('sha256').update(optimized).digest('hex') };
}

async function uploadImage(image) {
  const storageFile = bucket.file(image.destination);
  const [exists] = await storageFile.exists();
  let created = false;
  let token;
  if (exists) {
    if (batchMode) {
      const [remote] = await storageFile.download();
      const remoteSha256 = createHash('sha256').update(remote).digest('hex');
      if (remoteSha256 !== image.sha256) {
        throw new Error(`Storage уже содержит другой файл по детерминированному пути ${image.destination}.`);
      }
    }
    const [metadata] = await storageFile.getMetadata();
    token = metadata.metadata?.firebaseStorageDownloadTokens?.split(',')[0];
  }
  if (!token) {
    token = randomUUID();
    if (exists) await storageFile.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  }
  if (!exists) {
    await bucket.upload(image.localPath, { destination: image.destination, resumable: false, metadata: { contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable', metadata: { firebaseStorageDownloadTokens: token } } });
    created = true;
  }
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(image.destination)}?alt=media&token=${token}`;
  return { ...image, url, created };
}

async function commitInChunks(operations) {
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = db.batch();
    for (const operation of operations.slice(offset, offset + 400)) batch.update(operation.ref, operation.data);
    await batch.commit();
  }
}

function restore(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : FieldValue.delete();
}

let uploaded = [];
let backup = [];
let databaseUpdated = false;

try {
  const { uniqueFiles, inspections } = await validateFiles();
  const snapshot = await db.collection('products').get();
  const documentsBySku = new Map(snapshot.docs.map((doc) => [doc.data().sku, doc]));
  const missingSkus = [...productsBySku.keys()].filter((sku) => !documentsBySku.has(sku));
  const extraSkus = [...documentsBySku.keys()].filter((sku) => !productsBySku.has(sku));
  if (snapshot.size !== priceList2026Products.length || missingSkus.length || extraSkus.length) {
    throw new Error(`Каталог изменился: в базе ${snapshot.size}, ожидалось ${priceList2026Products.length}; нет: ${missingSkus.join(', ') || '—'}; лишние: ${extraSkus.join(', ') || '—'}.`);
  }

  const currentTargetState = [];
  if (batchMode) {
    for (const product of targetProducts) {
      const document = documentsBySku.get(product.sku).data();
      const expectedPath = `${NEW_PREFIX}${product.sku.toLowerCase()}.webp`;
      const [storageExists] = await bucket.file(expectedPath).exists();
      currentTargetState.push({
        sku: product.sku,
        title: product.titleRu,
        expectedPath,
        firestoreVerified: document.mainImagePath === expectedPath
          && Boolean(document.mainImage)
          && document.images?.[0] === document.mainImage,
        storageVerified: storageExists,
      });
    }
  }
  const missingImageProducts = snapshot.docs
    .map((document) => document.data())
    .filter((product) => !product.mainImage || !product.mainImagePath || !Array.isArray(product.images) || product.images.length === 0)
    .map((product) => summary(productsBySku.get(product.sku) || { sku: product.sku, titleRu: product.titleRu || product.title?.ru || '' }))
    .sort((left, right) => left.sku.localeCompare(right.sku));

  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    apply,
    batchMode,
    manifestPath: manifestPath ? path.resolve(manifestPath) : null,
    sourceDirectory: SOURCE_DIR,
    oldPrefix: OLD_PREFIX,
    newPrefix: NEW_PREFIX,
    inspections,
    currentTargetState,
    missingImageProducts,
    ...reportData(uniqueFiles),
  };
  const reportPath = await saveJson('replacement-report.json', report);
  console.log(JSON.stringify({ reportPath, ...report.totals }, null, 2));
  if (!apply) {
    console.log('Проверочный прогон завершён. Для применения добавьте --apply.');
  } else {
    backup = targetProducts.map(({ sku }) => {
      const doc = documentsBySku.get(sku);
      const data = doc.data();
      return { id: doc.id, sku, mainImage: data.mainImage, mainImagePath: data.mainImagePath, images: data.images, updatedAt: data.updatedAt };
    });
    const backupPath = await saveJson(`replacement-backup-${Date.now()}.json`, backup);

    const prepared = [];
    if (batchMode) {
      for (const { sku } of targetProducts) prepared.push(await prepareImage(filesBySku.get(sku), sku));
    } else {
      for (const fileName of uniqueFiles) prepared.push(await prepareImage(fileName));
    }
    for (const image of prepared) uploaded.push(await uploadImage(image));
    const uploadsByKey = new Map(uploaded.map((entry) => [batchMode ? entry.sku : entry.fileName, entry]));
    const updatedAt = new Date().toISOString();
    const operations = targetProducts.map(({ sku }) => {
      const fileName = filesBySku.get(sku);
      if (!fileName) return { ref: documentsBySku.get(sku).ref, data: { mainImage: FieldValue.delete(), mainImagePath: FieldValue.delete(), images: [], updatedAt } };
      const image = uploadsByKey.get(batchMode ? sku : fileName);
      return { ref: documentsBySku.get(sku).ref, data: { mainImage: image.url, mainImagePath: image.destination, images: [image.url], updatedAt } };
    });
    await commitInChunks(operations);
    databaseUpdated = true;

    const verified = await db.collection('products').get();
    const verifiedBySku = new Map(verified.docs.map((doc) => [doc.data().sku, doc.data()]));
    const invalid = targetProducts.filter(({ sku }) => {
      const actual = verifiedBySku.get(sku);
      const fileName = filesBySku.get(sku);
      if (!fileName) return Boolean(actual?.mainImage || actual?.mainImagePath || (actual?.images?.length ?? 0));
      const expected = uploadsByKey.get(batchMode ? sku : fileName);
      return actual?.mainImage !== expected.url || actual?.mainImagePath !== expected.destination || actual?.images?.[0] !== expected.url;
    });
    if (invalid.length) throw new Error(`Проверку не прошли SKU: ${invalid.map((p) => p.sku).join(', ')}`);

    if (batchMode) {
      databaseUpdated = false;
      console.log(JSON.stringify({
        success: true,
        updatedProducts: operations.length,
        uploadedImages: uploaded.filter((entry) => entry.created).length,
        reusedImages: uploaded.filter((entry) => !entry.created).length,
        deletedOldImages: 0,
        backupPath,
        reportPath,
        verifiedSkus: targetProducts.map((product) => product.sku),
      }, null, 2));
    } else {
    // The new links are already verified at this point. Cleanup is best-effort:
    // a transient Storage error must not roll the database back to files that
    // may already have been removed during the same cleanup pass.
    databaseUpdated = false;
    const cleanupErrors = [];
    const [oldObjects] = await bucket.getFiles({ prefix: OLD_PREFIX });
    let deletedOldImages = 0;
    for (const oldObject of oldObjects) {
      try {
        await oldObject.delete({ ignoreNotFound: true });
        deletedOldImages += 1;
      } catch (error) {
        cleanupErrors.push({ object: oldObject.name, message: error instanceof Error ? error.message : String(error) });
      }
    }

    const desiredDestinations = new Set(uploaded.map((entry) => entry.destination));
    const [newObjects] = await bucket.getFiles({ prefix: NEW_PREFIX });
    let deletedOrphans = 0;
    for (const object of newObjects) {
      if (!desiredDestinations.has(object.name)) {
        try {
          await object.delete({ ignoreNotFound: true });
          deletedOrphans += 1;
        } catch (error) {
          cleanupErrors.push({ object: object.name, message: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    console.log(JSON.stringify({ success: true, updatedProducts: operations.length, matchedProducts: filesBySku.size, clearedProducts: priceList2026Products.length - filesBySku.size, uploadedUniqueImages: uploaded.filter((entry) => entry.created).length, reusedUniqueImages: uploaded.filter((entry) => !entry.created).length, deletedOldImages, deletedOrphans, cleanupErrors, backupPath, reportPath }, null, 2));
    }
  }
} catch (error) {
  if (databaseUpdated && backup.length) {
    await commitInChunks(backup.map((record) => ({ ref: db.collection('products').doc(record.id), data: { mainImage: restore(record, 'mainImage'), mainImagePath: restore(record, 'mainImagePath'), images: restore(record, 'images'), updatedAt: restore(record, 'updatedAt') } })));
  }
  for (const image of uploaded.filter((entry) => entry.created)) await bucket.file(image.destination).delete({ ignoreNotFound: true }).catch(() => undefined);
  throw error;
} finally {
  await deleteApp(app);
}
