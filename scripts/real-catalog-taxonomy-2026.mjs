import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = 'stamply-4df8a';
const INVENTORY_SOURCE = '329b75e556e51704a5d3c24ecb0505ae7526aeab';
const EXPECTED_COUNTS = { products: 238, categories: 27, attributes: 16, published: 238 };
const EXPECTED_TARGET_COUNTS = { ...EXPECTED_COUNTS, categories: 31 };
const ARTIFACT_PATH = resolve('docs/catalog/production-taxonomy-map-2026-09.json');
const BACKUP_ROOT = '/private/tmp/sanpack-production-backups';
const ACTOR = 'catalog-taxonomy-migration-2026-09-14';

const apply = process.argv.includes('--apply');
const writeArtifact = process.argv.includes('--write-artifact');
const rollbackArgument = process.argv.find((argument) => argument.startsWith('--rollback='));
const confirmedProject = process.argv.find((argument) => argument.startsWith('--project='))?.split('=')[1];

if ((apply || rollbackArgument) && confirmedProject !== PROJECT_ID) {
  throw new Error(`Production mutation requires --project=${PROJECT_ID}.`);
}
if (apply && rollbackArgument) throw new Error('Choose either --apply or --rollback, not both.');

const newCategories = [
  {
    id: 'cat-bags', parentId: 'cat-packaging', slug: 'pakety-i-meshki',
    titleRu: 'Пакеты и мешки', titleUz: 'Paketlar va qoplar', titleEn: 'Bags and sacks', titleZh: '塑料袋和垃圾袋',
    descriptionRu: 'Мусорные, фасовочные, вакуумные и другие пакеты для HoReCa и бизнеса.',
    descriptionUz: 'HoReCa va biznes uchun chiqindi, qadoqlash, vakuum va boshqa paketlar.',
    descriptionEn: 'Waste, food, vacuum and other bags for HoReCa and business use.',
    descriptionZh: '适用于餐饮业和企业的垃圾袋、食品袋、真空袋及其他包装袋。',
    image: '/catalog/category-icons-v3/packaging.webp', navigationImage: '/catalog/category-icons-v3/packaging.webp',
    cardImage: '/catalog/categories/packaging_hero.webp', icon: 'Package', featured: false, status: 'active', sortOrder: 10,
  },
  {
    id: 'cat-meat-poultry-eggs', parentId: 'cat-food', slug: 'myaso-ptitsa-yaytsa',
    titleRu: 'Мясо, птица и яйца', titleUz: 'Go‘sht, parranda va tuxum', titleEn: 'Meat, poultry and eggs', titleZh: '肉类、禽类和鸡蛋',
    descriptionRu: 'Говядина, курица и яйца для ресторанов, кафе и профессиональной кухни.',
    descriptionUz: 'Restoranlar, kafelar va professional oshxonalar uchun mol go‘shti, tovuq va tuxum.',
    descriptionEn: 'Beef, chicken and eggs for restaurants, cafés and professional kitchens.',
    descriptionZh: '面向餐厅、咖啡馆和专业厨房的牛肉、鸡肉和鸡蛋。',
    image: '/catalog/category-icons-v3/food.webp', navigationImage: '/catalog/category-icons-v3/food.webp',
    cardImage: '/catalog/categories/food_hero.webp', icon: 'Beef', featured: false, status: 'active', sortOrder: 20,
  },
  {
    id: 'cat-grocery', parentId: 'cat-food', slug: 'bakaleya-i-ingredienty',
    titleRu: 'Бакалея и ингредиенты', titleUz: 'Bakaleya va ingredientlar', titleEn: 'Grocery and ingredients', titleZh: '杂货和烘焙原料',
    descriptionRu: 'Мука, крупы, масла, соль, сахар, соусы и ингредиенты для кухни и выпечки.',
    descriptionUz: 'Oshxona va pishiriq uchun un, yorma, yog‘, tuz, shakar, sous va ingredientlar.',
    descriptionEn: 'Flour, grains, oils, salt, sugar, sauces and ingredients for cooking and baking.',
    descriptionZh: '用于烹饪和烘焙的面粉、谷物、食用油、盐、糖、酱料和配料。',
    image: '/catalog/category-icons-v3/groats.webp', navigationImage: '/catalog/category-icons-v3/groats.webp',
    cardImage: '/catalog/categories/groats.webp', icon: 'Wheat', featured: false, status: 'active', sortOrder: 23,
  },
  {
    id: 'cat-fresh-produce', parentId: 'cat-food', slug: 'ovoshchi-frukty-zelen',
    titleRu: 'Овощи, фрукты и зелень', titleUz: 'Sabzavotlar, mevalar va ko‘katlar', titleEn: 'Fruit, vegetables and herbs', titleZh: '水果、蔬菜和香草',
    descriptionRu: 'Свежие овощи, фрукты, ягоды, салаты, зелень и микрозелень для HoReCa.',
    descriptionUz: 'HoReCa uchun yangi sabzavot, meva, rezavor, salat, ko‘kat va mikroko‘katlar.',
    descriptionEn: 'Fresh vegetables, fruit, berries, salads, herbs and microgreens for HoReCa.',
    descriptionZh: '面向餐饮业的新鲜蔬菜、水果、浆果、沙拉菜、香草和微型蔬菜。',
    image: '/catalog/category-icons-v3/vegetables.webp', navigationImage: '/catalog/category-icons-v3/vegetables.webp',
    cardImage: '/catalog/categories/vegetables.webp', icon: 'LeafyGreen', featured: false, status: 'active', sortOrder: 27,
  },
];

const categoryPatches = {
  'cat-trash-bags': { parentId: 'cat-bags', featured: true },
  'cat-tearoff-bags': { parentId: 'cat-bags', featured: true },
  'cat-carrier-bags': { parentId: 'cat-bags', featured: true },
  'cat-special-bags': { parentId: 'cat-bags', featured: true },
  'cat-beef': { parentId: 'cat-meat-poultry-eggs' },
  'cat-chicken': { parentId: 'cat-meat-poultry-eggs' },
  'cat-eggs': { parentId: 'cat-meat-poultry-eggs' },
  'cat-flour': { parentId: 'cat-grocery' },
  'cat-sugar': { parentId: 'cat-grocery' },
  'cat-groats': { parentId: 'cat-grocery' },
  'cat-oils': { parentId: 'cat-grocery' },
  'cat-salt': { parentId: 'cat-grocery' },
  'cat-baking-ingredients': { parentId: 'cat-grocery' },
  'cat-tomato-sauces': { parentId: 'cat-grocery' },
  'cat-fruits': { parentId: 'cat-fresh-produce' },
  'cat-berries': { parentId: 'cat-fresh-produce' },
  'cat-vegetables': { parentId: 'cat-fresh-produce' },
  'cat-greens': {
    parentId: 'cat-fresh-produce',
    titleRu: 'Салаты, зелень и пряные травы',
    titleUz: 'Salatlar, ko‘katlar va ziravor o‘tlar',
    titleEn: 'Salads, greens and herbs',
    titleZh: '沙拉菜、绿叶菜和香草',
  },
  'cat-microgreens': { parentId: 'cat-fresh-produce' },
  'cat-paper-goods': {
    titleRu: 'Бумажная продукция и салфетки',
    titleUz: 'Qog‘oz mahsulotlari va salfetkalar',
    titleEn: 'Paper products and wipes',
    titleZh: '纸制品和湿巾',
  },
};

const mediaRepairs = {
  'price-2026-gn-027': '/catalog/generated-products/price-2026-gn-027.webp',
  'price-2026-pg-007': '/catalog/generated-products/price-2026-pg-007.webp',
  'price-2026-tb-004': '/catalog/generated-products/price-2026-tb-004.webp',
  'price-2026-vb-001': '/catalog/generated-products/price-2026-vb-001.webp',
  'price-2026-vb-002': '/catalog/generated-products/price-2026-vb-002.webp',
  'price-2026-vb-003': '/catalog/generated-products/price-2026-vb-003.webp',
};

function comparable(value) {
  if (value instanceof Timestamp) return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, comparable(item)]));
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(comparable(value))).digest('hex');
}

function fieldEqual(left, right) {
  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
}

function changedPatch(current, target) {
  return Object.fromEntries(Object.entries(target).filter(([key, value]) => !fieldEqual(current?.[key], value)));
}

function getDepth(category, byId) {
  const seen = new Set();
  let current = category;
  let depth = 0;
  while (current?.parentId) {
    if (seen.has(current.id)) return undefined;
    seen.add(current.id);
    current = byId.get(current.parentId);
    if (!current) return undefined;
    depth += 1;
  }
  return current ? depth : undefined;
}

function validateState(categories, products) {
  const errors = [];
  const byId = new Map(categories.map((category) => [category.id, category]));
  const slugs = new Map();
  for (const category of categories) {
    const depth = getDepth(category, byId);
    if (depth === undefined) errors.push(`Invalid lineage: ${category.id}`);
    if (depth !== undefined && depth > 2) errors.push(`Depth > 2: ${category.id}`);
    const owner = slugs.get(category.slug);
    if (owner) errors.push(`Duplicate slug ${category.slug}: ${owner}, ${category.id}`);
    slugs.set(category.slug, category.id);
  }
  for (const product of products) {
    const category = byId.get(product.categoryId);
    const depth = category ? getDepth(category, byId) : undefined;
    if (!category) errors.push(`Orphan Product ${product.id}: ${product.categoryId}`);
    else if (depth !== 1 && depth !== 2) errors.push(`Invalid Product placement ${product.id}: depth ${depth}`);
    else {
      let current = category;
      while (current) {
        if (product.status === 'published' && current.status !== 'active') errors.push(`Published Product has hidden lineage ${product.id}: ${current.id}`);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }
  }
  return errors;
}

function safeBaseline(categories, products, attributes) {
  return {
    categories: categories.map((category) => ({
      id: category.id, parentId: category.parentId ?? null, slug: category.slug, status: category.status,
      titleRu: category.titleRu, titleUz: category.titleUz, titleEn: category.titleEn, titleZh: category.titleZh,
      sortOrder: category.sortOrder, featured: category.featured, featuredSortOrder: category.featuredSortOrder,
    })).sort((left, right) => left.id.localeCompare(right.id)),
    products: products.map((product) => ({
      id: product.id, sku: product.sku, categoryId: product.categoryId, categorySlug: product.categorySlug,
      status: product.status, hasMainImage: Boolean(product.mainImage), imageCount: product.images?.length ?? 0,
    })).sort((left, right) => left.id.localeCompare(right.id)),
    attributes: attributes.map((attribute) => ({ id: attribute.id, key: attribute.key, categoryIds: attribute.categoryIds ?? [] }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function planMigration(categories, products, attributes) {
  const currentById = new Map(categories.map((category) => [category.id, category]));
  const categoryCreates = [];
  const categoryUpdates = [];
  for (const target of newCategories) {
    const current = currentById.get(target.id);
    if (!current) categoryCreates.push(target);
    else {
      const patch = changedPatch(current, target);
      if (Object.keys(patch).length) categoryUpdates.push({ id: target.id, patch });
    }
  }
  for (const [id, targetPatch] of Object.entries(categoryPatches)) {
    const current = currentById.get(id);
    if (!current) throw new Error(`Expected production Category is missing: ${id}`);
    const patch = changedPatch(current, targetPatch);
    if (Object.keys(patch).length) categoryUpdates.push({ id, patch });
  }

  const productUpdates = [];
  for (const [id, image] of Object.entries(mediaRepairs)) {
    const current = products.find((product) => product.id === id);
    if (!current) throw new Error(`Expected production Product is missing: ${id}`);
    if (current.mainImage && current.mainImage !== image) {
      throw new Error(`Refusing to replace an existing Product image: ${id}`);
    }
    const patch = changedPatch(current, { mainImage: image, mainImagePath: image, images: [image], imagePaths: [image] });
    if (Object.keys(patch).length) productUpdates.push({ id, patch, reason: 'Promote the existing correct local compatibility image to explicit Product media.' });
  }

  const targetCategories = categories
    .filter((category) => !newCategories.some((target) => target.id === category.id))
    .map((category) => ({ ...category, ...(categoryPatches[category.id] ?? {}) }));
  for (const category of newCategories) targetCategories.push(category);
  const targetProducts = products.map((product) => {
    const repair = mediaRepairs[product.id];
    return repair ? { ...product, mainImage: repair, mainImagePath: repair, images: [repair], imagePaths: [repair] } : product;
  });
  const errors = validateState(targetCategories, targetProducts);
  const baseline = safeBaseline(categories, products, attributes);
  const productMappings = products.slice().sort((left, right) => left.id.localeCompare(right.id)).map((product) => ({
    productId: product.id, sku: product.sku, currentCategoryId: product.categoryId, targetCategoryId: product.categoryId, status: 'unchanged',
  }));

  const reparented = categoryUpdates.filter((operation) => Object.hasOwn(operation.patch, 'parentId'));
  return {
    baseline,
    baselineDigest: digest(baseline),
    categoryCreates,
    categoryUpdates,
    productUpdates,
    productMappings,
    targetCategories,
    targetProducts,
    errors,
    summary: {
      productsBefore: products.length,
      productsAfter: targetProducts.length,
      publishedBefore: products.filter((product) => product.status === 'published').length,
      publishedAfter: targetProducts.filter((product) => product.status === 'published').length,
      productsMoved: 0,
      productsUnchanged: productMappings.length,
      categoriesBefore: categories.length,
      categoriesAfter: targetCategories.length,
      categoriesCreated: categoryCreates.length,
      categoriesChanged: categoryUpdates.length,
      reparentedCategories: reparented.length,
      explicitMediaRepairs: productUpdates.length,
      orphanProducts: errors.filter((error) => error.startsWith('Orphan')).length,
      invalidLineage: errors.filter((error) => error.includes('lineage') || error.includes('Depth')).length,
      duplicateSlugs: errors.filter((error) => error.startsWith('Duplicate slug')).length,
      ambiguousProducts: 4,
    },
  };
}

function encodeBackup(value) {
  if (value instanceof Timestamp) return { __firestoreType: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (Array.isArray(value)) return value.map(encodeBackup);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeBackup(item)]));
  return value;
}

function decodeBackup(value) {
  if (Array.isArray(value)) return value.map(decodeBackup);
  if (value && typeof value === 'object') {
    if (value.__firestoreType === 'timestamp') return new Timestamp(value.seconds, value.nanoseconds);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeBackup(item)]));
  }
  return value;
}

async function loadInventory(database) {
  const [categorySnapshot, productSnapshot, attributeSnapshot] = await Promise.all([
    database.collection('categories').get(), database.collection('products').get(), database.collection('attributes').get(),
  ]);
  return {
    categorySnapshot,
    productSnapshot,
    categories: categorySnapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
    products: productSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
    attributes: attributeSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
  };
}

function inventoryCounts(plan) {
  return {
    products: plan.summary.productsBefore,
    categories: plan.summary.categoriesBefore,
    attributes: plan.baseline.attributes.length,
    published: plan.summary.publishedBefore,
  };
}

function assertInvariants(plan) {
  if (plan.errors.length) throw new Error(`Target invariants failed:\n${plan.errors.join('\n')}`);
}

function assertExpectedBaseline(plan) {
  const actual = inventoryCounts(plan);
  if (!fieldEqual(actual, EXPECTED_COUNTS)) throw new Error(`Production inventory changed: expected ${JSON.stringify(EXPECTED_COUNTS)}, received ${JSON.stringify(actual)}.`);
  assertInvariants(plan);
}

function assertExpectedTarget(plan) {
  const actual = inventoryCounts(plan);
  if (!fieldEqual(actual, EXPECTED_TARGET_COUNTS)) throw new Error(`Post-apply inventory mismatch: expected ${JSON.stringify(EXPECTED_TARGET_COUNTS)}, received ${JSON.stringify(actual)}.`);
  assertInvariants(plan);
}

function assertKnownCatalogState(plan) {
  const actual = inventoryCounts(plan);
  if (!fieldEqual(actual, EXPECTED_COUNTS) && !fieldEqual(actual, EXPECTED_TARGET_COUNTS)) {
    throw new Error(`Production inventory changed: expected initial ${JSON.stringify(EXPECTED_COUNTS)} or target ${JSON.stringify(EXPECTED_TARGET_COUNTS)}, received ${JSON.stringify(actual)}.`);
  }
  assertInvariants(plan);
}

function publicArtifact(plan) {
  return {
    version: 1,
    projectId: PROJECT_ID,
    inventorySourceRevision: INVENTORY_SOURCE,
    plannedDate: '2026-09-14',
    baselineDigest: plan.baselineDigest,
    baselineCounts: EXPECTED_COUNTS,
    baselineTaxonomy: plan.baseline.categories,
    targetCounts: {
      products: plan.summary.productsAfter,
      categories: plan.summary.categoriesAfter,
      published: plan.summary.publishedAfter,
      expectedCanonicalTaxonomyUrls: plan.summary.categoriesAfter * 4,
      expectedCanonicalProductUrls: plan.summary.productsAfter * 4,
      expectedSitemapDelta: plan.summary.categoriesCreated * 4,
    },
    strategy: {
      model: 'Group -> Category -> optional Subcategory -> Product',
      productIdsPreserved: true,
      productCategoryIdsPreserved: true,
      existingSlugsPreserved: true,
      legacyFlatSubcategoryUrls: '308 redirect to the existing slug under its new Category parent',
      historicalRequestsAndAnalytics: 'not rewritten',
      zhFallback: 'existing untranslated nodes keep the established EN -> RU/UZ fallback; all newly created or renamed nodes include explicit ZH',
    },
    summary: plan.summary,
    taxonomyCreates: plan.categoryCreates,
    taxonomyUpdates: plan.categoryUpdates,
    productMappings: plan.productMappings,
    mediaRepairs: plan.productUpdates,
    ambiguousProducts: [
      { sku: 'SP-GR-013', titleRu: 'Ош магиз — изюм для плова', decision: 'Keep in Крупы и бобовые until the owner confirms a dried-fruit/spice assortment expansion.' },
      { sku: 'SP-GR-014', titleRu: 'Кунжут белый', decision: 'Keep in Крупы и бобовые; do not create a one-purpose seed node for the current small assortment.' },
      { sku: 'SP-GR-015', titleRu: 'Кунжут красный', decision: 'Keep in Крупы и бобовые; do not create a one-purpose seed node for the current small assortment.' },
      { sku: 'SP-GR-016', titleRu: 'Чёрный тмин — qora sedana', decision: 'Keep in Крупы и бобовые until a broader spices category is commercially confirmed.' },
    ],
    manualContentReview: [
      'Confirm supplier-specific beef cut names (Ташки сон, Чарви, Сарпанжа) before rewriting authoritative Product titles.',
      'The seven duplicate-image groups are candidates only; no asset was deleted or reassigned without authoritative alternate media.',
      'Existing category/Product ZH gaps continue to use the established fallback; no bulk machine copy was generated.',
    ],
  };
}

async function writeMappingArtifact(plan) {
  const artifact = publicArtifact(plan);
  await mkdir(dirname(ARTIFACT_PATH), { recursive: true });
  await writeFile(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return ARTIFACT_PATH;
}

async function createBackup(database, inventory, plan) {
  const ids = {
    categories: [...plan.categoryCreates.map(({ id }) => id), ...plan.categoryUpdates.map(({ id }) => id)],
    products: plan.productUpdates.map(({ id }) => id),
  };
  const snapshots = await Promise.all([
    ...ids.categories.map((id) => database.doc(`categories/${id}`).get()),
    ...ids.products.map((id) => database.doc(`products/${id}`).get()),
  ]);
  const backup = {
    version: 1, projectId: PROJECT_ID, createdAt: new Date().toISOString(), sourceRevision: INVENTORY_SOURCE,
    baselineDigest: plan.baselineDigest, counts: { categories: ids.categories.length, products: ids.products.length },
    documents: snapshots.map((snapshot) => ({ path: snapshot.ref.path, exists: snapshot.exists, data: snapshot.exists ? encodeBackup(snapshot.data()) : null })),
  };
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const path = `${BACKUP_ROOT}/real-catalog-taxonomy-${stamp}.json`;
  await mkdir(BACKUP_ROOT, { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(backup, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
  return path;
}

async function applyPlan(database, inventory, plan) {
  assertExpectedBaseline(plan);
  const backupPath = await createBackup(database, inventory, plan);
  const now = new Date().toISOString();
  const snapshots = new Map([
    ...inventory.categorySnapshot.docs.map((snapshot) => [`categories/${snapshot.id}`, snapshot]),
    ...inventory.productSnapshot.docs.map((snapshot) => [`products/${snapshot.id}`, snapshot]),
  ]);
  const batch = database.batch();
  for (const category of plan.categoryCreates) {
    batch.create(database.doc(`categories/${category.id}`), {
      ...category, createdAt: now, updatedAt: now, createdBy: ACTOR, updatedBy: ACTOR,
    });
  }
  for (const operation of plan.categoryUpdates) {
    const snapshot = snapshots.get(`categories/${operation.id}`);
    batch.update(database.doc(`categories/${operation.id}`), { ...operation.patch, updatedAt: now, updatedBy: ACTOR }, { lastUpdateTime: snapshot.updateTime });
  }
  for (const operation of plan.productUpdates) {
    const snapshot = snapshots.get(`products/${operation.id}`);
    batch.update(database.doc(`products/${operation.id}`), { ...operation.patch, updatedAt: now, updatedBy: ACTOR }, { lastUpdateTime: snapshot.updateTime });
  }
  await batch.commit();
  const verificationInventory = await loadInventory(database);
  const verificationPlan = planMigration(verificationInventory.categories, verificationInventory.products, verificationInventory.attributes);
  assertExpectedTarget(verificationPlan);
  if (verificationPlan.categoryCreates.length || verificationPlan.categoryUpdates.length || verificationPlan.productUpdates.length) {
    throw new Error('Post-apply verification found unapplied operations. Use the backup for deterministic recovery.');
  }
  return { backupPath, verifiedDigest: verificationPlan.baselineDigest };
}

async function rollback(database, backupPath) {
  const backup = JSON.parse(await readFile(resolve(backupPath), 'utf8'));
  if (backup.projectId !== PROJECT_ID || !Array.isArray(backup.documents)) throw new Error('Invalid catalog backup.');
  const batch = database.batch();
  for (const document of backup.documents) {
    const reference = database.doc(document.path);
    if (document.exists) batch.set(reference, decodeBackup(document.data));
    else batch.delete(reference);
  }
  await batch.commit();
  return { restored: backup.documents.filter((document) => document.exists).length, removedCreated: backup.documents.filter((document) => !document.exists).length };
}

const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID }, `real-catalog-taxonomy-${Date.now()}`);
const database = getFirestore(app);

try {
  if (rollbackArgument) {
    const result = await rollback(database, rollbackArgument.slice('--rollback='.length));
    console.log(JSON.stringify({ mode: 'rollback', projectId: PROJECT_ID, ...result }, null, 2));
  } else {
    const inventory = await loadInventory(database);
    const plan = planMigration(inventory.categories, inventory.products, inventory.attributes);
    if (apply) assertExpectedBaseline(plan);
    else assertKnownCatalogState(plan);
    const artifactPath = writeArtifact ? await writeMappingArtifact(plan) : undefined;
    if (apply) {
      const result = await applyPlan(database, inventory, plan);
      console.log(JSON.stringify({ mode: 'apply', projectId: PROJECT_ID, summary: plan.summary, artifactPath, ...result }, null, 2));
    } else {
      console.log(JSON.stringify({ mode: 'dry-run', projectId: PROJECT_ID, summary: plan.summary, baselineDigest: plan.baselineDigest, artifactPath, blockers: plan.errors }, null, 2));
      console.log('No production documents were written.');
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('invalid_rapt') || message.includes('invalid_grant')) {
    console.error('Catalog operation requires refreshed Application Default Credentials. Run npm run firebase:login, then retry.');
  } else {
    console.error(`Real catalog taxonomy operation failed: ${message}`);
  }
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
