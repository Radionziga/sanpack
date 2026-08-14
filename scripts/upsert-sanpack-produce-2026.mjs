import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  priceList2026Categories,
  priceList2026Products,
} from '../lib/catalog/sanpackPriceLists2026.ts';

const EXPECTED_PROJECT = 'stamply-4df8a';
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const apply = process.argv.includes('--apply');
const TARGET_ID = /^price-2026-(?:fr|br|vg)-\d{3}$/;
const TARGET_CATEGORY_IDS = new Set(['cat-fruits', 'cat-berries', 'cat-vegetables']);

if (projectId !== EXPECTED_PROJECT) {
  throw new Error(`Операция остановлена: ожидался проект ${EXPECTED_PROJECT}, получен ${projectId || 'не указан'}.`);
}

const app = initializeApp(
  { credential: applicationDefault(), projectId },
  'sanpack-produce-upsert-2026',
);
const db = getFirestore(app);

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

function preserveMedia(nextProduct, existingProduct) {
  if (!existingProduct) return nextProduct;

  const existingImages = Array.isArray(existingProduct.images)
    ? existingProduct.images.filter(Boolean)
    : [];
  const existingMainImage =
    typeof existingProduct.mainImage === 'string' &&
    existingProduct.mainImage &&
    existingProduct.mainImage !== '/catalog/product-placeholder.svg'
      ? existingProduct.mainImage
      : null;

  if (!existingMainImage && existingImages.length === 0) return nextProduct;

  return {
    ...nextProduct,
    mainImage: existingMainImage || existingImages[0],
    mainImagePath: existingProduct.mainImagePath || nextProduct.mainImagePath,
    images: existingImages.length > 0 ? existingImages : [existingMainImage],
  };
}

async function countCollection(name) {
  const snapshot = await db.collection(name).count().get();
  return snapshot.data().count;
}

try {
  const products = priceList2026Products.filter((product) => TARGET_ID.test(product.id));
  const categories = priceList2026Categories.filter((category) => TARGET_CATEGORY_IDS.has(category.id));

  if (products.length !== 42) {
    throw new Error(`Ожидалось 42 позиции фруктов, ягод и овощей, получено ${products.length}.`);
  }

  const existingSnapshots = await Promise.all(
    products.map((product) => db.collection('products').doc(product.id).get()),
  );
  const existingById = new Map(
    existingSnapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => [snapshot.id, snapshot.data()]),
  );

  const created = products.filter((product) => !existingById.has(product.id));
  const updated = products.filter((product) => existingById.has(product.id));
  const preservedMedia = updated.filter((product) => {
    const existing = existingById.get(product.id);
    return Boolean(
      existing?.mainImage && existing.mainImage !== '/catalog/product-placeholder.svg',
    );
  });

  console.log(JSON.stringify({
    projectId,
    apply,
    products: products.length,
    categories: categories.map((category) => category.id),
    created: created.length,
    updated: updated.length,
    preservedMedia: preservedMedia.length,
    totalBefore: await countCollection('products'),
  }, null, 2));

  if (!apply) {
    console.log('Контрольный прогон завершён. Для записи повторите команду с --apply.');
  } else {
    const batch = db.batch();

    for (const category of categories) {
      batch.set(db.collection('categories').doc(category.id), removeUndefined(category), { merge: true });
    }

    for (const product of products) {
      const nextProduct = preserveMedia(product, existingById.get(product.id));
      batch.set(db.collection('products').doc(product.id), removeUndefined(nextProduct), { merge: true });
    }

    await batch.commit();

    const verification = await Promise.all(
      products.map((product) => db.collection('products').doc(product.id).get()),
    );
    const missing = verification.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.id);
    const wrongPrices = verification
      .filter((snapshot) => snapshot.exists)
      .filter((snapshot) => {
        const expected = products.find((product) => product.id === snapshot.id);
        return snapshot.data()?.price !== expected?.price;
      })
      .map((snapshot) => snapshot.id);

    if (missing.length || wrongPrices.length) {
      throw new Error(`Проверка записи не пройдена: missing=${missing.join(',')}; wrongPrices=${wrongPrices.join(',')}.`);
    }

    console.log(JSON.stringify({
      success: true,
      written: products.length,
      missing: 0,
      wrongPrices: 0,
      totalAfter: await countCollection('products'),
    }, null, 2));
  }
} finally {
  await deleteApp(app);
}
