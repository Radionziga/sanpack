import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const EXPECTED_PROJECT = 'stamply-4df8a';
const EXPECTED_BUCKET = 'stamply-4df8a.firebasestorage.app';
const TARGET_CATEGORY_IDS = new Set(['cat-fruits', 'cat-berries', 'cat-vegetables']);
const apply = process.argv.includes('--apply');
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

if (projectId !== EXPECTED_PROJECT) {
  throw new Error(`Операция остановлена: ожидался проект ${EXPECTED_PROJECT}, получен ${projectId || 'не указан'}.`);
}

const assortment = [
  // Fruit commonly grown locally or regularly supplied to Tashkent HoReCa.
  ['FR-023', 'cat-fruits', 'Абрикос', 'O‘rik', 'Apricot', '杏'],
  ['FR-024', 'cat-fruits', 'Нектарин', 'Nektarin', 'Nectarine', '油桃'],
  ['FR-025', 'cat-fruits', 'Хурма', 'Xurmo', 'Persimmon', '柿子'],
  ['FR-026', 'cat-fruits', 'Слива', 'Olxo‘ri', 'Plum', '李子'],
  ['FR-027', 'cat-fruits', 'Груша', 'Nok', 'Pear', '梨'],
  ['FR-028', 'cat-fruits', 'Айва', 'Behi', 'Quince', '榅桲'],
  ['FR-029', 'cat-fruits', 'Инжир', 'Anjir', 'Fig', '无花果'],
  ['FR-030', 'cat-fruits', 'Дыня', 'Qovun', 'Melon', '甜瓜'],
  ['FR-031', 'cat-fruits', 'Арбуз', 'Tarvuz', 'Watermelon', '西瓜'],
  ['FR-032', 'cat-fruits', 'Гранат', 'Anor', 'Pomegranate', '石榴'],
  ['FR-033', 'cat-fruits', 'Мандарин', 'Mandarin', 'Mandarin', '橘子'],
  ['FR-034', 'cat-fruits', 'Помело', 'Pomelo', 'Pomelo', '柚子'],
  ['FR-035', 'cat-fruits', 'Кокос', 'Kokos', 'Coconut', '椰子'],
  ['FR-036', 'cat-fruits', 'Папайя', 'Papayya', 'Papaya', '木瓜'],
  ['FR-037', 'cat-fruits', 'Питахайя', 'Pitaxayya', 'Dragon fruit', '火龙果'],
  ['FR-038', 'cat-fruits', 'Личи', 'Lichi', 'Lychee', '荔枝'],
  ['FR-039', 'cat-fruits', 'Фейхоа', 'Feyxoa', 'Feijoa', '菲油果'],
  ['FR-040', 'cat-fruits', 'Яблоко Golden', 'Golden olma', 'Golden apple', '金冠苹果'],
  ['FR-041', 'cat-fruits', 'Яблоко Gala', 'Gala olma', 'Gala apple', '嘎啦苹果'],
  ['FR-042', 'cat-fruits', 'Виноград Кишмиш', 'Kishmish uzumi', 'Kishmish grapes', '无籽葡萄'],
  ['FR-043', 'cat-fruits', 'Виноград Тайфи', 'Toyfi uzumi', 'Taifi grapes', '泰菲葡萄'],

  // Berries and stone fruit traded as a dedicated catalogue group.
  ['BR-008', 'cat-berries', 'Черешня', 'Gilos', 'Sweet cherry', '甜樱桃'],
  ['BR-009', 'cat-berries', 'Вишня', 'Olcha', 'Sour cherry', '酸樱桃'],
  ['BR-010', 'cat-berries', 'Шелковица', 'Tut', 'Mulberry', '桑葚'],
  ['BR-011', 'cat-berries', 'Клюква', 'Klyukva', 'Cranberry', '蔓越莓'],
  ['BR-012', 'cat-berries', 'Крыжовник', 'Krijovnik', 'Gooseberry', '醋栗'],

  // Core local vegetables plus stable imported HoReCa positions.
  ['VG-014', 'cat-vegetables', 'Капуста белокочанная', 'Oq karam', 'White cabbage', '卷心菜'],
  ['VG-015', 'cat-vegetables', 'Капуста краснокочанная', 'Qizil karam', 'Red cabbage', '紫甘蓝'],
  ['VG-016', 'cat-vegetables', 'Цветная капуста', 'Gulkaram', 'Cauliflower', '花椰菜'],
  ['VG-017', 'cat-vegetables', 'Брокколи', 'Brokkoli', 'Broccoli', '西兰花'],
  ['VG-018', 'cat-vegetables', 'Брюссельская капуста', 'Bryussel karami', 'Brussels sprouts', '抱子甘蓝'],
  ['VG-019', 'cat-vegetables', 'Кольраби', 'Kolrabi', 'Kohlrabi', '球茎甘蓝'],
  ['VG-020', 'cat-vegetables', 'Баклажан', 'Baqlajon', 'Eggplant', '茄子'],
  ['VG-021', 'cat-vegetables', 'Кабачок', 'Kabachki', 'Summer squash', '西葫芦'],
  ['VG-022', 'cat-vegetables', 'Цукини', 'Sukini', 'Zucchini', '嫩南瓜'],
  ['VG-023', 'cat-vegetables', 'Тыква', 'Qovoq', 'Pumpkin', '南瓜'],
  ['VG-024', 'cat-vegetables', 'Свёкла', 'Lavlagi', 'Beetroot', '甜菜根'],
  ['VG-025', 'cat-vegetables', 'Дайкон', 'Daykon', 'Daikon', '白萝卜'],
  ['VG-026', 'cat-vegetables', 'Редька зелёная', 'Yashil turp', 'Green radish', '青萝卜'],
  ['VG-027', 'cat-vegetables', 'Редис', 'Rediska', 'Radish', '小萝卜'],
  ['VG-028', 'cat-vegetables', 'Репа', 'Sholg‘om', 'Turnip', '芜菁'],
  ['VG-029', 'cat-vegetables', 'Перец сладкий красный', 'Qizil shirin qalampir', 'Red bell pepper', '红甜椒'],
  ['VG-030', 'cat-vegetables', 'Перец сладкий жёлтый', 'Sariq shirin qalampir', 'Yellow bell pepper', '黄甜椒'],
  ['VG-031', 'cat-vegetables', 'Перец сладкий зелёный', 'Yashil shirin qalampir', 'Green bell pepper', '青甜椒'],
  ['VG-032', 'cat-vegetables', 'Перец острый', 'Achchiq qalampir', 'Hot pepper', '辣椒'],
  ['VG-033', 'cat-vegetables', 'Чеснок', 'Sarimsoq', 'Garlic', '大蒜'],
  ['VG-034', 'cat-vegetables', 'Лук красный', 'Qizil piyoz', 'Red onion', '红洋葱'],
  ['VG-035', 'cat-vegetables', 'Лук белый', 'Oq piyoz', 'White onion', '白洋葱'],
  ['VG-036', 'cat-vegetables', 'Лук-порей', 'Porey piyozi', 'Leek', '韭葱'],
  ['VG-037', 'cat-vegetables', 'Кукуруза свежая', 'Yangi makkajo‘xori', 'Fresh sweet corn', '鲜甜玉米'],
  ['VG-038', 'cat-vegetables', 'Фасоль стручковая', 'Dukkakli loviya', 'Green beans', '四季豆'],
  ['VG-039', 'cat-vegetables', 'Зелёный горошек', 'Yashil no‘xat', 'Green peas', '青豌豆'],
  ['VG-040', 'cat-vegetables', 'Батат', 'Batat', 'Sweet potato', '红薯'],
  ['VG-041', 'cat-vegetables', 'Вешенки', 'Veshenka qo‘ziqorini', 'Oyster mushrooms', '平菇'],
  ['VG-042', 'cat-vegetables', 'Шиитаке', 'Shiitake qo‘ziqorini', 'Shiitake mushrooms', '香菇'],
  ['VG-043', 'cat-vegetables', 'Томаты черри', 'Cherri pomidor', 'Cherry tomatoes', '樱桃番茄'],
  ['VG-044', 'cat-vegetables', 'Огурцы корнишоны', 'Kornishon bodring', 'Gherkin cucumbers', '小黄瓜'],
];

const app = initializeApp(
  { credential: applicationDefault(), projectId, storageBucket: EXPECTED_BUCKET },
  'sanpack-produce-catalog-2026-08',
);
const db = getFirestore(app);
const bucket = getStorage(app).bucket(EXPECTED_BUCKET);

function slugify(value) {
  const transliteration = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return value.toLocaleLowerCase('ru-RU').split('').map((letter) => transliteration[letter] ?? letter)
    .join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
}

function serializeForBackup(value) {
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeForBackup);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeForBackup(item)]));
  }
  return value;
}

function createProduct([code, categoryId, titleRu, titleUz, titleEn, titleZh], sortOrder, now) {
  const categorySlug = categoryId === 'cat-fruits' ? 'frukty' : categoryId === 'cat-berries' ? 'yagody' : 'ovoshchi';
  const kind = categoryId === 'cat-fruits' ? ['фрукт', 'meva', 'fruit', '水果']
    : categoryId === 'cat-berries' ? ['ягода', 'rezavor', 'berry', '浆果']
      : ['овощ', 'sabzavot', 'vegetable', '蔬菜'];
  return {
    id: `price-2026-${code.toLowerCase()}`,
    sku: `SP-${code}`,
    slug: `${slugify(titleRu)}-${code.toLowerCase()}`,
    status: 'published',
    categoryId,
    categorySlug,
    titleRu,
    titleUz,
    titleEn,
    titleZh,
    shortDescriptionRu: `${titleRu}. Актуальную цену уточняйте у менеджера.`,
    shortDescriptionUz: `${titleUz}. Amaldagi narxni menejerdan aniqlashtiring.`,
    shortDescriptionEn: `${titleEn}. Ask a manager for the current price.`,
    shortDescriptionZh: `${titleZh}。当前价格请咨询经理。`,
    descriptionRu: 'Свежая продукция для ресторанов, магазинов и других клиентов HoReCa. Сезонность, наличие и условия поставки уточняйте у менеджера SANPACK.',
    descriptionUz: 'Restoranlar, do‘konlar va HoReCa mijozlari uchun yangi mahsulot. Mavsumiylik, mavjudlik va yetkazib berish shartlarini SANPACK menejeridan aniqlashtiring.',
    descriptionEn: 'Fresh produce for restaurants, retailers and other HoReCa customers. Confirm seasonality, availability and delivery terms with a SANPACK manager.',
    descriptionZh: '面向餐厅、零售商和其他餐饮客户的新鲜农产品。季节、库存和配送条件请咨询 SANPACK 经理。',
    images: [],
    mainImage: '',
    attributes: { product_type: kind[0] },
    variants: [],
    currency: 'UZS',
    showPrice: false,
    stockStatus: 'on_order',
    minimumOrder: 1,
    salesUnit: 'кг',
    unitCode: 'kilogram',
    quantityStep: 1,
    priceMode: 'request',
    availability: 'on_order',
    featured: false,
    newProduct: true,
    ownProduction: false,
    sortOrder,
    seo: {
      titleRu: `${titleRu} — заказать в SANPACK`,
      titleUz: `${titleUz} — SANPACK’dan buyurtma qilish`,
      titleEn: `${titleEn} — order from SANPACK`,
      titleZh: `${titleZh} — SANPACK 订购`,
      descriptionRu: `${titleRu}: цена по запросу, заказ и поставка от SANPACK.`,
      descriptionUz: `${titleUz}: narx so‘rov bo‘yicha, SANPACK’dan buyurtma va yetkazib berish.`,
      descriptionEn: `${titleEn}: price on request, order and delivery from SANPACK.`,
      descriptionZh: `${titleZh}：价格面议，由 SANPACK 接单配送。`,
    },
    createdAt: now,
    updatedAt: now,
    updatedBy: 'produce-catalog-migration-2026-08-29',
  };
}

function requestPricingUpdate(data, now) {
  const titleRu = data.titleRu || 'Свежая продукция';
  const titleUz = data.titleUz || titleRu;
  const titleEn = data.titleEn || titleRu;
  const titleZh = data.titleZh || titleRu;
  return {
    price: FieldValue.delete(),
    oldPrice: FieldValue.delete(),
    showPrice: false,
    priceMode: 'request',
    shortDescriptionRu: `${titleRu}. Актуальную цену уточняйте у менеджера.`,
    shortDescriptionUz: `${titleUz}. Amaldagi narxni menejerdan aniqlashtiring.`,
    shortDescriptionEn: `${titleEn}. Ask a manager for the current price.`,
    shortDescriptionZh: `${titleZh}。当前价格请咨询经理。`,
    'seo.descriptionRu': `${titleRu}: цена по запросу. Заказ и поставка от SANPACK.`,
    'seo.descriptionUz': `${titleUz}: narx so‘rov bo‘yicha. SANPACK’dan buyurtma va yetkazib berish.`,
    'seo.descriptionEn': `${titleEn}: price on request. Order and delivery from SANPACK.`,
    'seo.descriptionZh': `${titleZh}：价格面议，由 SANPACK 接单配送。`,
    updatedAt: now,
    updatedBy: 'produce-catalog-migration-2026-08-29',
  };
}

async function uploadCatalogImage(localPath, storagePath) {
  const token = randomUUID();
  await bucket.upload(localPath, {
    destination: storagePath,
    resumable: false,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=31536000,immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(EXPECTED_BUCKET)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

try {
  const snapshot = await db.collection('products').where('categoryId', 'in', [...TARGET_CATEGORY_IDS]).get();
  const existingProduce = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  const existingIds = new Set(existingProduce.map((product) => product.id));
  const existingSkus = new Set(existingProduce.map((product) => product.sku));
  const conflicts = assortment.filter(([code]) => existingIds.has(`price-2026-${code.toLowerCase()}`) || existingSkus.has(`SP-${code}`));
  const pricedVariants = existingProduce.filter((product) => (product.variants || []).some((variant) => typeof variant.price === 'number'));

  if (conflicts.length) throw new Error(`Обнаружены конфликтующие новые позиции: ${conflicts.map(([code]) => code).join(', ')}.`);
  if (pricedVariants.length) throw new Error(`Найдены ценовые варианты, требующие ручной миграции: ${pricedVariants.map((product) => product.id).join(', ')}.`);

  console.log(JSON.stringify({
    projectId,
    apply,
    existingProduce: existingProduce.length,
    newProducts: assortment.length,
    totalsAfter: {
      fruits: existingProduce.filter((item) => item.categoryId === 'cat-fruits').length + assortment.filter((item) => item[1] === 'cat-fruits').length,
      berries: existingProduce.filter((item) => item.categoryId === 'cat-berries').length + assortment.filter((item) => item[1] === 'cat-berries').length,
      vegetables: existingProduce.filter((item) => item.categoryId === 'cat-vegetables').length + assortment.filter((item) => item[1] === 'cat-vegetables').length,
    },
  }, null, 2));

  if (!apply) {
    console.log('Контрольный прогон завершён. Для записи повторите команду с --apply.');
  } else {
    const backupPath = '/tmp/sanpack-produce-backup-2026-08-29.json';
    await mkdir(dirname(backupPath), { recursive: true });
    await writeFile(backupPath, JSON.stringify(existingProduce.map(serializeForBackup), null, 2), { mode: 0o600 });

    const root = resolve(import.meta.dirname, '..');
    const uploads = [
      {
        id: 'price-2026-vg-007',
        localPath: resolve(root, 'public/catalog/generated-products/price-2026-vg-007-v2.webp'),
        storagePath: 'media/products/manual-corrections/sp-vg-007-rava-cucumbers-v2.webp',
      },
      {
        id: 'price-2026-vg-012',
        localPath: resolve(root, 'public/catalog/generated-products/price-2026-vg-012-v2.webp'),
        storagePath: 'media/products/manual-corrections/sp-vg-012-champignons-v2.webp',
      },
    ];
    for (const upload of uploads) await readFile(upload.localPath);

    const uploadedPaths = [];
    try {
      for (const upload of uploads) {
        upload.url = await uploadCatalogImage(upload.localPath, upload.storagePath);
        uploadedPaths.push(upload.storagePath);
      }

      const now = new Date().toISOString();
      const batch = db.batch();
      for (const product of existingProduce) {
        batch.update(db.collection('products').doc(product.id), requestPricingUpdate(product, now));
      }
      for (const [index, item] of assortment.entries()) {
        const product = createProduct(item, 1000 + index, now);
        batch.create(db.collection('products').doc(product.id), product);
      }
      for (const upload of uploads) {
        batch.update(db.collection('products').doc(upload.id), {
          mainImage: upload.url,
          images: [upload.url],
          mainImagePath: upload.storagePath,
          imagePaths: [upload.storagePath],
          updatedAt: now,
          updatedBy: 'produce-catalog-migration-2026-08-29',
        });
      }
      await batch.commit();
    } catch (error) {
      await Promise.allSettled(uploadedPaths.map((path) => bucket.file(path).delete({ ignoreNotFound: true })));
      throw error;
    }

    const verification = await db.collection('products').where('categoryId', 'in', [...TARGET_CATEGORY_IDS]).get();
    const invalidPricing = verification.docs.filter((document) => {
      const data = document.data();
      return data.showPrice !== false || data.priceMode !== 'request' || typeof data.price === 'number' || typeof data.oldPrice === 'number';
    });
    const missingNew = assortment.filter(([code]) => !verification.docs.some((document) => document.id === `price-2026-${code.toLowerCase()}`));
    const imageErrors = ['price-2026-vg-007', 'price-2026-vg-012'].filter((id) => {
      const data = verification.docs.find((document) => document.id === id)?.data();
      return !data?.mainImagePath?.includes('manual-corrections') || data.images?.length !== 1;
    });

    if (invalidPricing.length || missingNew.length || imageErrors.length) {
      throw new Error(`Проверка не пройдена: pricing=${invalidPricing.length}; missing=${missingNew.length}; images=${imageErrors.length}.`);
    }
    console.log(JSON.stringify({
      success: true,
      updatedExisting: existingProduce.length,
      created: assortment.length,
      totalProduce: verification.size,
      invalidPricing: 0,
      imageUpdates: 2,
      backupPath,
    }, null, 2));
  }
} finally {
  await deleteApp(app);
}
