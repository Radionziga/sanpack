import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  catalogV14Attributes,
  catalogV14Categories,
  catalogV14Products,
} from '../lib/catalog/sanpackCatalogV14.ts';

const EXPECTED_PROJECT = 'stamply-4df8a';
const projectId = process.env.GOOGLE_CLOUD_PROJECT
  || process.env.GCLOUD_PROJECT
  || EXPECTED_PROJECT;
const apply = process.argv.includes('--apply');

if (projectId !== EXPECTED_PROJECT) {
  throw new Error(
    `Импорт разрешён только в проект ${EXPECTED_PROJECT}; получен ${projectId}.`,
  );
}

const app = initializeApp(
  { credential: applicationDefault(), projectId },
  'sanpack-catalog-import-v14',
);
const db = getFirestore(app);

const collections = {
  products: catalogV14Products,
  categories: catalogV14Categories,
  attributes: catalogV14Attributes,
};

function removeUndefinedValues(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefinedValues(entryValue)]),
    );
  }

  return value;
}

const currentCounts = Object.fromEntries(
  await Promise.all(
    Object.keys(collections).map(async (name) => {
      const snapshot = await db.collection(name).get();
      return [name, snapshot.size];
    }),
  ),
);

console.log(JSON.stringify({
  projectId,
  apply,
  currentCounts,
  nextCounts: {
    products: catalogV14Products.length,
    categories: catalogV14Categories.length,
    attributes: catalogV14Attributes.length,
  },
}, null, 2));

if (!apply) {
  console.log('Проверка завершена. Для записи повторите команду с --apply.');
  process.exit(0);
}

const batch = db.batch();
for (const [name, records] of Object.entries(collections)) {
  const existing = await db.collection(name).get();
  for (const document of existing.docs) {
    batch.delete(document.ref);
  }
  for (const record of records) {
    batch.set(db.collection(name).doc(record.id), removeUndefinedValues(record));
  }
}
await batch.commit();

const verifiedCounts = Object.fromEntries(
  await Promise.all(
    Object.keys(collections).map(async (name) => {
      const snapshot = await db.collection(name).get();
      return [name, snapshot.size];
    }),
  ),
);

console.log(JSON.stringify({ success: true, verifiedCounts }, null, 2));
