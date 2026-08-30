import { writeFile } from 'node:fs/promises';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'stamply-4df8a';
const BACKUP_PATH = '/tmp/sanpack-food-bento-categories-backup-2026-08-30.json';
const apply = process.argv.includes('--apply');

const featuredCategories = [
  ['cat-beef', 20],
  ['cat-chicken', 21],
  ['cat-groats', 25],
  ['cat-fruits', 27],
  ['cat-vegetables', 29],
  ['cat-greens', 30],
  ['cat-frozen-food', 31],
  ['cat-salt', 32],
  ['cat-baking-ingredients', 33],
  ['cat-tomato-sauces', 34],
];

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
});
const db = getFirestore(app);
let backups = [];

try {
  const refs = featuredCategories.map(([categoryId]) => db.doc(`categories/${categoryId}`));
  const snapshots = await db.getAll(...refs);
  const missing = snapshots.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.ref.id);
  if (missing.length > 0) throw new Error(`Missing categories: ${missing.join(', ')}`);

  backups = snapshots.map((snapshot) => ({ id: snapshot.id, data: snapshot.data() }));
  console.log(JSON.stringify({
    projectId: PROJECT_ID,
    apply,
    categories: featuredCategories.map(([id, featuredSortOrder]) => ({ id, featuredSortOrder })),
  }, null, 2));

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to restore the complete bento set.');
  } else {
    await writeFile(BACKUP_PATH, `${JSON.stringify(backups, null, 2)}\n`, { mode: 0o600 });
    const batch = db.batch();
    const updatedAt = new Date().toISOString();
    featuredCategories.forEach(([categoryId, featuredSortOrder]) => {
      batch.update(db.doc(`categories/${categoryId}`), {
        featured: true,
        featuredSortOrder,
        updatedAt,
      });
    });
    await batch.commit();

    const verification = await db.getAll(...refs);
    const invalid = verification.filter((snapshot, index) => {
      const data = snapshot.data();
      return data?.featured !== true || data?.featuredSortOrder !== featuredCategories[index][1];
    }).map((snapshot) => snapshot.id);
    if (invalid.length > 0) throw new Error(`Verification failed: ${invalid.join(', ')}`);

    console.log(JSON.stringify({
      success: true,
      updatedCategories: featuredCategories.length,
      backupPath: BACKUP_PATH,
    }, null, 2));
  }
} catch (error) {
  if (apply && backups.length > 0) {
    const rollback = db.batch();
    backups.forEach(({ id, data }) => rollback.set(db.doc(`categories/${id}`), data));
    await rollback.commit();
  }
  throw error;
} finally {
  await deleteApp(app);
}
