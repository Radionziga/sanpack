import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const EXPECTED_PROJECT = 'stamply-4df8a';
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apply = process.argv.includes('--apply');
const confirmedProject = process.argv.find((argument) => argument.startsWith('--project='))?.split('=')[1];

if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.');
if (projectId !== EXPECTED_PROJECT) throw new Error(`Refusing unexpected Firebase project: ${projectId}.`);
if (apply && confirmedProject !== EXPECTED_PROJECT) {
  throw new Error(`Applying requires an explicit --project=${EXPECTED_PROJECT} confirmation.`);
}

const app = initializeApp(
  { credential: applicationDefault(), projectId },
  `sanpack-catalog-migration-${Date.now()}`,
);
const database = getFirestore(app);

function definedEntries(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

try {
  const [categorySnapshot, attributeSnapshot, productSnapshot] = await Promise.all([
    database.collection('categories').get(),
    database.collection('attributes').get(),
    database.collection('products').get(),
  ]);
  const categories = new Map(
    categorySnapshot.docs.map((document) => [document.id, { id: document.id, ...document.data() }]),
  );
  const operations = [];

  for (const document of categorySnapshot.docs) {
    const category = document.data();
    const patch = definedEntries({
      navigationImage: category.navigationImage || category.image,
      navigationImagePath: category.navigationImagePath || category.imagePath,
      cardImage: category.cardImage || category.banner || category.image,
      cardImagePath: category.cardImagePath || category.imagePath,
    });
    const missing = Object.fromEntries(Object.entries(patch).filter(([key]) => !category[key]));
    if (Object.keys(missing).length) operations.push({ collection: 'categories', id: document.id, patch: missing });
  }

  for (const document of attributeSnapshot.docs) {
    const attribute = document.data();
    const patch = definedEntries({
      required: attribute.required ?? false,
      filterable: attribute.filterable ?? false,
      cardVisible: attribute.cardVisible ?? false,
      productVisible: attribute.productVisible ?? true,
      categoryIds: attribute.categoryIds ?? [],
      sortOrder: attribute.sortOrder ?? 0,
    });
    const missing = Object.fromEntries(Object.entries(patch).filter(([key]) => attribute[key] === undefined));
    if (Object.keys(missing).length) operations.push({ collection: 'attributes', id: document.id, patch: missing });
  }

  for (const document of productSnapshot.docs) {
    const product = document.data();
    const category = categories.get(product.categoryId);
    if (category?.slug && product.categorySlug !== category.slug) {
      operations.push({ collection: 'products', id: document.id, patch: { categorySlug: category.slug } });
    }
  }

  const counts = operations.reduce((result, operation) => {
    result[operation.collection] = (result[operation.collection] || 0) + 1;
    return result;
  }, {});
  console.log(apply ? 'APPLY MODE' : 'DRY RUN (default)');
  console.log(`Project: ${projectId}`);
  console.log(`Planned document patches: ${operations.length}`);
  for (const [collection, count] of Object.entries(counts)) console.log(`- ${collection}: ${count}`);

  if (!apply) {
    console.log(`No documents were written. To apply deterministic backfills, add --apply --project=${EXPECTED_PROJECT}.`);
  } else {
    for (let offset = 0; offset < operations.length; offset += 400) {
      const batch = database.batch();
      for (const operation of operations.slice(offset, offset + 400)) {
        batch.update(database.collection(operation.collection).doc(operation.id), operation.patch);
      }
      await batch.commit();
    }
    console.log(`Applied ${operations.length} deterministic patches. No documents were deleted.`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('invalid_rapt') || message.includes('invalid_grant')) {
    console.error('Migration preview could not authenticate: Application Default Credentials require reauthentication. Run npm run firebase:login, then retry.');
  } else {
    console.error(`Catalog migration failed: ${message}`);
  }
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
