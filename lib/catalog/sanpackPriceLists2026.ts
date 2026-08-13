import type { Attribute, Category, Product, QuantityUnit } from '@/types';

const IMPORTED_AT = '2026-08-12T00:00:00.000Z';
const PLACEHOLDER_IMAGE = '/catalog/product-placeholder.svg';

type PriceRow = {
  code: string;
  categoryId: string;
  name: string;
  price: number;
  salesUnit: string;
  unitCode: QuantityUnit;
  attributes?: Record<string, string | number | boolean | string[]>;
  brandName?: string;
  minimumOrder?: number;
  ownProduction?: boolean;
  variants?: Array<{
    id: string;
    label: string;
    price: number;
    attributes: Record<string, string>;
  }>;
};

const row = (
  code: string,
  categoryId: string,
  name: string,
  price: number,
  salesUnit: string,
  unitCode: QuantityUnit,
  attributes: PriceRow['attributes'] = {},
  extra: Pick<PriceRow, 'brandName' | 'minimumOrder' | 'ownProduction' | 'variants'> = {},
): PriceRow => ({ code, categoryId, name, price, salesUnit, unitCode, attributes, ...extra });

export const priceList2026Categories: Category[] = [
  { id: 'cat-packaging', slug: 'upakovka', titleRu: 'Упаковка и расходные материалы', titleUz: 'Qadoqlash va sarf materiallari', titleEn: 'Packaging and consumables', image: PLACEHOLDER_IMAGE, icon: 'Package', status: 'active', sortOrder: 1 },
  { id: 'cat-trash-bags', parentId: 'cat-packaging', slug: 'musornye-pakety', titleRu: 'Мусорные пакеты', titleUz: 'Chiqindi paketlari', titleEn: 'Refuse bags', image: PLACEHOLDER_IMAGE, icon: 'Trash2', status: 'active', sortOrder: 10 },
  { id: 'cat-tearoff-bags', parentId: 'cat-packaging', slug: 'otryvnye-pakety', titleRu: 'Отрывные пакеты', titleUz: 'Uziladigan paketlar', titleEn: 'Perforated bags', image: PLACEHOLDER_IMAGE, icon: 'Layers', status: 'active', sortOrder: 11 },
  { id: 'cat-carrier-bags', parentId: 'cat-packaging', slug: 'pakety-mayka', titleRu: 'Пакеты «Майка»', titleUz: 'Mayka paketlar', titleEn: 'T-shirt carrier bags', image: PLACEHOLDER_IMAGE, icon: 'ShoppingBag', status: 'active', sortOrder: 12 },
  { id: 'cat-special-bags', parentId: 'cat-packaging', slug: 'vakuumnye-i-pizza-pakety', titleRu: 'Вакуумные пакеты и пакеты для пиццы', titleUz: 'Vakuum va pitsa paketlari', titleEn: 'Vacuum and pizza bags', image: PLACEHOLDER_IMAGE, icon: 'PackageOpen', status: 'active', sortOrder: 13 },
  { id: 'cat-food-packaging', parentId: 'cat-packaging', slug: 'upakovka-dlya-produktov', titleRu: 'Упаковка для пищевых продуктов', titleUz: 'Oziq-ovqat qadoqlari', titleEn: 'Food packaging', image: PLACEHOLDER_IMAGE, icon: 'Film', status: 'active', sortOrder: 14 },
  { id: 'cat-gloves', parentId: 'cat-packaging', slug: 'perchatki', titleRu: 'Перчатки', titleUz: 'Qo‘lqoplar', titleEn: 'Gloves', image: PLACEHOLDER_IMAGE, icon: 'Hand', status: 'active', sortOrder: 15 },
  { id: 'cat-cleaning', parentId: 'cat-packaging', slug: 'khoztovary', titleRu: 'Хозяйственные товары', titleUz: 'Xo‘jalik mollari', titleEn: 'Cleaning supplies', image: PLACEHOLDER_IMAGE, icon: 'Sparkles', status: 'active', sortOrder: 16 },
  { id: 'cat-paper-goods', parentId: 'cat-packaging', slug: 'bumazhnaya-produktsiya', titleRu: 'Бумажная продукция', titleUz: 'Qog‘oz mahsulotlari', titleEn: 'Paper products', image: PLACEHOLDER_IMAGE, icon: 'ScrollText', status: 'active', sortOrder: 17 },

  { id: 'cat-food', slug: 'produkty-pitaniya', titleRu: 'Продукты питания', titleUz: 'Oziq-ovqat mahsulotlari', titleEn: 'Food products', image: PLACEHOLDER_IMAGE, icon: 'Utensils', status: 'active', sortOrder: 2 },
  { id: 'cat-beef', parentId: 'cat-food', slug: 'govyadina', titleRu: 'Говядина', titleUz: 'Mol go‘shti', titleEn: 'Beef', image: PLACEHOLDER_IMAGE, icon: 'Beef', status: 'active', sortOrder: 20 },
  { id: 'cat-chicken', parentId: 'cat-food', slug: 'kuritsa', titleRu: 'Курица', titleUz: 'Tovuq go‘shti', titleEn: 'Chicken', image: PLACEHOLDER_IMAGE, icon: 'Drumstick', status: 'active', sortOrder: 21 },
  { id: 'cat-eggs', parentId: 'cat-food', slug: 'yaytsa', titleRu: 'Куриные яйца', titleUz: 'Tovuq tuxumlari', titleEn: 'Chicken eggs', image: PLACEHOLDER_IMAGE, icon: 'Egg', status: 'active', sortOrder: 22 },
  { id: 'cat-flour', parentId: 'cat-food', slug: 'muka', titleRu: 'Мука', titleUz: 'Un', titleEn: 'Flour', image: PLACEHOLDER_IMAGE, icon: 'Wheat', status: 'active', sortOrder: 23 },
  { id: 'cat-sugar', parentId: 'cat-food', slug: 'sakhar', titleRu: 'Сахар', titleUz: 'Shakar', titleEn: 'Sugar', image: PLACEHOLDER_IMAGE, icon: 'Box', status: 'active', sortOrder: 24 },
  { id: 'cat-groats', parentId: 'cat-food', slug: 'krupy-i-bobovye', titleRu: 'Крупы и бобовые', titleUz: 'Yorma va dukkaklilar', titleEn: 'Grains and pulses', image: PLACEHOLDER_IMAGE, icon: 'Wheat', status: 'active', sortOrder: 25 },
  { id: 'cat-oils', parentId: 'cat-food', slug: 'rastitelnye-masla', titleRu: 'Растительные и фритюрные масла', titleUz: 'O‘simlik va fritür moylari', titleEn: 'Cooking and frying oils', image: PLACEHOLDER_IMAGE, icon: 'Bottle', status: 'active', sortOrder: 26 },
  { id: 'cat-fruits', parentId: 'cat-food', slug: 'frukty', titleRu: 'Фрукты', titleUz: 'Mevalar', titleEn: 'Fruit', image: PLACEHOLDER_IMAGE, icon: 'Apple', status: 'active', sortOrder: 27 },
  { id: 'cat-greens', parentId: 'cat-food', slug: 'svezhaya-zelen', titleRu: 'Свежая зелень Novagreen', titleUz: 'Novagreen yangi ko‘katlari', titleEn: 'Fresh Novagreen greens', image: PLACEHOLDER_IMAGE, icon: 'Leaf', status: 'active', sortOrder: 28 },
  { id: 'cat-microgreens', parentId: 'cat-food', slug: 'mikrozelen', titleRu: 'Микрозелень', titleUz: 'Mikroko‘katlar', titleEn: 'Microgreens', image: PLACEHOLDER_IMAGE, icon: 'Sprout', status: 'active', sortOrder: 29 },
  { id: 'cat-dairy', parentId: 'cat-food', slug: 'molochnaya-produktsiya', titleRu: 'Молочная продукция', titleUz: 'Sut mahsulotlari', titleEn: 'Dairy products', image: PLACEHOLDER_IMAGE, icon: 'Milk', status: 'active', sortOrder: 30 },
];

export const priceList2026Attributes: Attribute[] = [
  { id: 'attr-brand', key: 'brand', titleRu: 'Бренд', titleUz: 'Brend', titleEn: 'Brand', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 1 },
  { id: 'attr-size', key: 'size', titleRu: 'Размер', titleUz: 'O‘lcham', titleEn: 'Size', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 2 },
  { id: 'attr-volume', key: 'volume', titleRu: 'Объём', titleUz: 'Hajm', titleEn: 'Volume', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 3 },
  { id: 'attr-weight', key: 'weight', titleRu: 'Вес', titleUz: 'Og‘irlik', titleEn: 'Weight', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 4 },
  { id: 'attr-units-per-pack', key: 'units_per_pack', titleRu: 'Количество в упаковке', titleUz: 'Qadoqdagi miqdor', titleEn: 'Units per pack', type: 'number', unit: 'шт.', filterable: false, required: false, cardVisible: true, productVisible: true, sortOrder: 5 },
  { id: 'attr-packs-per-sack', key: 'packs_per_sack', titleRu: 'Упаковок в мешке/коробке', titleUz: 'Qop yoki qutidagi qadoqlar', titleEn: 'Packs per sack/case', type: 'text', filterable: false, required: false, cardVisible: false, productVisible: true, sortOrder: 6 },
  { id: 'attr-load-capacity', key: 'load_capacity', titleRu: 'Грузоподъёмность', titleUz: 'Yuk ko‘tarish', titleEn: 'Load capacity', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 7 },
  { id: 'attr-grade', key: 'grade', titleRu: 'Сорт', titleUz: 'Nav', titleEn: 'Grade', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 8 },
  { id: 'attr-origin', key: 'origin', titleRu: 'Происхождение', titleUz: 'Kelib chiqishi', titleEn: 'Origin', type: 'text', filterable: true, required: false, cardVisible: false, productVisible: true, sortOrder: 9 },
  { id: 'attr-product-type', key: 'product_type', titleRu: 'Вид продукта', titleUz: 'Mahsulot turi', titleEn: 'Product type', type: 'text', filterable: true, required: false, cardVisible: false, productVisible: true, sortOrder: 10 },
  { id: 'attr-price-per-kg', key: 'price_per_kg', titleRu: 'Цена за килограмм', titleUz: 'Kilogramm narxi', titleEn: 'Price per kilogram', type: 'number', unit: 'сум', filterable: false, required: false, cardVisible: false, productVisible: true, sortOrder: 11 },
];

const packaging: PriceRow[] = [
  row('TB-001', 'cat-trash-bags', 'Мусорные пакеты 45×50 см, 20 л, 40 шт.', 9990, 'упаковка', 'pack', { size: '45×50 см', volume: '20 л', units_per_pack: 40, packs_per_sack: '100' }, { brandName: 'SANPACK', ownProduction: true }),
  row('TB-002', 'cat-trash-bags', 'Мусорные пакеты 45×60 см, 22 л, 30 шт.', 9260, 'упаковка', 'pack', { size: '45×60 см', volume: '22 л', units_per_pack: 30, packs_per_sack: '100' }, { brandName: 'SANPACK', ownProduction: true }),
  row('TB-003', 'cat-trash-bags', 'Мусорные пакеты 50×70 см, 41 л, 25 шт.', 12290, 'упаковка', 'pack', { size: '50×70 см', volume: '41 л', units_per_pack: 25, packs_per_sack: '70' }, { brandName: 'SANPACK', ownProduction: true }),
  row('TB-004', 'cat-trash-bags', 'Мусорные пакеты 60×90 см, 85 л, 9 шт.', 16570, 'упаковка', 'pack', { size: '60×90 см', volume: '85 л', units_per_pack: 9, packs_per_sack: '60' }, { brandName: 'SANPACK', ownProduction: true }),
  row('TB-005', 'cat-trash-bags', 'Мусорные пакеты 80×110 см, 160 л, 7 шт.', 19790, 'упаковка', 'pack', { size: '80×110 см', volume: '160 л', units_per_pack: 7, packs_per_sack: '50' }, { brandName: 'SANPACK', ownProduction: true }),
  row('TB-006', 'cat-trash-bags', 'Мусорные мешки 90×110 см, 200 л, 7 шт.', 11400, 'упаковка', 'pack', { size: '90×110 см', volume: '200 л', units_per_pack: 7, packs_per_sack: '80' }, { brandName: 'SANPACK', ownProduction: true }),
  row('TB-007', 'cat-trash-bags', 'Мусорные пакеты 90×120 см, 240 л, 6 шт.', 21070, 'упаковка', 'pack', { size: '90×120 см', volume: '240 л', units_per_pack: 6, packs_per_sack: '50' }, { brandName: 'SANPACK', ownProduction: true }),
  row('TB-008', 'cat-trash-bags', 'Мусорные пакеты 90×120 см, 240 л, 11 шт.', 37470, 'упаковка', 'pack', { size: '90×120 см', volume: '240 л', units_per_pack: 11, packs_per_sack: '30' }, { brandName: 'SANPACK', ownProduction: true }),

  row('TO-001', 'cat-tearoff-bags', 'Отрывные пакеты 19×27 см, ультрапрочные, 222 шт.', 13420, 'рулон', 'roll', { size: '19×27 см', units_per_pack: 222, packs_per_sack: '85' }, { brandName: 'SANPACK', ownProduction: true }),
  row('TO-002', 'cat-tearoff-bags', 'Отрывные пакеты 28×38 см, ультрапрочные, 303 шт.', 21490, 'рулон', 'roll', { size: '28×38 см', units_per_pack: 303, packs_per_sack: '50' }, { brandName: 'SANPACK', ownProduction: true }),

  row('CB-001', 'cat-carrier-bags', 'Пакеты «Майка» 3 кг, ультрапрочные, 50 шт.', 7870, 'упаковка', 'pack', { load_capacity: '3 кг', units_per_pack: 50, packs_per_sack: '120' }, { brandName: 'SANPACK', ownProduction: true }),
  row('CB-002', 'cat-carrier-bags', 'Пакеты «Майка» 5 кг, ультрапрочные, 50 шт.', 13110, 'упаковка', 'pack', { load_capacity: '5 кг', units_per_pack: 50, packs_per_sack: '85' }, { brandName: 'SANPACK', ownProduction: true }),
  row('CB-003', 'cat-carrier-bags', 'Пакеты «Майка» 10 кг, ультрапрочные, 30 шт.', 13110, 'упаковка', 'pack', { load_capacity: '10 кг', units_per_pack: 30, packs_per_sack: '85' }, { brandName: 'SANPACK', ownProduction: true }),
  row('CB-004', 'cat-carrier-bags', 'Пакеты «Майка» 25 кг, ультрапрочные, 25 шт.', 17255, 'упаковка', 'pack', { load_capacity: '25 кг', units_per_pack: 25, packs_per_sack: '60' }, { brandName: 'SANPACK', ownProduction: true }),
  row('CB-005', 'cat-carrier-bags', 'Пакеты «Майка» 50 кг, ультрапрочные, 25 шт.', 40750, 'упаковка', 'pack', { load_capacity: '50 кг', units_per_pack: 25, packs_per_sack: '30' }, { brandName: 'SANPACK', ownProduction: true }),

  row('VB-001', 'cat-special-bags', 'Вакуумные пакеты 15×25 см', 900, 'штука', 'piece', { size: '15×25 см', units_per_pack: 1, packs_per_sack: '5000' }),
  row('VB-002', 'cat-special-bags', 'Вакуумные пакеты 20×25 см', 1050, 'штука', 'piece', { size: '20×25 см', units_per_pack: 1, packs_per_sack: '5000' }),
  row('VB-003', 'cat-special-bags', 'Вакуумные пакеты 25×35 см', 1200, 'штука', 'piece', { size: '25×35 см', units_per_pack: 1, packs_per_sack: '4000' }),
  row('PB-001', 'cat-special-bags', 'Пакеты для пиццы универсальные 25/30/35 см, 40 шт.', 17200, 'упаковка', 'pack', { size: '25/30/35 см', units_per_pack: 40, packs_per_sack: '65' }),

  row('FP-001', 'cat-food-packaging', 'Стрейч-плёнка большая, 45 см', 46000, 'рулон', 'roll', { size: '45 см', packs_per_sack: '6' }),
  row('FP-002', 'cat-food-packaging', 'Стрейч-плёнка маленькая, 30 см', 15000, 'рулон', 'roll', { size: '30 см', packs_per_sack: '35' }),
  row('FP-003', 'cat-food-packaging', 'Фольга большая 2 кг, 45 см', 143450, 'рулон', 'roll', { size: '45 см', weight: '2 кг', packs_per_sack: '6' }),
  row('FP-004', 'cat-food-packaging', 'Бумага для выпечки 37 см × 40 м', 72200, 'рулон', 'roll', { size: '37 см × 40 м', packs_per_sack: '20' }),

  row('GL-001', 'cat-gloves', 'Перчатки универсальные полиэтиленовые, 100 шт.', 4900, 'упаковка', 'pack', { units_per_pack: 100, packs_per_sack: '350', product_type: 'полиэтиленовые' }),
  row('GL-002', 'cat-gloves', 'Mikky жёлтые резиновые перчатки L, 2 шт.', 6000, 'упаковка', 'pack', { size: 'L', units_per_pack: 2, packs_per_sack: '300', product_type: 'резиновые' }, { brandName: 'Mikky' }),
  row('GL-003', 'cat-gloves', 'Mikky жёлтые утолщённые перчатки для мытья L, 2 шт.', 6500, 'упаковка', 'pack', { size: 'L', units_per_pack: 2, packs_per_sack: '300', product_type: 'резиновые утолщённые' }, { brandName: 'Mikky' }),
  row('GL-004', 'cat-gloves', 'Touch Flex чёрные резиновые перчатки XL/L/M, 100 шт.', 48000, 'упаковка', 'pack', { size: 'XL/L/M', units_per_pack: 100, packs_per_sack: '10', product_type: 'резиновые' }, { brandName: 'Touch Flex' }),

  row('CL-001', 'cat-cleaning', 'Тряпка «Дельфин», 1 шт.', 9400, 'упаковка', 'pack', { units_per_pack: 1, packs_per_sack: '20/100' }),
  row('CL-002', 'cat-cleaning', 'Губки для мытья посуды, 3 шт.', 7500, 'упаковка', 'pack', { units_per_pack: 3, packs_per_sack: '40' }),
  row('CL-003', 'cat-cleaning', 'Цветные тряпки для столов, 3 шт.', 7500, 'упаковка', 'pack', { units_per_pack: 3, packs_per_sack: '10/120' }),
  row('CL-004', 'cat-cleaning', 'Корейская губка, 1 шт.', 5700, 'упаковка', 'pack', { units_per_pack: 1, packs_per_sack: '60' }),
  row('CL-005', 'cat-cleaning', 'Половая тряпка из микрофибры 70×70 см', 30000, 'штука', 'piece', { size: '70×70 см', units_per_pack: 1, packs_per_sack: '25' }),
  row('CL-006', 'cat-cleaning', 'Половая тряпка из микрофибры 90×60 см', 34000, 'штука', 'piece', { size: '90×60 см', units_per_pack: 1, packs_per_sack: '25' }),

  row('PG-001', 'cat-paper-goods', 'Рулонные салфетки, 2 слоя, 2 рулона', 19900, 'упаковка', 'pack', { units_per_pack: 2, packs_per_sack: '24', product_type: '2 слоя' }),
  row('PG-002', 'cat-paper-goods', 'Салфетки V 19,5×10,5 см, 150 шт.', 3825, 'упаковка', 'pack', { size: '19,5×10,5 см', units_per_pack: 150, packs_per_sack: '24' }),
  row('PG-003', 'cat-paper-goods', 'Салфетки Z, 180 шт.', 10464, 'упаковка', 'pack', { units_per_pack: 180, packs_per_sack: '15' }),
  row('PG-004', 'cat-paper-goods', 'Квадратные салфетки 23×23 см, 100 шт.', 3607, 'упаковка', 'pack', { size: '23×23 см', units_per_pack: 100, packs_per_sack: '40' }),
  row('PG-005', 'cat-paper-goods', 'Салфетки Longper Premium, 40 шт.', 7521, 'упаковка', 'pack', { units_per_pack: 40, packs_per_sack: '24' }, { brandName: 'Longper Premium' }),
  row('PG-006', 'cat-paper-goods', 'Туалетная бумага двухслойная, 6 рулонов', 17025, 'упаковка', 'pack', { units_per_pack: 6, packs_per_sack: '10', product_type: '2 слоя' }),
  row('PG-007', 'cat-paper-goods', 'Влажные салфетки, блок 300 шт.', 188, 'блок', 'pack', { units_per_pack: 300, packs_per_sack: '300' }),
];

const meat: PriceRow[] = [
  row('BF-001', 'cat-beef', 'Бон-филе', 245000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-002', 'cat-beef', 'Бон-филе неочищенное', 185000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-003', 'cat-beef', 'Контр-филе', 200000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-004', 'cat-beef', 'Качалка говяжья', 115000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-005', 'cat-beef', 'Шея говяжья', 120000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-006', 'cat-beef', 'Транч говяжий', 135000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-007', 'cat-beef', 'Ташки сон', 125000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-008', 'cat-beef', 'Чарви говяжий', 50000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-009', 'cat-beef', 'Шапок (пашина)', 100000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-010', 'cat-beef', 'Сарпанжа', 120000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-011', 'cat-beef', 'Ребро говяжье', 80000, 'кг', 'kilogram', { product_type: 'говядина' }),
  row('BF-012', 'cat-beef', 'Рагу говяжье', 22000, 'кг', 'kilogram', { product_type: 'говядина' }),

  row('CH-001', 'cat-chicken', 'Куриная грудка', 40000, 'кг', 'kilogram', { product_type: 'курица' }, { minimumOrder: 40 }),
  row('CH-002', 'cat-chicken', 'Куриная грудка очищенная', 43000, 'кг', 'kilogram', { product_type: 'курица' }, { minimumOrder: 40 }),
  row('CH-003', 'cat-chicken', 'Куриное бедро', 38000, 'кг', 'kilogram', { product_type: 'курица' }, { minimumOrder: 40 }),
  row('CH-004', 'cat-chicken', 'Куриное бедро без костей', 45000, 'кг', 'kilogram', { product_type: 'курица' }, { minimumOrder: 40 }),
  row('CH-005', 'cat-chicken', 'Куриное бедро без костей и кожи', 47500, 'кг', 'kilogram', { product_type: 'курица' }, { minimumOrder: 40 }),
  row('CH-006', 'cat-chicken', 'Куриная голень', 36500, 'кг', 'kilogram', { product_type: 'курица' }, { minimumOrder: 40 }),
  row('CH-007', 'cat-chicken', 'Куриный окорочок', 32000, 'кг', 'kilogram', { product_type: 'курица' }, { minimumOrder: 40 }),
  row('CH-008', 'cat-chicken', 'Куриные крылышки', 40500, 'кг', 'kilogram', { product_type: 'курица' }, { minimumOrder: 40 }),
  row('CH-009', 'cat-chicken', 'Целая курица 2–2,5 кг', 29500, 'кг', 'kilogram', { weight: '2–2,5 кг', product_type: 'курица' }, { minimumOrder: 40 }),
  row('EG-001', 'cat-eggs', 'Куриное яйцо', 1500, 'штука', 'piece'),
];

const grocery: PriceRow[] = [
  row('FL-001', 'cat-flour', 'Мука «Дани Нан», высший сорт, 50 кг', 520000, 'мешок', 'pack', { weight: '50 кг', grade: 'высший сорт' }, { brandName: 'Дани Нан' }),
  row('FL-002', 'cat-flour', 'Мука «Дани Нан», высший сорт, 25 кг', 290000, 'мешок', 'pack', { weight: '25 кг', grade: 'высший сорт' }, { brandName: 'Дани Нан' }),
  row('FL-003', 'cat-flour', 'Мука «Дани Нан», 1 сорт, 50 кг', 305000, 'мешок', 'pack', { weight: '50 кг', grade: '1 сорт' }, { brandName: 'Дани Нан' }),
  row('FL-004', 'cat-flour', 'Мука «Дани Нан», 1 сорт, 25 кг', 170000, 'мешок', 'pack', { weight: '25 кг', grade: '1 сорт' }, { brandName: 'Дани Нан' }),
  row('FL-005', 'cat-flour', 'Мука «Алтын Нан», высший сорт, 50 кг', 385000, 'мешок', 'pack', { weight: '50 кг', grade: 'высший сорт' }, { brandName: 'Алтын Нан' }),
  row('FL-006', 'cat-flour', 'Мука «Алтын Нан», 1 сорт, 50 кг', 295000, 'мешок', 'pack', { weight: '50 кг', grade: '1 сорт' }, { brandName: 'Алтын Нан' }),
  row('FL-007', 'cat-flour', 'Мука «Мутабар», высший сорт, 50 кг', 440000, 'мешок', 'pack', { weight: '50 кг', grade: 'высший сорт' }, { brandName: 'Мутабар' }),
  row('FL-008', 'cat-flour', 'Мука «Мутабар», 1 сорт, 50 кг', 335000, 'мешок', 'pack', { weight: '50 кг', grade: '1 сорт' }, { brandName: 'Мутабар' }),
  row('SG-001', 'cat-sugar', 'Сахар российский, 50 кг', 595000, 'мешок', 'pack', { weight: '50 кг', origin: 'Россия' }),
  row('GR-001', 'cat-groats', 'Рис «Лазер»', 22000, 'кг', 'kilogram', { product_type: 'рис' }),
  row('GR-002', 'cat-groats', 'Рис «Аланга»', 20000, 'кг', 'kilogram', { product_type: 'рис' }),
  row('GR-003', 'cat-groats', 'Гречка', 13000, 'кг', 'kilogram'),
  row('GR-004', 'cat-groats', 'Чечевица', 17000, 'кг', 'kilogram'),
  row('GR-005', 'cat-groats', 'Нут американский', 32000, 'кг', 'kilogram', { origin: 'США' }),
  row('GR-006', 'cat-groats', 'Нут иранский', 25000, 'кг', 'kilogram', { origin: 'Иран' }),
  row('OI-001', 'cat-oils', 'Подсолнечное масло «Олейна», 5 л', 135000, 'бутылка', 'piece', { volume: '5 л' }, { brandName: 'Олейна' }),
];

const produce: PriceRow[] = [
  row('FR-001', 'cat-fruits', 'Апельсин египетский крупный', 24000, 'кг', 'kilogram', { origin: 'Египет', product_type: 'крупный' }),
  row('FR-002', 'cat-fruits', 'Апельсин египетский мелкий', 20000, 'кг', 'kilogram', { origin: 'Египет', product_type: 'мелкий' }),
  row('FR-003', 'cat-fruits', 'Лимон аргентинский', 40000, 'кг', 'kilogram', { origin: 'Аргентина' }),
  row('FR-004', 'cat-fruits', 'Киви чилийский', 65000, 'кг', 'kilogram', { origin: 'Чили' }),
  row('FR-005', 'cat-fruits', 'Грейпфрут африканский', 34000, 'кг', 'kilogram', { origin: 'Африка' }),
  row('FR-006', 'cat-fruits', 'Банан эквадорский', 23000, 'кг', 'kilogram', { origin: 'Эквадор' }),

  row('GN-001', 'cat-greens', 'Салат Айсберг Novagreen, 500 г', 31700, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-002', 'cat-greens', 'Латук Novagreen, 500 г', 33000, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-003', 'cat-greens', 'Салат Романо Novagreen, 500 г', 48200, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-004', 'cat-greens', 'Руккола Novagreen', 32800, 'упаковка', 'pack', { weight: '250 / 500 г' }, { brandName: 'Novagreen', variants: [
    { id: '250-g', label: '250 г', price: 32800, attributes: { weight: '250 г' } },
    { id: '500-g', label: '500 г', price: 50000, attributes: { weight: '500 г' } },
  ] }),
  row('GN-006', 'cat-greens', 'Шпинат Novagreen', 32800, 'упаковка', 'pack', { weight: '250 / 500 г' }, { brandName: 'Novagreen', variants: [
    { id: '250-g', label: '250 г', price: 32800, attributes: { weight: '250 г' } },
    { id: '500-g', label: '500 г', price: 52400, attributes: { weight: '500 г' } },
  ] }),
  row('GN-008', 'cat-greens', 'Салат Лолло Росса Novagreen, 500 г', 55600, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-009', 'cat-greens', 'Кейл Novagreen, 500 г', 47500, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-010', 'cat-greens', 'Мангольд Novagreen', 34500, 'упаковка', 'pack', { weight: '250 / 500 г' }, { brandName: 'Novagreen', variants: [
    { id: '250-g', label: '250 г', price: 34500, attributes: { weight: '250 г' } },
    { id: '500-g', label: '500 г', price: 65000, attributes: { weight: '500 г' } },
  ] }),
  row('GN-012', 'cat-greens', 'Стебель сельдерея Novagreen, 1 шт.', 27800, 'штука', 'piece', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('GN-013', 'cat-greens', 'Розмарин Novagreen', 6000, 'упаковка', 'pack', { weight: '20 / 250 / 500 г' }, { brandName: 'Novagreen', variants: [
    { id: '20-g', label: '20 г', price: 6000, attributes: { weight: '20 г' } },
    { id: '250-g', label: '250 г', price: 30000, attributes: { weight: '250 г' } },
    { id: '500-g', label: '500 г', price: 48000, attributes: { weight: '500 г' } },
  ] }),
  row('GN-016', 'cat-greens', 'Мята Novagreen', 6150, 'упаковка', 'pack', { weight: '60 / 500 г' }, { brandName: 'Novagreen', variants: [
    { id: '60-g', label: '60 г', price: 6150, attributes: { weight: '60 г' } },
    { id: '500-g', label: '500 г', price: 51500, attributes: { weight: '500 г' } },
  ] }),
  row('GN-018', 'cat-greens', 'Кинза Novagreen', 5000, 'упаковка', 'pack', { weight: '60 / 500 г' }, { brandName: 'Novagreen', variants: [
    { id: '60-g', label: '60 г', price: 5000, attributes: { weight: '60 г' } },
    { id: '500-g', label: '500 г', price: 38900, attributes: { weight: '500 г' } },
  ] }),
  row('GN-020', 'cat-greens', 'Укроп Novagreen', 4500, 'упаковка', 'pack', { weight: '60 / 500 г' }, { brandName: 'Novagreen', variants: [
    { id: '60-g', label: '60 г', price: 4500, attributes: { weight: '60 г' } },
    { id: '500-g', label: '500 г', price: 35400, attributes: { weight: '500 г' } },
  ] }),
  row('GN-022', 'cat-greens', 'Петрушка голландская Novagreen', 12000, 'упаковка', 'pack', { weight: '60 / 500 г' }, { brandName: 'Novagreen', variants: [
    { id: '60-g', label: '60 г', price: 12000, attributes: { weight: '60 г' } },
    { id: '500-g', label: '500 г', price: 42500, attributes: { weight: '500 г' } },
  ] }),
  row('GN-024', 'cat-greens', 'Петрушка Novagreen, 500 г', 32000, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-025', 'cat-greens', 'Лук барашек Novagreen, 500 г', 62000, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-026', 'cat-greens', 'Лук зелёный Novagreen, 500 г', 44500, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-027', 'cat-greens', 'Редис Novagreen, 500 г', 20000, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-028', 'cat-greens', 'Сельдерей Novagreen, 500 г', 88970, 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  row('GN-029', 'cat-greens', 'Айсберг резаный Novagreen, 500 г', 22500, 'упаковка', 'pack', { weight: '500 г', product_type: 'резаный' }, { brandName: 'Novagreen' }),

  row('MG-001', 'cat-microgreens', 'Микрозелень амаранта Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-002', 'cat-microgreens', 'Микрозелень брокколи Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-003', 'cat-microgreens', 'Микрозелень гороха Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-004', 'cat-microgreens', 'Микрозелень горчицы Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-005', 'cat-microgreens', 'Микрозелень дайкона Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-006', 'cat-microgreens', 'Микрозелень красной редиски Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-007', 'cat-microgreens', 'Микрозелень кресс-салата Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-008', 'cat-microgreens', 'Микрозелень латук Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-009', 'cat-microgreens', 'Микрозелень редиса Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-010', 'cat-microgreens', 'Микрозелень рукколы Novagreen, 1 шт.', 23200, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-011', 'cat-microgreens', 'Микрозелень «Съедобные цветы» Novagreen, 1 шт.', 45000, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
  row('MG-012', 'cat-microgreens', 'Микрозелень щавеля Novagreen, 1 шт.', 45000, 'упаковка', 'pack', { units_per_pack: 1 }, { brandName: 'Novagreen' }),
];

const dairy: PriceRow[] = [
  row('DA-001', 'cat-dairy', 'Сливочное масло Fin, 500 г', 95000, 'упаковка', 'pack', { weight: '500 г', product_type: 'сливочное масло' }, { brandName: 'Fin' }),
  row('DA-002', 'cat-dairy', 'Сливочное масло Valio, 1 кг', 180000, 'упаковка', 'pack', { weight: '1 кг', product_type: 'сливочное масло' }, { brandName: 'Valio' }),
  row('DA-003', 'cat-dairy', 'Сливочное масло Valio, 500 г', 95000, 'упаковка', 'pack', { weight: '500 г', product_type: 'сливочное масло' }, { brandName: 'Valio' }),
  row('DA-004', 'cat-dairy', 'Сливочное масло Svalya, 25 кг', 3625000, 'упаковка', 'pack', { weight: '25 кг', price_per_kg: 145000, product_type: 'сливочное масло' }, { brandName: 'Svalya' }),
  row('DA-005', 'cat-dairy', 'Сливочное масло Svalya, 1 кг', 165000, 'упаковка', 'pack', { weight: '1 кг', product_type: 'сливочное масло' }, { brandName: 'Svalya' }),
  row('DA-006', 'cat-dairy', 'Сыр Viola Cheese Burger, 8 ломтиков', 25000, 'упаковка', 'pack', { units_per_pack: 8, product_type: 'сыр ломтиками' }, { brandName: 'Viola' }),
  row('DA-007', 'cat-dairy', 'Сыр Viola Creamy, 8 ломтиков', 25000, 'упаковка', 'pack', { units_per_pack: 8, product_type: 'сыр ломтиками' }, { brandName: 'Viola' }),
  row('DA-008', 'cat-dairy', 'Сливочный сыр Viola, 400 г', 54000, 'упаковка', 'pack', { weight: '400 г', product_type: 'сливочный сыр' }, { brandName: 'Viola' }),
  row('DA-009', 'cat-dairy', 'Сыр Fitaki, 500 г', 60000, 'упаковка', 'pack', { weight: '500 г', product_type: 'сыр' }, { brandName: 'Fitaki' }),
  row('DA-010', 'cat-dairy', 'Сыр Dor Blue, 2,5 кг', 550000, 'упаковка', 'pack', { weight: '2,5 кг', price_per_kg: 220000, product_type: 'сыр с голубой плесенью' }, { brandName: 'Dor Blue' }),
  row('DA-011', 'cat-dairy', 'Сыр Camembert, 500 г', 37000, 'упаковка', 'pack', { weight: '500 г', product_type: 'мягкий сыр' }, { brandName: 'Camembert' }),
  row('DA-012', 'cat-dairy', 'Сыр Brie, 500 г', 37000, 'упаковка', 'pack', { weight: '500 г', product_type: 'мягкий сыр' }, { brandName: 'Brie' }),
  row('DA-013', 'cat-dairy', 'Сыр Svalya, 3 кг', 390000, 'упаковка', 'pack', { weight: '3 кг', price_per_kg: 130000, product_type: 'сыр' }, { brandName: 'Svalya' }),
  row('OI-002', 'cat-oils', 'Фритюрное масло Unity, 10 л', 285000, 'канистра', 'piece', { volume: '10 л', product_type: 'фритюрное масло' }, { brandName: 'Unity' }),
];

const priceRows: PriceRow[] = [
  ...packaging,
  ...meat,
  ...grocery,
  ...produce,
  ...dairy,
];

const categoryById = new Map(priceList2026Categories.map((category) => [category.id, category]));

function slugify(value: string) {
  const transliteration: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  return value
    .toLocaleLowerCase('ru-RU')
    .split('')
    .map((character) => transliteration[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const priceList2026Products: Product[] = priceRows.map((entry, index) => {
  const category = categoryById.get(entry.categoryId);
  if (!category) throw new Error(`Не найдена категория ${entry.categoryId} для ${entry.code}.`);

  return {
    id: `price-2026-${entry.code.toLowerCase()}`,
    slug: `${slugify(entry.name)}-${entry.code.toLowerCase()}`,
    sku: `SP-${entry.code}`,
    status: 'published',
    brandName: entry.brandName,
    categoryId: entry.categoryId,
    categorySlug: category.slug,
    titleRu: entry.name,
    titleUz: entry.name,
    titleEn: entry.name,
    shortDescriptionRu: `${entry.name}. Цена указана за ${entry.salesUnit}.`,
    shortDescriptionUz: `${entry.name}. Narx ${entry.salesUnit} uchun ko‘rsatilgan.`,
    shortDescriptionEn: `${entry.name}. Price is shown per ${entry.salesUnit}.`,
    descriptionRu: 'Товар из актуального прайс-листа SANPACK. Доступность и условия поставки уточняйте у менеджера.',
    descriptionUz: 'SANPACK amaldagi narxlar ro‘yxatidagi mahsulot. Mavjudligi va yetkazib berish shartlarini menejerdan aniqlashtiring.',
    descriptionEn: 'Product from the current SANPACK price list. Confirm availability and delivery terms with a manager.',
    images: [PLACEHOLDER_IMAGE],
    mainImage: PLACEHOLDER_IMAGE,
    attributes: {
      ...entry.attributes,
      ...(entry.brandName ? { brand: entry.brandName } : {}),
    },
    variants: (entry.variants ?? []).map((variant) => ({
      id: `${entry.code.toLowerCase()}-${variant.id}`,
      sku: `SP-${entry.code}-${variant.id.toUpperCase()}`,
      titleRu: variant.label,
      titleUz: variant.label,
      titleEn: variant.label,
      price: variant.price,
      stockStatus: 'on_order',
      attributes: variant.attributes,
      minOrder: entry.minimumOrder ?? 1,
      minQuantity: entry.minimumOrder ?? 1,
      quantityStep: 1,
      priceMode: 'fixed',
      availability: 'on_order',
    })),
    price: entry.price,
    currency: 'UZS',
    showPrice: true,
    stockStatus: 'on_order',
    minimumOrder: entry.minimumOrder ?? 1,
    salesUnit: entry.salesUnit,
    unitCode: entry.unitCode,
    quantityStep: 1,
    priceMode: 'fixed',
    availability: 'on_order',
    featured: false,
    newProduct: true,
    ownProduction: entry.ownProduction ?? false,
    sortOrder: index + 1,
    seo: {
      titleRu: `${entry.name} — купить в SANPACK`,
      descriptionRu: `${entry.name} по цене ${entry.price.toLocaleString('ru-RU')} сум. Заказ и поставка от SANPACK.`,
    },
    createdAt: IMPORTED_AT,
    updatedAt: IMPORTED_AT,
  };
});

if (priceList2026Products.length !== 130) {
  throw new Error(`Ожидалось 130 товаров из пяти прайс-листов с объединёнными весовыми вариантами, получено ${priceList2026Products.length}.`);
}
