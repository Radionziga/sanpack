import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

const PROJECT_ID = 'stamply-4df8a';
const BUCKET_NAME = 'stamply-4df8a.firebasestorage.app';
const CATEGORY_ID = 'cat-baking-ingredients';
const LOCAL_FILE = path.resolve('public/catalog/category-icons-v3/baking-ingredients.webp');
const STORAGE_PREFIX = 'media/catalog/category-navigation-fixes-2026-08-30';
const BACKUP_PATH = '/tmp/sanpack-baking-category-navigation-backup-2026-08-30.json';
const apply = process.argv.includes('--apply');

function publicUrl(destination, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET_NAME)}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME,
});
const db = getFirestore(app);
const bucket = getStorage(app).bucket(BUCKET_NAME);

let uploadedDestination = '';
let previousCategory = null;

try {
  const buffer = await readFile(LOCAL_FILE);
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== 'webp' || metadata.width !== 512 || metadata.height !== 512) {
    throw new Error('Navigation image must be a 512×512 WebP file.');
  }

  const categoryRef = db.doc(`categories/${CATEGORY_ID}`);
  const categorySnapshot = await categoryRef.get();
  if (!categorySnapshot.exists) throw new Error(`Missing category: ${CATEGORY_ID}`);
  previousCategory = categorySnapshot.data();

  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 20);
  const destination = `${STORAGE_PREFIX}/${CATEGORY_ID}-${hash}.webp`;
  const [alreadyExists] = await bucket.file(destination).exists();

  console.log(JSON.stringify({
    projectId: PROJECT_ID,
    apply,
    categoryId: CATEGORY_ID,
    localFile: LOCAL_FILE,
    destination,
    alreadyExists,
  }, null, 2));

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to publish.');
  } else {
    await writeFile(BACKUP_PATH, `${JSON.stringify(previousCategory, null, 2)}\n`, { mode: 0o600 });

    const token = randomUUID();
    if (!alreadyExists) {
      await bucket.file(destination).save(buffer, {
        resumable: false,
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public,max-age=31536000,immutable',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      uploadedDestination = destination;
    }

    const url = alreadyExists
      ? publicUrl(destination, (await bucket.file(destination).getMetadata())[0].metadata?.firebaseStorageDownloadTokens)
      : publicUrl(destination, token);

    await categoryRef.update({
      navigationImage: url,
      navigationImagePath: destination,
      updatedAt: new Date().toISOString(),
    });

    const [verification, response] = await Promise.all([
      categoryRef.get(),
      fetch(url, { method: 'HEAD' }),
    ]);
    if (verification.data()?.navigationImagePath !== destination || !response.ok) {
      throw new Error('Published navigation image verification failed.');
    }

    console.log(JSON.stringify({
      success: true,
      categoryId: CATEGORY_ID,
      navigationImagePath: destination,
      publicImageVerified: true,
      backupPath: BACKUP_PATH,
    }, null, 2));
  }
} catch (error) {
  if (apply && previousCategory) {
    await db.doc(`categories/${CATEGORY_ID}`).set(previousCategory);
  }
  if (uploadedDestination) {
    await bucket.file(uploadedDestination).delete({ ignoreNotFound: true });
  }
  throw error;
} finally {
  await deleteApp(app);
}
