import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

const PROJECT_ID = 'stamply-4df8a';
const BUCKET_NAME = 'stamply-4df8a.firebasestorage.app';
const STORAGE_PREFIX = 'media/products/generated-produce-2026-08-29';
const SOURCE_DIR = path.resolve('public/catalog/generated-products/new-produce-2026-08-29');
const REPORT_DIR = path.resolve('outputs/produce-images-new-2026-08-29');
const BACKUP_PATH = '/tmp/sanpack-new-produce-images-backup-2026-08-29.json';
const apply = process.argv.includes('--apply');

const productIds = [
  ...Array.from({ length: 21 }, (_, index) => `price-2026-fr-${String(index + 23).padStart(3, '0')}`),
  ...Array.from({ length: 5 }, (_, index) => `price-2026-br-${String(index + 8).padStart(3, '0')}`),
  ...Array.from({ length: 31 }, (_, index) => `price-2026-vg-${String(index + 14).padStart(3, '0')}`),
];

function backupField(data, key) {
  return Object.prototype.hasOwnProperty.call(data, key)
    ? { exists: true, value: data[key] }
    : { exists: false };
}

function restoreField(field) {
  return field.exists ? field.value : FieldValue.delete();
}

function publicUrl(destination, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET_NAME)}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
}

async function verifyPublicUrl(url) {
  const response = await fetch(url, {
    headers: { range: 'bytes=0-0' },
    signal: AbortSignal.timeout(30_000),
  });
  await response.body?.cancel();
  return response.ok && response.headers.get('content-type') === 'image/webp';
}

if ((process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) !== PROJECT_ID) {
  throw new Error(`Set GOOGLE_CLOUD_PROJECT=${PROJECT_ID} before running this script.`);
}

const app = initializeApp(
  { credential: applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET_NAME },
  `publish-new-produce-images-${Date.now()}`,
);
const db = getFirestore(app);
const bucket = getStorage(app).bucket(BUCKET_NAME);
const uploadedPaths = [];
let backup = [];
let firestoreCommitted = false;

try {
  const snapshots = await db.getAll(...productIds.map((id) => db.doc(`products/${id}`)));
  const missing = snapshots.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.id);
  if (missing.length) throw new Error(`Missing products: ${missing.join(', ')}`);

  const products = snapshots.map((snapshot) => ({ ref: snapshot.ref, data: snapshot.data() }));
  const occupied = products.filter(({ data }) => (
    data.mainImage || data.mainImagePath || (Array.isArray(data.images) && data.images.length)
  ));
  if (occupied.length) {
    throw new Error(`Refusing to overwrite existing product images: ${occupied.map(({ ref }) => ref.id).join(', ')}`);
  }

  const prepared = [];
  for (const id of productIds) {
    const fileName = `${id}-v1.webp`;
    const localPath = path.join(SOURCE_DIR, fileName);
    const buffer = await readFile(localPath);
    const metadata = await sharp(buffer).metadata();
    if (metadata.format !== 'webp' || metadata.width !== 1200 || metadata.height !== 1200) {
      throw new Error(`${fileName} must be a 1200x1200 WebP image.`);
    }
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 20);
    const destination = `${STORAGE_PREFIX}/${id}-v1-${hash}.webp`;
    prepared.push({ id, localPath, buffer, destination });
  }

  console.log(JSON.stringify({ projectId: PROJECT_ID, bucket: BUCKET_NAME, apply, products: prepared.length }, null, 2));
  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to upload and update Firestore.');
  } else {
    backup = products.map(({ ref, data }) => ({
      id: ref.id,
      titleRu: data.titleRu,
      mainImage: backupField(data, 'mainImage'),
      mainImagePath: backupField(data, 'mainImagePath'),
      images: backupField(data, 'images'),
      imagePaths: backupField(data, 'imagePaths'),
      updatedAt: backupField(data, 'updatedAt'),
      updatedBy: backupField(data, 'updatedBy'),
    }));
    await writeFile(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`, { mode: 0o600 });

    const uploads = [];
    for (const [index, image] of prepared.entries()) {
      const [alreadyExists] = await bucket.file(image.destination).exists();
      if (alreadyExists) throw new Error(`Storage object already exists: ${image.destination}`);
      const token = randomUUID();
      await bucket.file(image.destination).save(image.buffer, {
        resumable: false,
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public,max-age=31536000,immutable',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      uploadedPaths.push(image.destination);
      uploads.push({ ...image, url: publicUrl(image.destination, token) });
      console.log(`[upload ${index + 1}/${prepared.length}] ${image.id}`);
    }

    const batch = db.batch();
    for (const upload of uploads) {
      batch.update(db.doc(`products/${upload.id}`), {
        mainImage: upload.url,
        mainImagePath: upload.destination,
        images: [upload.url],
        imagePaths: [upload.destination],
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'new-produce-images-2026-08-29',
      });
    }
    await batch.commit();
    firestoreCommitted = true;

    const verification = await db.getAll(...productIds.map((id) => db.doc(`products/${id}`)));
    const firestoreFailures = verification.filter((snapshot, index) => {
      const data = snapshot.data();
      const expected = uploads[index];
      return !snapshot.exists
        || data.mainImage !== expected.url
        || data.mainImagePath !== expected.destination
        || data.images?.[0] !== expected.url
        || data.imagePaths?.[0] !== expected.destination;
    });

    const urlChecks = await Promise.all(uploads.map(({ url }) => verifyPublicUrl(url)));
    const inaccessible = uploads.filter((_, index) => !urlChecks[index]);
    if (firestoreFailures.length || inaccessible.length) {
      throw new Error(`Verification failed: firestore=${firestoreFailures.length}, publicUrls=${inaccessible.length}.`);
    }

    await mkdir(REPORT_DIR, { recursive: true });
    const reportPath = path.join(REPORT_DIR, 'publish-report.json');
    await writeFile(reportPath, `${JSON.stringify({
      publishedAt: new Date().toISOString(),
      projectId: PROJECT_ID,
      bucket: BUCKET_NAME,
      products: uploads.map(({ id, localPath, destination, url }) => ({ id, localPath, destination, url })),
      publicUrlsVerified: urlChecks.filter(Boolean).length,
      backupPath: BACKUP_PATH,
    }, null, 2)}\n`);
    console.log(JSON.stringify({ success: true, uploaded: uploads.length, firestoreUpdated: uploads.length, publicUrlsVerified: uploads.length, reportPath, backupPath: BACKUP_PATH }, null, 2));
  }
} catch (error) {
  if (firestoreCommitted && backup.length) {
    const rollback = db.batch();
    for (const item of backup) {
      rollback.update(db.doc(`products/${item.id}`), {
        mainImage: restoreField(item.mainImage),
        mainImagePath: restoreField(item.mainImagePath),
        images: restoreField(item.images),
        imagePaths: restoreField(item.imagePaths),
        updatedAt: restoreField(item.updatedAt),
        updatedBy: restoreField(item.updatedBy),
      });
    }
    await rollback.commit();
  }
  if (uploadedPaths.length) {
    await Promise.allSettled(uploadedPaths.map((destination) => bucket.file(destination).delete({ ignoreNotFound: true })));
  }
  throw error;
} finally {
  await deleteApp(app);
}
