import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

const PROJECT_ID = 'stamply-4df8a';
const BUCKET_NAME = 'stamply-4df8a.firebasestorage.app';
const PRODUCT_SOURCE_DIR = path.resolve('public/catalog/generated-products/grocery-additions-2026-08-30');
const STORAGE_PREFIX = 'media/catalog/grocery-additions-2026-08-30';
const REPORT_DIR = path.resolve('outputs/grocery-additions-2026-08-30');
const BACKUP_PATH = '/tmp/sanpack-grocery-additions-backup-2026-08-30.json';
const apply = process.argv.includes('--apply');
const now = new Date().toISOString();

function publicUrl(destination, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET_NAME)}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
}

function seo({ titleRu, titleUz, titleEn, titleZh, price }) {
  return {
    titleRu: `${titleRu} — купить в SANPACK`,
    titleUz: `${titleUz} — SANPACK`,
    titleEn: `${titleEn} — SANPACK`,
    titleZh: `${titleZh} — SANPACK`,
    descriptionRu: `${titleRu} по цене ${price.toLocaleString('ru-RU')} сум. Заказ и поставка от SANPACK.`,
    descriptionUz: `${titleUz}. Narxi ${price.toLocaleString('uz-UZ')} so‘m. SANPACK orqali buyurtma va yetkazib berish.`,
    descriptionEn: `${titleEn} for ${price.toLocaleString('en-US')} UZS. Order and delivery from SANPACK.`,
    descriptionZh: `${titleZh}，价格 ${price.toLocaleString('zh-CN')} 苏姆。SANPACK 提供订购与配送。`,
  };
}

function category({ id, slug, titleRu, titleUz, titleEn, titleZh, descriptionRu, descriptionUz, descriptionEn, descriptionZh, sortOrder, featuredSortOrder, attributeIds, cardFile, iconFile }) {
  return {
    id,
    parentId: 'cat-food',
    slug,
    titleRu,
    titleUz,
    titleEn,
    titleZh,
    descriptionRu,
    descriptionUz,
    descriptionEn,
    descriptionZh,
    featured: true,
    featuredSortOrder,
    attributeIds,
    status: 'active',
    sortOrder,
    cardFile,
    iconFile,
    seo: {
      titleRu: `${titleRu} — каталог SANPACK`,
      titleUz: `${titleUz} — SANPACK katalogi`,
      titleEn: `${titleEn} — SANPACK catalog`,
      titleZh: `${titleZh} — SANPACK 产品目录`,
      descriptionRu,
      descriptionUz,
      descriptionEn,
      descriptionZh,
    },
  };
}

function baseProduct({ id, slug, sku, categoryId, categorySlug, titleRu, titleUz, titleEn, titleZh, shortDescriptionRu, shortDescriptionUz, shortDescriptionEn, shortDescriptionZh, descriptionRu, descriptionUz, descriptionEn, descriptionZh, imageFile, attributes, price, salesUnit, salesUnitUz, salesUnitEn, salesUnitZh, unitCode, sortOrder, brandName, variants = [] }) {
  return {
    id,
    slug,
    sku,
    status: 'published',
    categoryId,
    categorySlug,
    titleRu,
    titleUz,
    titleEn,
    titleZh,
    shortDescriptionRu,
    shortDescriptionUz,
    shortDescriptionEn,
    shortDescriptionZh,
    descriptionRu,
    descriptionUz,
    descriptionEn,
    descriptionZh,
    imageFile,
    attributes,
    variants,
    price,
    currency: 'UZS',
    showPrice: true,
    stockStatus: 'on_order',
    minimumOrder: 1,
    salesUnit,
    salesUnitUz,
    salesUnitEn,
    salesUnitZh,
    unitCode,
    quantityStep: 1,
    priceMode: 'fixed',
    availability: 'on_order',
    featured: false,
    newProduct: true,
    ownProduction: false,
    sortOrder,
    createdAt: now,
    updatedAt: now,
    ...(brandName ? { brandName } : {}),
    seo: seo({ titleRu, titleUz, titleEn, titleZh, price }),
  };
}

const categories = [
  category({
    id: 'cat-salt', slug: 'sol', titleRu: 'Соль', titleUz: 'Tuz', titleEn: 'Salt', titleZh: '食盐',
    descriptionRu: 'Пищевая соль в профессиональной фасовке для HoReCa и производства.',
    descriptionUz: 'HoReCa va ishlab chiqarish uchun professional qadoqdagi osh tuzi.',
    descriptionEn: 'Food salt in professional packs for HoReCa and food production.',
    descriptionZh: '适用于餐饮和食品生产的专业大包装食用盐。',
    sortOrder: 34, featuredSortOrder: 12, attributeIds: ['attr-product-type', 'attr-weight'],
    cardFile: 'public/catalog/categories/salt.webp', iconFile: 'public/catalog/category-icons-v3/salt.webp',
  }),
  category({
    id: 'cat-baking-ingredients', slug: 'drozhzhi-i-ingredienty-dlya-vypechki',
    titleRu: 'Дрожжи и ингредиенты для выпечки', titleUz: 'Xamirturush va pishiriq masalliqlari', titleEn: 'Yeast and baking ingredients', titleZh: '酵母和烘焙原料',
    descriptionRu: 'Профессиональные ингредиенты для хлебопечения, кондитерских и кухни HoReCa.',
    descriptionUz: 'Nonvoyxona, qandolatchilik va HoReCa oshxonasi uchun professional masalliqlar.',
    descriptionEn: 'Professional ingredients for bakeries, pastry production, and HoReCa kitchens.',
    descriptionZh: '适用于面包房、糕点生产和餐饮厨房的专业原料。',
    sortOrder: 35, featuredSortOrder: 13, attributeIds: ['attr-brand', 'attr-product-type', 'attr-weight'],
    cardFile: 'public/catalog/categories/baking-ingredients.webp', iconFile: 'public/catalog/category-icons-v3/baking-ingredients.webp',
  }),
  category({
    id: 'cat-tomato-sauces', slug: 'tomatnye-pasty-i-sousy',
    titleRu: 'Томатные пасты и соусы', titleUz: 'Tomat pastalari va souslar', titleEn: 'Tomato pastes and sauces', titleZh: '番茄酱和调味酱',
    descriptionRu: 'Томатная паста и соусы в фасовках для кухни, торговли и HoReCa.',
    descriptionUz: 'Oshxona, savdo va HoReCa uchun turli qadoqdagi tomat pastalari va souslar.',
    descriptionEn: 'Tomato paste and sauces in formats for kitchens, retail, and HoReCa.',
    descriptionZh: '适用于厨房、零售和餐饮的不同规格番茄酱及调味酱。',
    sortOrder: 36, featuredSortOrder: 14, attributeIds: ['attr-brand', 'attr-product-type', 'attr-volume', 'attr-units-per-pack'],
    cardFile: 'public/catalog/categories/tomato-sauces.webp', iconFile: 'public/catalog/category-icons-v3/tomato-sauces.webp',
  }),
];

const products = [
  baseProduct({
    id: 'grocery-2026-sl-001', slug: 'sol-pishchevaya-25-kg-sl-001', sku: 'SP-SL-001',
    categoryId: 'cat-salt', categorySlug: 'sol', titleRu: 'Соль пищевая, 25 кг', titleUz: 'Osh tuzi, 25 kg', titleEn: 'Food salt, 25 kg', titleZh: '食用盐，25千克',
    shortDescriptionRu: 'Пищевая соль в мешке 25 кг.', shortDescriptionUz: '25 kg qopdagi osh tuzi.', shortDescriptionEn: 'Food salt in a 25 kg sack.', shortDescriptionZh: '25千克袋装食用盐。',
    descriptionRu: 'Пищевая соль крупной фасовки для кухни, производства и предприятий HoReCa.', descriptionUz: 'Oshxona, ishlab chiqarish va HoReCa korxonalari uchun katta qadoqdagi osh tuzi.', descriptionEn: 'Bulk food salt for kitchens, production, and HoReCa businesses.', descriptionZh: '适用于厨房、生产和餐饮企业的大包装食用盐。',
    imageFile: 'product-salt-25kg.webp', attributes: { product_type: 'пищевая соль', weight: '25 кг' }, price: 90000,
    salesUnit: 'мешок', salesUnitUz: 'qop', salesUnitEn: 'sack', salesUnitZh: '袋', unitCode: 'pack', sortOrder: 20701,
  }),
  baseProduct({
    id: 'grocery-2026-sl-002', slug: 'sol-extra-25-kg-sl-002', sku: 'SP-SL-002',
    categoryId: 'cat-salt', categorySlug: 'sol', titleRu: 'Соль Extra, 25 кг', titleUz: 'Extra tuz, 25 kg', titleEn: 'Extra salt, 25 kg', titleZh: 'Extra 精制盐，25千克',
    shortDescriptionRu: 'Мелкая пищевая соль Extra в мешке 25 кг.', shortDescriptionUz: '25 kg qopdagi mayda Extra osh tuzi.', shortDescriptionEn: 'Fine Extra-grade food salt in a 25 kg sack.', shortDescriptionZh: '25千克袋装 Extra 级精细食用盐。',
    descriptionRu: 'Мелкая пищевая соль Extra для профессиональной кухни и пищевого производства.', descriptionUz: 'Professional oshxona va oziq-ovqat ishlab chiqarish uchun mayda Extra osh tuzi.', descriptionEn: 'Fine Extra-grade food salt for professional kitchens and food production.', descriptionZh: '适用于专业厨房和食品生产的 Extra 级精细食用盐。',
    imageFile: 'product-salt-extra-25kg.webp', attributes: { product_type: 'соль Extra', weight: '25 кг' }, price: 95000,
    salesUnit: 'мешок', salesUnitUz: 'qop', salesUnitEn: 'sack', salesUnitZh: '袋', unitCode: 'pack', sortOrder: 20702,
  }),
  baseProduct({
    id: 'grocery-2026-bi-001', slug: 'drozhzhi-fariman-500-g-bi-001', sku: 'SP-BI-001',
    categoryId: 'cat-baking-ingredients', categorySlug: 'drozhzhi-i-ingredienty-dlya-vypechki', brandName: 'Fariman',
    titleRu: 'Дрожжи Fariman, 500 г', titleUz: 'Fariman xamirturushi, 500 g', titleEn: 'Fariman instant yeast, 500 g', titleZh: 'Fariman 即发酵母，500克',
    shortDescriptionRu: 'Сухие мгновенные дрожжи Fariman, упаковка 500 г.', shortDescriptionUz: 'Fariman quruq tezkor xamirturushi, 500 g.', shortDescriptionEn: 'Fariman instant dry yeast, 500 g pack.', shortDescriptionZh: 'Fariman 即发干酵母，500克包装。',
    descriptionRu: 'Сухие мгновенные дрожжи для хлеба, выпечки и профессионального производства.', descriptionUz: 'Non, pishiriq va professional ishlab chiqarish uchun quruq tezkor xamirturush.', descriptionEn: 'Instant dry yeast for bread, baking, and professional production.', descriptionZh: '适用于面包、烘焙和专业生产的即发干酵母。',
    imageFile: 'product-fariman-yeast-500g.webp', attributes: { brand: 'Fariman', product_type: 'сухие мгновенные дрожжи', weight: '500 г' }, price: 25000,
    salesUnit: 'упаковка', salesUnitUz: 'qadoq', salesUnitEn: 'pack', salesUnitZh: '包', unitCode: 'pack', sortOrder: 20801,
  }),
  baseProduct({
    id: 'grocery-2026-bi-002', slug: 'drozhzhi-angel-500-g-bi-002', sku: 'SP-BI-002',
    categoryId: 'cat-baking-ingredients', categorySlug: 'drozhzhi-i-ingredienty-dlya-vypechki', brandName: 'Angel',
    titleRu: 'Дрожжи Angel, 500 г', titleUz: 'Angel xamirturushi, 500 g', titleEn: 'Angel instant dry yeast, 500 g', titleZh: 'Angel 即发干酵母，500克',
    shortDescriptionRu: 'Сухие мгновенные дрожжи Angel, упаковка 500 г.', shortDescriptionUz: 'Angel quruq tezkor xamirturushi, 500 g.', shortDescriptionEn: 'Angel instant dry yeast, 500 g pack.', shortDescriptionZh: 'Angel 即发干酵母，500克包装。',
    descriptionRu: 'Сухие мгновенные дрожжи для хлебопечения, кондитерских изделий и производства.', descriptionUz: 'Nonvoyxona, qandolatchilik va ishlab chiqarish uchun quruq tezkor xamirturush.', descriptionEn: 'Instant dry yeast for bread, pastry, and professional production.', descriptionZh: '适用于面包、糕点和专业生产的即发干酵母。',
    imageFile: 'product-angel-yeast-500g.webp', attributes: { brand: 'Angel', product_type: 'сухие мгновенные дрожжи', weight: '500 г' }, price: 23000,
    salesUnit: 'упаковка', salesUnitUz: 'qadoq', salesUnitEn: 'pack', salesUnitZh: '包', unitCode: 'pack', sortOrder: 20802,
  }),
  baseProduct({
    id: 'grocery-2026-ts-001', slug: 'tomatnaya-pasta-ittifoq-ts-001', sku: 'SP-TS-001',
    categoryId: 'cat-tomato-sauces', categorySlug: 'tomatnye-pasty-i-sousy', brandName: 'Ittifoq',
    titleRu: 'Томатная паста Ittifoq', titleUz: 'Ittifoq tomat pastasi', titleEn: 'Ittifoq tomato paste', titleZh: 'Ittifoq 番茄酱',
    shortDescriptionRu: 'Томатная паста Ittifoq в банках 0,5 и 1 л.', shortDescriptionUz: 'Ittifoq tomat pastasi 0,5 va 1 l bankalarda.', shortDescriptionEn: 'Ittifoq tomato paste in 0.5 L and 1 L jars.', shortDescriptionZh: 'Ittifoq 番茄酱，提供0.5升和1升玻璃罐。',
    descriptionRu: 'Концентрированная томатная паста. В коробке: 10 банок по 0,5 л либо 8 банок по 1 л.', descriptionUz: 'Quyuq tomat pastasi. Qutida: 0,5 l dan 10 banka yoki 1 l dan 8 banka.', descriptionEn: 'Concentrated tomato paste. Case pack: ten 0.5 L jars or eight 1 L jars.', descriptionZh: '浓缩番茄酱。每箱装10罐0.5升或8罐1升。',
    imageFile: 'product-ittifoq-tomato-paste.webp', attributes: { brand: 'Ittifoq', product_type: 'томатная паста' }, price: 15500,
    salesUnit: 'банка', salesUnitUz: 'banka', salesUnitEn: 'jar', salesUnitZh: '罐', unitCode: 'piece', sortOrder: 20901,
    variants: [
      { id: 'ts-001-500', sku: 'SP-TS-001-500', titleRu: '0,5 л · 10 банок в коробке', titleUz: '0,5 l · qutida 10 banka', titleEn: '0.5 L · 10 jars per case', titleZh: '0.5升 · 每箱10罐', price: 15500, stockStatus: 'on_order', attributes: { volume: '0,5 л', units_per_pack: '10' }, minOrder: 1, minQuantity: 1, quantityStep: 1, priceMode: 'fixed', availability: 'on_order' },
      { id: 'ts-001-1000', sku: 'SP-TS-001-1000', titleRu: '1 л · 8 банок в коробке', titleUz: '1 l · qutida 8 banka', titleEn: '1 L · 8 jars per case', titleZh: '1升 · 每箱8罐', price: 28125, stockStatus: 'on_order', attributes: { volume: '1 л', units_per_pack: '8' }, minOrder: 1, minQuantity: 1, quantityStep: 1, priceMode: 'fixed', availability: 'on_order' },
    ],
  }),
];

const frozenAssets = {
  cardFile: 'public/catalog/categories/frozen-food.webp',
  iconFile: 'public/catalog/category-icons-v3/frozen-food.webp',
};

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME,
});
const db = getFirestore(app);
const bucket = getStorage(app).bucket(BUCKET_NAME);
let backups = [];
let uploadedPaths = [];
let committed = false;

function backupSnapshot(snapshot) {
  return { path: snapshot.ref.path, exists: snapshot.exists, data: snapshot.exists ? snapshot.data() : null };
}

function serializableBackup(backup) {
  return { ...backup, data: JSON.parse(JSON.stringify(backup.data)) };
}

async function prepareAsset(localFile, logicalName, kind) {
  const localPath = path.resolve(localFile);
  const buffer = await readFile(localPath);
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== 'webp') throw new Error(`${localFile} must be WebP.`);
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 20);
  const destination = `${STORAGE_PREFIX}/${kind}/${logicalName}-${hash}.webp`;
  const [exists] = await bucket.file(destination).exists();
  if (exists) throw new Error(`Storage object already exists: ${destination}`);
  return { localPath, buffer, destination, logicalName, kind };
}

async function uploadAsset(asset) {
  const token = randomUUID();
  await bucket.file(asset.destination).save(asset.buffer, {
    resumable: false,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=31536000,immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  uploadedPaths.push(asset.destination);
  return { ...asset, url: publicUrl(asset.destination, token) };
}

async function verifyPublicImage(url) {
  const response = await fetch(url, { method: 'HEAD' });
  return response.ok && response.headers.get('content-type')?.startsWith('image/');
}

try {
  const newRefs = [
    ...categories.map(({ id }) => db.doc(`categories/${id}`)),
    ...products.map(({ id }) => db.doc(`products/${id}`)),
  ];
  const frozenRef = db.doc('categories/cat-frozen-food');
  const snapshots = await db.getAll(...newRefs, frozenRef);
  backups = snapshots.map(backupSnapshot);

  const occupied = snapshots.slice(0, newRefs.length).filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.ref.path);
  if (occupied.length) throw new Error(`Refusing to overwrite existing documents: ${occupied.join(', ')}`);
  const frozenSnapshot = snapshots.at(-1);
  if (!frozenSnapshot?.exists) throw new Error('Existing frozen-food category is missing.');

  const allProducts = await db.collection('products').get();
  const occupiedSkus = new Set(allProducts.docs.flatMap((doc) => [doc.data().sku, ...(doc.data().variants || []).map((variant) => variant.sku)]).filter(Boolean));
  const requestedSkus = products.flatMap((product) => [product.sku, ...product.variants.map((variant) => variant.sku)]);
  const skuConflicts = requestedSkus.filter((sku) => occupiedSkus.has(sku));
  if (skuConflicts.length) throw new Error(`SKU conflicts: ${skuConflicts.join(', ')}`);

  const prepared = [];
  for (const product of products) {
    prepared.push(await prepareAsset(path.join(PRODUCT_SOURCE_DIR, product.imageFile), product.id, 'products'));
  }
  for (const item of categories) {
    prepared.push(await prepareAsset(item.cardFile, item.id, 'category-cards'));
    prepared.push(await prepareAsset(item.iconFile, item.id, 'category-icons'));
  }
  prepared.push(await prepareAsset(frozenAssets.cardFile, 'cat-frozen-food', 'category-cards'));
  prepared.push(await prepareAsset(frozenAssets.iconFile, 'cat-frozen-food', 'category-icons'));

  console.log(JSON.stringify({ projectId: PROJECT_ID, apply, products: products.length, newCategories: categories.length, assets: prepared.length }, null, 2));
  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to publish.');
  } else {
    await writeFile(BACKUP_PATH, `${JSON.stringify(backups.map(serializableBackup), null, 2)}\n`, { mode: 0o600 });
    const uploaded = [];
    for (const [index, asset] of prepared.entries()) {
      uploaded.push(await uploadAsset(asset));
      console.log(`[upload ${index + 1}/${prepared.length}] ${asset.kind}/${asset.logicalName}`);
    }
    const assetByKey = new Map(uploaded.map((asset) => [`${asset.kind}/${asset.logicalName}`, asset]));
    const batch = db.batch();

    for (const source of categories) {
      const { cardFile: _cardFile, iconFile: _iconFile, ...data } = source;
      const card = assetByKey.get(`category-cards/${source.id}`);
      const icon = assetByKey.get(`category-icons/${source.id}`);
      batch.create(db.doc(`categories/${source.id}`), {
        ...data,
        image: card.url,
        imagePath: card.destination,
        cardImage: card.url,
        cardImagePath: card.destination,
        navigationImage: icon.url,
        navigationImagePath: icon.destination,
      });
    }

    const frozenCard = assetByKey.get('category-cards/cat-frozen-food');
    const frozenIcon = assetByKey.get('category-icons/cat-frozen-food');
    batch.update(frozenRef, {
      image: frozenCard.url,
      imagePath: frozenCard.destination,
      cardImage: frozenCard.url,
      cardImagePath: frozenCard.destination,
      navigationImage: frozenIcon.url,
      navigationImagePath: frozenIcon.destination,
      featured: true,
      featuredSortOrder: 11,
    });

    for (const source of products) {
      const { imageFile: _imageFile, salesUnitUz: _salesUnitUz, salesUnitEn: _salesUnitEn, salesUnitZh: _salesUnitZh, ...data } = source;
      const image = assetByKey.get(`products/${source.id}`);
      batch.create(db.doc(`products/${source.id}`), {
        ...data,
        images: [image.url],
        imagePaths: [image.destination],
        mainImage: image.url,
        mainImagePath: image.destination,
      });
    }

    await batch.commit();
    committed = true;

    const verification = await db.getAll(...newRefs, frozenRef);
    const missing = verification.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.ref.path);
    const publicChecks = await Promise.all(uploaded.map((asset) => verifyPublicImage(asset.url)));
    const inaccessible = uploaded.filter((_, index) => !publicChecks[index]).map((asset) => asset.destination);
    if (missing.length || inaccessible.length) throw new Error(`Verification failed: missing=${missing.join(',')}; images=${inaccessible.join(',')}`);

    await mkdir(REPORT_DIR, { recursive: true });
    const reportPath = path.join(REPORT_DIR, 'publish-report.json');
    await writeFile(reportPath, `${JSON.stringify({
      publishedAt: new Date().toISOString(),
      projectId: PROJECT_ID,
      categories: categories.map(({ id, titleRu }) => ({ id, titleRu })),
      updatedCategories: ['cat-frozen-food'],
      products: products.map(({ id, sku, titleRu, price }) => ({ id, sku, titleRu, price })),
      assets: uploaded.map(({ logicalName, kind, localPath, destination, url }) => ({ logicalName, kind, localPath, destination, url })),
      publicImagesVerified: publicChecks.filter(Boolean).length,
      backupPath: BACKUP_PATH,
    }, null, 2)}\n`);
    console.log(JSON.stringify({ success: true, createdProducts: products.length, createdCategories: categories.length, updatedCategories: 1, uploadedAssets: uploaded.length, publicImagesVerified: publicChecks.filter(Boolean).length, reportPath, backupPath: BACKUP_PATH }, null, 2));
  }
} catch (error) {
  if (committed && backups.length) {
    const rollback = db.batch();
    for (const backup of backups) {
      const ref = db.doc(backup.path);
      if (backup.exists) rollback.set(ref, backup.data);
      else rollback.delete(ref);
    }
    await rollback.commit();
  }
  if (uploadedPaths.length) await Promise.allSettled(uploadedPaths.map((destination) => bucket.file(destination).delete({ ignoreNotFound: true })));
  throw error;
} finally {
  await deleteApp(app);
}
