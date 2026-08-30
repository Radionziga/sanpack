import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

const PROJECT_ID = 'stamply-4df8a';
const BUCKET_NAME = 'stamply-4df8a.firebasestorage.app';
const SOURCE_DIR = path.resolve('public/catalog/generated-products/catalog-additions-2026-08-30');
const STORAGE_PREFIX = 'media/products/catalog-additions-2026-08-30';
const REPORT_DIR = path.resolve('outputs/catalog-additions-2026-08-30');
const BACKUP_PATH = '/tmp/sanpack-catalog-additions-backup-2026-08-30.json';
const apply = process.argv.includes('--apply');
const now = new Date().toISOString();

function publicUrl(destination, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET_NAME)}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
}

function formatPrice(value) {
  return new Intl.NumberFormat('ru-RU').format(value);
}

function localizedSeo({ titleRu, titleUz, titleEn, titleZh, price }) {
  return {
    titleRu: `${titleRu} — купить в SANPACK`,
    descriptionRu: `${titleRu} по цене ${formatPrice(price)} сум. Заказ и поставка от SANPACK.`,
    titleUz: `${titleUz} — SANPACK`,
    descriptionUz: `${titleUz}. Narxi ${formatPrice(price)} so‘m. SANPACK orqali buyurtma va yetkazib berish.`,
    titleEn: `${titleEn} — SANPACK`,
    descriptionEn: `${titleEn} for ${formatPrice(price)} UZS. Order and delivery from SANPACK.`,
    titleZh: `${titleZh} — SANPACK`,
    descriptionZh: `${titleZh}，价格 ${formatPrice(price)} 苏姆。SANPACK 提供订购与配送。`,
  };
}

function groceryProduct({
  id,
  code,
  slug,
  titleRu,
  titleUz,
  titleEn,
  titleZh,
  price,
  sortOrder,
  attributes = {},
  imageFile,
}) {
  return {
    id,
    slug,
    sku: `SP-${code}`,
    status: 'published',
    categoryId: 'cat-groats',
    categorySlug: 'krupy-i-bobovye',
    titleRu,
    titleUz,
    titleEn,
    titleZh,
    shortDescriptionRu: `${titleRu}. Цена указана за 1 кг.`,
    shortDescriptionUz: `${titleUz}. Narx 1 kg uchun ko‘rsatilgan.`,
    shortDescriptionEn: `${titleEn}. Price is per 1 kg.`,
    shortDescriptionZh: `${titleZh}。价格按 1 千克计算。`,
    descriptionRu: `${titleRu} для оптовых и профессиональных закупок. Наличие и условия поставки уточняйте у менеджера SANPACK.`,
    descriptionUz: `${titleUz} ulgurji va professional xaridlar uchun. Mavjudligi va yetkazib berish shartlarini SANPACK menejeridan aniqlang.`,
    descriptionEn: `${titleEn} for wholesale and professional purchasing. Check availability and delivery terms with a SANPACK manager.`,
    descriptionZh: `${titleZh}，适合批发和专业采购。库存与配送条件请咨询 SANPACK 经理。`,
    attributes,
    variants: [],
    price,
    currency: 'UZS',
    showPrice: true,
    stockStatus: 'on_order',
    minimumOrder: 1,
    salesUnit: 'кг',
    unitCode: 'kilogram',
    quantityStep: 1,
    priceMode: 'fixed',
    availability: 'on_order',
    featured: false,
    newProduct: true,
    ownProduction: false,
    sortOrder,
    seo: localizedSeo({ titleRu, titleUz, titleEn, titleZh, price }),
    createdAt: now,
    updatedAt: now,
    createdBy: 'catalog-additions-2026-08-30',
    updatedBy: 'catalog-additions-2026-08-30',
    imageFile,
  };
}

const newProducts = [
  groceryProduct({
    id: 'price-2026-gr-007', code: 'GR-007', slug: 'goroh-rossiyskiy-gr-007',
    titleRu: 'Горох российский', titleUz: 'Rossiya goroxi', titleEn: 'Russian split peas', titleZh: '俄罗斯豌豆',
    price: 11_000, sortOrder: 78, attributes: { origin: 'Россия' }, imageFile: 'price-2026-gr-007-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-008', code: 'GR-008', slug: 'ovsyanye-hlopya-gr-008',
    titleRu: 'Овсяные хлопья', titleUz: 'Suli yormasi', titleEn: 'Rolled oats', titleZh: '燕麦片',
    price: 11_000, sortOrder: 79, imageFile: 'price-2026-gr-008-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-009', code: 'GR-009', slug: 'mannaya-krupa-gr-009',
    titleRu: 'Манная крупа', titleUz: 'Manna yormasi', titleEn: 'Semolina', titleZh: '粗粒小麦粉',
    price: 13_000, sortOrder: 80, imageFile: 'price-2026-gr-009-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-010', code: 'GR-010', slug: 'psheno-gr-010',
    titleRu: 'Пшено', titleUz: 'Tariq yormasi', titleEn: 'Millet', titleZh: '小米',
    price: 11_000, sortOrder: 81, imageFile: 'price-2026-gr-010-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-011', code: 'GR-011', slug: 'perlovaya-krupa-gr-011',
    titleRu: 'Перловая крупа', titleUz: 'Arpa yormasi', titleEn: 'Pearl barley', titleZh: '珍珠大麦',
    price: 9_000, sortOrder: 82, imageFile: 'price-2026-gr-011-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-012', code: 'GR-012', slug: 'nut-rossiyskiy-gr-012',
    titleRu: 'Нут российский', titleUz: 'Rossiya no‘xati', titleEn: 'Russian chickpeas', titleZh: '俄罗斯鹰嘴豆',
    price: 23_000, sortOrder: 83, attributes: { origin: 'Россия' }, imageFile: 'price-2026-gr-012-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-013', code: 'GR-013', slug: 'osh-magiz-izyum-dlya-plova-gr-013',
    titleRu: 'Ош магиз — изюм для плова', titleUz: 'Osh mag‘iz', titleEn: 'Osh magiz raisins for plov', titleZh: '抓饭用葡萄干',
    price: 40_000, sortOrder: 84, imageFile: 'price-2026-gr-013-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-014', code: 'GR-014', slug: 'kunzhut-belyy-gr-014',
    titleRu: 'Кунжут белый', titleUz: 'Oq kunjut', titleEn: 'White sesame', titleZh: '白芝麻',
    price: 32_000, sortOrder: 85, imageFile: 'price-2026-gr-014-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-015', code: 'GR-015', slug: 'kunzhut-krasnyy-gr-015',
    titleRu: 'Кунжут красный', titleUz: 'Qizil kunjut', titleEn: 'Red sesame', titleZh: '红芝麻',
    price: 34_000, sortOrder: 86, imageFile: 'price-2026-gr-015-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-016', code: 'GR-016', slug: 'chernyy-tmin-qora-sedana-gr-016',
    titleRu: 'Чёрный тмин — qora sedana', titleUz: 'Qora sedana', titleEn: 'Nigella seeds — black cumin', titleZh: '黑种草籽',
    price: 53_000, sortOrder: 87, imageFile: 'price-2026-gr-016-v1.webp',
  }),
  groceryProduct({
    id: 'price-2026-gr-017', code: 'GR-017', slug: 'mash-gr-017',
    titleRu: 'Маш', titleUz: 'Mosh', titleEn: 'Mung beans', titleZh: '绿豆',
    price: 20_000, sortOrder: 88, imageFile: 'price-2026-gr-017-v1.webp',
  }),
  {
    id: 'price-2026-fz-001',
    slug: 'kartofel-fri-zamorozhennyy-2-kg-fz-001',
    sku: 'SP-FZ-001',
    status: 'published',
    categoryId: 'cat-frozen-food',
    categorySlug: 'zamorozhennye-produkty',
    titleRu: 'Картофель фри замороженный, 2 кг',
    titleUz: 'Muzlatilgan kartoshka fri, 2 kg',
    titleEn: 'Frozen French fries, 2 kg',
    titleZh: '冷冻薯条，2 千克',
    shortDescriptionRu: 'Замороженный картофель фри 9 × 9 мм в упаковке 2 кг.',
    shortDescriptionUz: '9 × 9 mm muzlatilgan kartoshka fri, 2 kg qadoq.',
    shortDescriptionEn: 'Frozen 9 × 9 mm French fries in a 2 kg pack.',
    shortDescriptionZh: '9 × 9 毫米冷冻薯条，2 千克包装。',
    descriptionRu: 'Картофель фри для ресторанов, кафе и профессиональной кухни. Хранить в замороженном виде. Наличие и условия поставки уточняйте у менеджера SANPACK.',
    descriptionUz: 'Restoran, kafe va professional oshxonalar uchun kartoshka fri. Muzlatilgan holda saqlang. Mavjudligi va yetkazib berish shartlarini SANPACK menejeridan aniqlang.',
    descriptionEn: 'French fries for restaurants, cafés, and professional kitchens. Keep frozen. Check availability and delivery terms with a SANPACK manager.',
    descriptionZh: '适用于餐厅、咖啡馆和专业厨房的冷冻薯条。需冷冻保存。库存与配送条件请咨询 SANPACK 经理。',
    attributes: { weight: '2 кг', size: '9 × 9 мм' },
    variants: [],
    price: 66_000,
    currency: 'UZS',
    showPrice: true,
    stockStatus: 'on_order',
    minimumOrder: 1,
    salesUnit: 'упаковка',
    unitCode: 'pack',
    quantityStep: 1,
    priceMode: 'fixed',
    availability: 'on_order',
    featured: false,
    newProduct: true,
    ownProduction: false,
    sortOrder: 160,
    seo: localizedSeo({
      titleRu: 'Картофель фри замороженный, 2 кг',
      titleUz: 'Muzlatilgan kartoshka fri, 2 kg',
      titleEn: 'Frozen French fries, 2 kg',
      titleZh: '冷冻薯条，2 千克',
      price: 66_000,
    }),
    createdAt: now,
    updatedAt: now,
    createdBy: 'catalog-additions-2026-08-30',
    updatedBy: 'catalog-additions-2026-08-30',
    imageFile: 'price-2026-fz-001-v1.webp',
  },
  {
    id: 'price-2026-fp-005',
    slug: 'konteyner-iz-alyuminievoy-folgi-s-kryshkoy-fp-005',
    sku: 'SP-FP-005',
    status: 'published',
    categoryId: 'cat-food-packaging',
    categorySlug: 'upakovka-dlya-produktov',
    titleRu: 'Контейнер из алюминиевой фольги с крышкой',
    titleUz: 'Qopqoqli alyuminiy folga konteyneri',
    titleEn: 'Aluminium foil container with lid',
    titleZh: '带盖铝箔餐盒',
    shortDescriptionRu: 'Прямоугольный фольгированный контейнер с крышкой. В коробке 1000 штук.',
    shortDescriptionUz: 'Qopqoqli to‘g‘ri to‘rtburchak folga konteyneri. Qutida 1000 dona.',
    shortDescriptionEn: 'Rectangular foil container with lid. 1,000 pieces per case.',
    shortDescriptionZh: '带盖长方形铝箔餐盒，每箱 1,000 件。',
    descriptionRu: 'Одноразовый пищевой контейнер из алюминиевой фольги для готовых блюд, выпечки и доставки. Крышка входит в комплект. Доступен в двух размерах.',
    descriptionUz: 'Tayyor taomlar, pishiriqlar va yetkazib berish uchun bir martalik alyuminiy folga konteyneri. Qopqoq to‘plamga kiradi. Ikki o‘lchamda mavjud.',
    descriptionEn: 'Disposable food-grade aluminium foil container for prepared meals, baking, and delivery. Lid included. Available in two sizes.',
    descriptionZh: '食品级一次性铝箔餐盒，适用于熟食、烘焙和配送。含盖，有两种规格。',
    attributes: {
      material: 'алюминиевая фольга',
      units_per_pack: 1000,
      lid_included: true,
    },
    variants: [
      {
        id: 'fp-005-800', sku: 'SP-FP-005-800',
        titleRu: '800 мл · 210 × 140 × 50 мм · до 600 г',
        titleUz: '800 ml · 210 × 140 × 50 mm · 600 g gacha',
        titleEn: '800 ml · 210 × 140 × 50 mm · up to 600 g',
        titleZh: '800 毫升 · 210 × 140 × 50 毫米 · 承重 600 克',
        price: 1100,
        stockStatus: 'on_order',
        priceMode: 'fixed',
        availability: 'on_order',
        minOrder: 1000,
        minQuantity: 1000,
        quantityStep: 1000,
        attributes: { length: '210 мм', width: '140 мм', height: '50 мм', volume: '800 мл', load_capacity: 0.6 },
      },
      {
        id: 'fp-005-1000', sku: 'SP-FP-005-1000',
        titleRu: '1000 мл · 220 × 160 × 50 мм · до 800 г',
        titleUz: '1000 ml · 220 × 160 × 50 mm · 800 g gacha',
        titleEn: '1,000 ml · 220 × 160 × 50 mm · up to 800 g',
        titleZh: '1000 毫升 · 220 × 160 × 50 毫米 · 承重 800 克',
        price: 1300,
        stockStatus: 'on_order',
        priceMode: 'fixed',
        availability: 'on_order',
        minOrder: 1000,
        minQuantity: 1000,
        quantityStep: 1000,
        attributes: { length: '220 мм', width: '160 мм', height: '50 мм', volume: '1000 мл', load_capacity: 0.8 },
      },
    ],
    price: 1100,
    currency: 'UZS',
    showPrice: true,
    stockStatus: 'on_order',
    minimumOrder: 1000,
    salesUnit: 'шт.',
    unitCode: 'piece',
    quantityStep: 1000,
    orderPackaging: {
      enabled: true,
      nameRu: 'коробка',
      nameUz: 'quti',
      nameEn: 'case',
      nameZh: '箱',
      unitsPerPackage: 1000,
      minimumPackages: 1,
      packageStep: 1,
    },
    priceMode: 'fixed',
    availability: 'on_order',
    featured: false,
    newProduct: true,
    ownProduction: false,
    sortOrder: 24,
    seo: localizedSeo({
      titleRu: 'Контейнер из алюминиевой фольги с крышкой',
      titleUz: 'Qopqoqli alyuminiy folga konteyneri',
      titleEn: 'Aluminium foil container with lid',
      titleZh: '带盖铝箔餐盒',
      price: 1100,
    }),
    createdAt: now,
    updatedAt: now,
    createdBy: 'catalog-additions-2026-08-30',
    updatedBy: 'catalog-additions-2026-08-30',
    imageFile: 'price-2026-fp-005-v1.webp',
  },
];

function updatedGrocery({ id, titleRu, titleUz, titleEn, titleZh, price, attributes }) {
  return {
    titleRu,
    titleUz,
    titleEn,
    titleZh,
    shortDescriptionRu: `${titleRu}. Цена указана за 1 кг.`,
    shortDescriptionUz: `${titleUz}. Narx 1 kg uchun ko‘rsatilgan.`,
    shortDescriptionEn: `${titleEn}. Price is per 1 kg.`,
    shortDescriptionZh: `${titleZh}。价格按 1 千克计算。`,
    descriptionRu: `${titleRu} для оптовых и профессиональных закупок. Наличие и условия поставки уточняйте у менеджера SANPACK.`,
    descriptionUz: `${titleUz} ulgurji va professional xaridlar uchun. Mavjudligi va yetkazib berish shartlarini SANPACK menejeridan aniqlang.`,
    descriptionEn: `${titleEn} for wholesale and professional purchasing. Check availability and delivery terms with a SANPACK manager.`,
    descriptionZh: `${titleZh}，适合批发和专业采购。库存与配送条件请咨询 SANPACK 经理。`,
    attributes,
    price,
    showPrice: true,
    priceMode: 'fixed',
    seo: localizedSeo({ titleRu, titleUz, titleEn, titleZh, price }),
    updatedAt: now,
    updatedBy: 'catalog-additions-2026-08-30',
    id,
  };
}

const existingProductUpdates = new Map([
  ['price-2026-gr-001', updatedGrocery({
    id: 'price-2026-gr-001', titleRu: 'Рис «Лазер Super», Хорезм', titleUz: 'Xorazm «Lazer Super» guruchi',
    titleEn: 'Khorezm Lazer Super rice', titleZh: '花拉子模 Lazer Super 大米', price: 19_000,
    attributes: { origin: 'Узбекистан', grade: 'Lazer Super' },
  })],
  ['price-2026-gr-002', updatedGrocery({
    id: 'price-2026-gr-002', titleRu: 'Рис «Аланга Super», Хорезм', titleUz: 'Xorazm «Alanga Super» guruchi',
    titleEn: 'Khorezm Alanga Super rice', titleZh: '花拉子模 Alanga Super 大米', price: 17_000,
    attributes: { origin: 'Узбекистан', grade: 'Alanga Super' },
  })],
  ['price-2026-gr-003', updatedGrocery({
    id: 'price-2026-gr-003', titleRu: 'Гречка', titleUz: 'Grechka', titleEn: 'Buckwheat', titleZh: '荞麦',
    price: 12_000, attributes: {},
  })],
  ['price-2026-gr-004', updatedGrocery({
    id: 'price-2026-gr-004', titleRu: 'Чечевица', titleUz: 'Yasmiq', titleEn: 'Lentils', titleZh: '扁豆',
    price: 15_000, attributes: {},
  })],
  ['price-2026-gr-005', updatedGrocery({
    id: 'price-2026-gr-005', titleRu: 'Нут американский', titleUz: 'Amerika no‘xati',
    titleEn: 'American chickpeas', titleZh: '美国鹰嘴豆', price: 28_000, attributes: { origin: 'США' },
  })],
  ['price-2026-gr-006', updatedGrocery({
    id: 'price-2026-gr-006', titleRu: 'Нут иранский', titleUz: 'Eron no‘xati',
    titleEn: 'Iranian chickpeas', titleZh: '伊朗鹰嘴豆', price: 23_000, attributes: { origin: 'Иран' },
  })],
]);

const frozenCategory = {
  id: 'cat-frozen-food',
  parentId: 'cat-food',
  slug: 'zamorozhennye-produkty',
  titleRu: 'Замороженные продукты',
  titleUz: 'Muzlatilgan mahsulotlar',
  titleEn: 'Frozen foods',
  titleZh: '冷冻食品',
  descriptionRu: 'Замороженные продукты для ресторанов, кафе и профессиональной кухни.',
  descriptionUz: 'Restoran, kafe va professional oshxonalar uchun muzlatilgan mahsulotlar.',
  descriptionEn: 'Frozen products for restaurants, cafés, and professional kitchens.',
  descriptionZh: '适用于餐厅、咖啡馆和专业厨房的冷冻食品。',
  icon: 'Snowflake',
  featured: false,
  attributeIds: ['attr-weight', 'attr-size'],
  status: 'active',
  sortOrder: 33,
};

const newAttributeDefinitions = [
  {
    id: 'attr-length', key: 'length', titleRu: 'Длина', titleUz: 'Uzunlik', titleEn: 'Length', titleZh: '长度',
    type: 'text', filterable: false, required: false, cardVisible: false, productVisible: true,
    categoryIds: ['cat-food-packaging'], sortOrder: 51,
  },
  {
    id: 'attr-width', key: 'width', titleRu: 'Ширина', titleUz: 'Kenglik', titleEn: 'Width', titleZh: '宽度',
    type: 'text', filterable: false, required: false, cardVisible: false, productVisible: true,
    categoryIds: ['cat-food-packaging'], sortOrder: 52,
  },
  {
    id: 'attr-height', key: 'height', titleRu: 'Высота', titleUz: 'Balandlik', titleEn: 'Height', titleZh: '高度',
    type: 'text', filterable: false, required: false, cardVisible: false, productVisible: true,
    categoryIds: ['cat-food-packaging'], sortOrder: 53,
  },
  {
    id: 'attr-material', key: 'material', titleRu: 'Материал', titleUz: 'Material', titleEn: 'Material', titleZh: '材质',
    type: 'text', filterable: true, required: false, cardVisible: false, productVisible: true,
    categoryIds: ['cat-packaging'], sortOrder: 110,
  },
  {
    id: 'attr-lid-included', key: 'lid_included', titleRu: 'Крышка в комплекте', titleUz: 'Qopqoq to‘plamda',
    titleEn: 'Lid included', titleZh: '含盖', type: 'boolean', filterable: true, required: false,
    cardVisible: false, productVisible: true, categoryIds: ['cat-food-packaging'], sortOrder: 111,
  },
];

function snapshotBackup(snapshot) {
  return { path: snapshot.ref.path, exists: snapshot.exists, data: snapshot.exists ? snapshot.data() : null };
}

function serializableBackup(item) {
  return { path: item.path, exists: item.exists, data: item.data };
}

async function verifyPublicImage(url) {
  const response = await fetch(url, { headers: { range: 'bytes=0-0' }, signal: AbortSignal.timeout(30_000) });
  await response.body?.cancel();
  return response.ok && response.headers.get('content-type') === 'image/webp';
}

if ((process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) !== PROJECT_ID) {
  throw new Error(`Set GOOGLE_CLOUD_PROJECT=${PROJECT_ID} before running this script.`);
}

const app = initializeApp(
  { credential: applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET_NAME },
  `catalog-additions-2026-08-30-${Date.now()}`,
);
const db = getFirestore(app);
const bucket = getStorage(app).bucket(BUCKET_NAME);
const uploadedPaths = [];
let backups = [];
let firestoreCommitted = false;

try {
  const newRefs = newProducts.map(({ id }) => db.doc(`products/${id}`));
  const updateRefs = [...existingProductUpdates.keys()].map((id) => db.doc(`products/${id}`));
  const metadataRefs = [
    db.doc('categories/cat-frozen-food'),
    db.doc('categories/cat-food-packaging'),
    db.doc('categories/cat-groats'),
    ...newAttributeDefinitions.map(({ id }) => db.doc(`attributes/${id}`)),
  ];
  const allBackupRefs = [...newRefs, ...updateRefs, ...metadataRefs];
  const allSnapshots = await db.getAll(...allBackupRefs);
  backups = allSnapshots.map(snapshotBackup);

  const newSnapshots = allSnapshots.slice(0, newRefs.length);
  const occupiedIds = newSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id);
  if (occupiedIds.length) throw new Error(`Refusing to overwrite existing new-product IDs: ${occupiedIds.join(', ')}`);

  const updateSnapshots = allSnapshots.slice(newRefs.length, newRefs.length + updateRefs.length);
  const missingUpdates = updateSnapshots.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.id);
  if (missingUpdates.length) throw new Error(`Products expected for price update are missing: ${missingUpdates.join(', ')}`);

  const parentFood = await db.doc('categories/cat-food').get();
  const foodPackaging = await db.doc('categories/cat-food-packaging').get();
  if (!parentFood.exists || !foodPackaging.exists) throw new Error('Required parent categories are missing.');

  const allProductSnapshot = await db.collection('products').get();
  const occupiedSkus = new Set(allProductSnapshot.docs.map((doc) => doc.data().sku).filter(Boolean));
  const requestedSkus = newProducts.flatMap((product) => [product.sku, ...(product.variants || []).map((variant) => variant.sku)]);
  const skuConflicts = requestedSkus.filter((sku) => occupiedSkus.has(sku));
  if (skuConflicts.length) throw new Error(`SKU conflicts: ${skuConflicts.join(', ')}`);
  if (new Set(requestedSkus).size !== requestedSkus.length) throw new Error('Duplicate SKU inside the requested product set.');

  const preparedImages = [];
  for (const product of newProducts) {
    const localPath = path.join(SOURCE_DIR, product.imageFile);
    const buffer = await readFile(localPath);
    const metadata = await sharp(buffer).metadata();
    if (metadata.format !== 'webp' || metadata.width !== 1200 || metadata.height !== 1200) {
      throw new Error(`${product.imageFile} must be a 1200×1200 WebP image.`);
    }
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 20);
    const destination = `${STORAGE_PREFIX}/${product.id}-${hash}.webp`;
    const [exists] = await bucket.file(destination).exists();
    if (exists) throw new Error(`Storage object already exists: ${destination}`);
    preparedImages.push({ productId: product.id, localPath, buffer, destination });
  }

  console.log(JSON.stringify({
    projectId: PROJECT_ID,
    bucket: BUCKET_NAME,
    apply,
    newProducts: newProducts.length,
    updatedProducts: existingProductUpdates.size,
    newImages: preparedImages.length,
    newCategory: frozenCategory.id,
    newAttributes: newAttributeDefinitions.map(({ key }) => key),
  }, null, 2));

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to upload images and publish Firestore changes.');
  } else {
    await writeFile(BACKUP_PATH, `${JSON.stringify(backups.map(serializableBackup), null, 2)}\n`, { mode: 0o600 });

    const uploaded = [];
    for (const [index, image] of preparedImages.entries()) {
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
      uploaded.push({ ...image, url: publicUrl(image.destination, token) });
      console.log(`[upload ${index + 1}/${preparedImages.length}] ${image.productId}`);
    }

    const uploadByProduct = new Map(uploaded.map((item) => [item.productId, item]));
    const batch = db.batch();
    batch.set(db.doc(`categories/${frozenCategory.id}`), frozenCategory);

    const existingFoodPackaging = foodPackaging.data();
    batch.set(foodPackaging.ref, {
      attributeIds: [...new Set([
        ...(existingFoodPackaging.attributeIds || []),
        'attr-length', 'attr-width', 'attr-height', 'attr-volume', 'attr-load-capacity',
        'attr-material', 'attr-units-per-pack', 'attr-lid-included',
      ])],
    }, { merge: true });

    const groatsSnapshot = await db.doc('categories/cat-groats').get();
    batch.set(groatsSnapshot.ref, {
      attributeIds: [...new Set([...(groatsSnapshot.data()?.attributeIds || []), 'attr-grade', 'attr-origin'])],
    }, { merge: true });

    for (const definition of newAttributeDefinitions) {
      batch.set(db.doc(`attributes/${definition.id}`), definition);
    }

    for (const [id, update] of existingProductUpdates) {
      batch.set(db.doc(`products/${id}`), update, { merge: true });
    }

    for (const productWithFile of newProducts) {
      const { imageFile: _imageFile, ...product } = productWithFile;
      const upload = uploadByProduct.get(product.id);
      if (!upload) throw new Error(`Missing prepared upload for ${product.id}`);
      batch.create(db.doc(`products/${product.id}`), {
        ...product,
        images: [upload.url],
        imagePaths: [upload.destination],
        mainImage: upload.url,
        mainImagePath: upload.destination,
      });
    }

    await batch.commit();
    firestoreCommitted = true;

    const verification = await db.getAll(...newRefs, ...updateRefs);
    const missingProducts = verification.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.id);
    const wrongImages = verification.slice(0, newRefs.length).filter((snapshot) => {
      const upload = uploadByProduct.get(snapshot.id);
      const data = snapshot.data();
      return !upload || data.mainImage !== upload.url || data.mainImagePath !== upload.destination;
    }).map((snapshot) => snapshot.id);
    const wrongPrices = verification.slice(newRefs.length).filter((snapshot) => {
      const expected = existingProductUpdates.get(snapshot.id);
      return snapshot.data()?.price !== expected?.price;
    }).map((snapshot) => snapshot.id);
    const publicChecks = await Promise.all(uploaded.map(({ url }) => verifyPublicImage(url)));
    const inaccessibleImages = uploaded.filter((_, index) => !publicChecks[index]).map(({ productId }) => productId);

    if (missingProducts.length || wrongImages.length || wrongPrices.length || inaccessibleImages.length) {
      throw new Error(`Verification failed: missing=${missingProducts.join(',')}; images=${wrongImages.join(',')}; prices=${wrongPrices.join(',')}; public=${inaccessibleImages.join(',')}`);
    }

    await mkdir(REPORT_DIR, { recursive: true });
    const reportPath = path.join(REPORT_DIR, 'publish-report.json');
    await writeFile(reportPath, `${JSON.stringify({
      publishedAt: new Date().toISOString(),
      projectId: PROJECT_ID,
      bucket: BUCKET_NAME,
      createdProducts: newProducts.map(({ id, sku, titleRu, price }) => ({ id, sku, titleRu, price })),
      updatedProducts: [...existingProductUpdates].map(([id, data]) => ({ id, titleRu: data.titleRu, price: data.price })),
      uploadedImages: uploaded.map(({ productId, localPath, destination, url }) => ({ productId, localPath, destination, url })),
      publicImagesVerified: publicChecks.filter(Boolean).length,
      backupPath: BACKUP_PATH,
    }, null, 2)}\n`);
    console.log(JSON.stringify({
      success: true,
      createdProducts: newProducts.length,
      updatedProducts: existingProductUpdates.size,
      uploadedImages: uploaded.length,
      publicImagesVerified: publicChecks.filter(Boolean).length,
      reportPath,
      backupPath: BACKUP_PATH,
    }, null, 2));
  }
} catch (error) {
  if (firestoreCommitted && backups.length) {
    const rollback = db.batch();
    for (const backup of backups) {
      const ref = db.doc(backup.path);
      if (backup.exists) rollback.set(ref, backup.data);
      else rollback.delete(ref);
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
