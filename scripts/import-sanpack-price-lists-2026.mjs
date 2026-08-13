import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  priceList2026Attributes,
  priceList2026Categories,
  priceList2026Products,
} from '../lib/catalog/sanpackPriceLists2026.ts';

const EXPECTED_PROJECT = 'stamply-4df8a';
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const apply = process.argv.includes('--apply');

if (projectId !== EXPECTED_PROJECT) {
  throw new Error(`Импорт остановлен: ожидался проект ${EXPECTED_PROJECT}, получен ${projectId || 'не указан'}.`);
}

const app = initializeApp(
  { credential: applicationDefault(), projectId },
  'sanpack-price-list-import-2026',
);
const db = getFirestore(app);

const collections = {
  products: priceList2026Products,
  categories: priceList2026Categories,
  attributes: priceList2026Attributes,
};

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefined(entryValue)]),
    );
  }
  return value;
}

function validateProducts() {
  const errors = [];
  const ids = new Set();
  const skus = new Set();
  const slugs = new Set();
  const categoryIds = new Set(priceList2026Categories.map((category) => category.id));

  for (const product of priceList2026Products) {
    if (ids.has(product.id)) errors.push(`Повтор ID: ${product.id}`);
    if (skus.has(product.sku)) errors.push(`Повтор SKU: ${product.sku}`);
    if (slugs.has(product.slug)) errors.push(`Повтор slug: ${product.slug}`);
    if (!categoryIds.has(product.categoryId)) errors.push(`Нет категории ${product.categoryId}: ${product.sku}`);
    if (!Number.isInteger(product.price) || product.price <= 0) errors.push(`Некорректная цена: ${product.sku}`);
    if (!product.titleRu.trim()) errors.push(`Пустое название: ${product.sku}`);
    ids.add(product.id);
    skus.add(product.sku);
    slugs.add(product.slug);

    for (const variant of product.variants || []) {
      if (skus.has(variant.sku)) errors.push(`Повтор SKU варианта: ${variant.sku}`);
      if (!Number.isInteger(variant.price) || variant.price <= 0) errors.push(`Некорректная цена варианта: ${variant.sku}`);
      if (!variant.attributes?.weight) errors.push(`Не указан вес варианта: ${variant.sku}`);
      skus.add(variant.sku);
    }
  }

  if (errors.length) throw new Error(`Импорт не прошёл проверку:\n${errors.join('\n')}`);
}

async function countCollection(name) {
  const snapshot = await db.collection(name).count().get();
  return snapshot.data().count;
}

async function getCounts() {
  const [products, categories, attributes] = await Promise.all([
    countCollection('products'),
    countCollection('categories'),
    countCollection('attributes'),
  ]);
  return { products, categories, attributes };
}

async function replaceCollection(name, records) {
  const existing = await db.collection(name).get();
  const operations = [
    ...existing.docs.map((document) => ({ type: 'delete', ref: document.ref })),
    ...records.map((record) => ({
      type: 'set',
      ref: db.collection(name).doc(record.id),
      data: removeUndefined(record),
    })),
  ];

  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = db.batch();
    for (const operation of operations.slice(offset, offset + 400)) {
      if (operation.type === 'delete') batch.delete(operation.ref);
      else batch.set(operation.ref, operation.data);
    }
    await batch.commit();
  }
}

try {
  validateProducts();
  const before = await getCounts();
  const next = {
    products: priceList2026Products.length,
    categories: priceList2026Categories.length,
    attributes: priceList2026Attributes.length,
  };
  const totalPrice = priceList2026Products.reduce((sum, product) => sum + (product.price || 0), 0);

  console.log(JSON.stringify({ projectId, apply, before, next, totalPrice }, null, 2));

  if (!apply) {
    console.log('Контрольный прогон завершён. Для записи повторите команду с --apply.');
  } else {
    await replaceCollection('products', priceList2026Products);
    await replaceCollection('categories', priceList2026Categories);
    await replaceCollection('attributes', priceList2026Attributes);

    const after = await getCounts();
    if (after.products !== next.products || after.categories !== next.categories || after.attributes !== next.attributes) {
      throw new Error(`Контроль количества не пройден: ${JSON.stringify(after)}.`);
    }

    const productSnapshot = await db.collection('products').get();
    const invalidPrices = productSnapshot.docs.filter((document) => {
      const price = document.data().price;
      return !Number.isInteger(price) || price <= 0;
    });
    if (invalidPrices.length) throw new Error(`После записи найдено ${invalidPrices.length} некорректных цен.`);

    console.log(JSON.stringify({ success: true, after, invalidPrices: 0 }, null, 2));
  }
} finally {
  await deleteApp(app);
}
