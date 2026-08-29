import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const EXPECTED_PROJECT = 'stamply-4df8a';
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required.');
if (projectId !== EXPECTED_PROJECT) {
  throw new Error(`Refusing to inspect unexpected Firebase project: ${projectId}.`);
}

const app = initializeApp(
  { credential: applicationDefault(), projectId },
  `sanpack-catalog-audit-${Date.now()}`,
);
const database = getFirestore(app);

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function countMissing(records, predicate) {
  return records.reduce((count, record) => count + (predicate(record) ? 0 : 1), 0);
}

function printSection(title, values) {
  console.log(`\n${title}`);
  for (const [label, value] of Object.entries(values)) console.log(`- ${label}: ${value}`);
}

try {
  const [categorySnapshot, attributeSnapshot, productSnapshot] = await Promise.all([
    database.collection('categories').get(),
    database.collection('attributes').get(),
    database.collection('products').get(),
  ]);
  const categories = categorySnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  const attributes = attributeSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  const products = productSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  const categoryIds = new Set(categories.map((category) => category.id));
  const groups = categories.filter((category) => !category.parentId);
  const leaves = categories.filter((category) => category.parentId);
  const attributeKeys = new Set(attributes.map((attribute) => attribute.key));

  printSection('Firestore catalog CMS audit (read-only)', {
    project: projectId,
    groups: groups.length,
    categories: leaves.length,
    attributes: attributes.length,
    products: products.length,
  });
  printSection('Category integrity', {
    'missing parent group': leaves.filter((category) => !categoryIds.has(category.parentId)).length,
    'missing navigation image': countMissing(leaves, (category) => hasValue(category.navigationImage) || hasValue(category.image)),
    'missing bento/card image': countMissing(leaves, (category) => hasValue(category.cardImage) || hasValue(category.banner) || hasValue(category.image)),
    'missing ZH title': countMissing(categories, (category) => hasValue(category.titleZh)),
  });
  printSection('Attribute integrity', {
    'unknown category references': attributes.reduce(
      (count, attribute) => count + (attribute.categoryIds || []).filter((id) => !categoryIds.has(id)).length,
      0,
    ),
    'missing ZH title': countMissing(attributes, (attribute) => hasValue(attribute.titleZh)),
    'missing explicit sortOrder': countMissing(attributes, (attribute) => Number.isFinite(attribute.sortOrder)),
  });
  printSection('Product integrity', {
    'unknown/empty category': countMissing(products, (product) => categoryIds.has(product.categoryId)),
    'missing status': countMissing(products, (product) => hasValue(product.status)),
    'missing categorySlug': countMissing(products, (product) => hasValue(product.categorySlug)),
    'categorySlug drift': products.filter((product) => {
      const category = categories.find((candidate) => candidate.id === product.categoryId);
      return category && product.categorySlug !== category.slug;
    }).length,
    'missing ZH title': countMissing(products, (product) => hasValue(product.titleZh)),
    'unknown attribute values': products.reduce(
      (count, product) => count + Object.keys(product.attributes || {}).filter((key) => !attributeKeys.has(key)).length,
      0,
    ),
  });
  console.log('\nNo documents were written.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('invalid_rapt') || message.includes('invalid_grant')) {
    console.error('Firestore audit could not authenticate: Application Default Credentials require reauthentication. Run npm run firebase:login, then retry.');
  } else {
    console.error(`Firestore audit failed: ${message}`);
  }
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
