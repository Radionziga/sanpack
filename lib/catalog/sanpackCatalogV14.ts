import type { Attribute, Category, Product, QuantityUnit } from '@/types';

const IMPORTED_AT = '2026-08-11T00:00:00.000Z';
const PLACEHOLDER_IMAGE = '/catalog/product-placeholder.svg';

type CatalogItem = {
  id: string;
  sku: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  titleRu: string;
  titleUz: string;
  titleEn: string;
  salesUnit: string;
  unitCode: QuantityUnit;
  brandName?: string;
  ownProduction?: boolean;
  minimumOrder?: number;
  attributes?: Record<string, string | number | boolean | string[]>;
};

const item = (
  id: string,
  sku: string,
  slug: string,
  categoryId: string,
  categorySlug: string,
  titleRu: string,
  titleUz: string,
  titleEn: string,
  salesUnit: string,
  unitCode: QuantityUnit,
  attributes: CatalogItem['attributes'] = {},
  extra: Partial<Pick<CatalogItem, 'brandName' | 'ownProduction' | 'minimumOrder'>> = {},
): CatalogItem => ({
  id,
  sku,
  slug,
  categoryId,
  categorySlug,
  titleRu,
  titleUz,
  titleEn,
  salesUnit,
  unitCode,
  attributes,
  ...extra,
});

const trashBags = [
  item('catalog-v14-001', 'SP-M-4550-20', 'meshki-sanpack-45x50-20l-40', 'cat-trash-bags', 'meshki-dlya-musora', 'Мешки для мусора SANPACK 45×50 см, 20 л, 40 шт.', 'SANPACK chiqindi qoplari 45×50 sm, 20 l, 40 dona', 'SANPACK refuse bags 45×50 cm, 20 L, 40 pcs', 'рулон', 'roll', { size: '45×50 см', volume: '20 л', package_quantity: '40 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-002', 'SP-M-4560-22', 'meshki-sanpack-45x60-22l-30', 'cat-trash-bags', 'meshki-dlya-musora', 'Мешки для мусора SANPACK 45×60 см, 22 л, 30 шт.', 'SANPACK chiqindi qoplari 45×60 sm, 22 l, 30 dona', 'SANPACK refuse bags 45×60 cm, 22 L, 30 pcs', 'рулон', 'roll', { size: '45×60 см', volume: '22 л', package_quantity: '30 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-003', 'SP-M-5070-41', 'meshki-sanpack-50x70-41l-25', 'cat-trash-bags', 'meshki-dlya-musora', 'Мешки для мусора SANPACK 50×70 см, 41 л, 25 шт.', 'SANPACK chiqindi qoplari 50×70 sm, 41 l, 25 dona', 'SANPACK refuse bags 50×70 cm, 41 L, 25 pcs', 'рулон', 'roll', { size: '50×70 см', volume: '41 л', package_quantity: '25 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-004', 'SP-M-6090-85', 'meshki-sanpack-60x90-85l-9', 'cat-trash-bags', 'meshki-dlya-musora', 'Мешки для мусора SANPACK 60×90 см, 85 л, 9 шт.', 'SANPACK chiqindi qoplari 60×90 sm, 85 l, 9 dona', 'SANPACK refuse bags 60×90 cm, 85 L, 9 pcs', 'рулон', 'roll', { size: '60×90 см', volume: '85 л', package_quantity: '9 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-005', 'SP-M-80110-160', 'meshki-sanpack-80x110-160l-7', 'cat-trash-bags', 'meshki-dlya-musora', 'Мешки для мусора SANPACK 80×110 см, 160 л, 7 шт.', 'SANPACK chiqindi qoplari 80×110 sm, 160 l, 7 dona', 'SANPACK refuse bags 80×110 cm, 160 L, 7 pcs', 'рулон', 'roll', { size: '80×110 см', volume: '160 л', package_quantity: '7 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-006', 'SP-M-90110-220', 'meshki-sanpack-90x110-220l-7', 'cat-trash-bags', 'meshki-dlya-musora', 'Мешки для мусора SANPACK 90×110 см, 220 л, 7 шт.', 'SANPACK chiqindi qoplari 90×110 sm, 220 l, 7 dona', 'SANPACK refuse bags 90×110 cm, 220 L, 7 pcs', 'упаковка', 'pack', { size: '90×110 см', volume: '220 л', package_quantity: '7 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-007', 'SP-M-90120-240-6', 'meshki-sanpack-90x120-240l-6', 'cat-trash-bags', 'meshki-dlya-musora', 'Мешки для мусора SANPACK 90×120 см, 240 л, 6 шт.', 'SANPACK chiqindi qoplari 90×120 sm, 240 l, 6 dona', 'SANPACK refuse bags 90×120 cm, 240 L, 6 pcs', 'рулон', 'roll', { size: '90×120 см', volume: '240 л', package_quantity: '6 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-008', 'SP-M-90120-240-11', 'meshki-sanpack-90x120-240l-11', 'cat-trash-bags', 'meshki-dlya-musora', 'Мешки для мусора SANPACK 90×120 см, 240 л, 11 шт.', 'SANPACK chiqindi qoplari 90×120 sm, 240 l, 11 dona', 'SANPACK refuse bags 90×120 cm, 240 L, 11 pcs', 'рулон', 'roll', { size: '90×120 см', volume: '240 л', package_quantity: '11 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
];

const filmsAndGloves = [
  item('catalog-v14-009', 'SP-FOIL', 'alyuminievaya-folga', 'cat-film-foil', 'folga-i-plenka', 'Алюминиевая фольга', 'Alyuminiy folga', 'Aluminium foil', 'рулон', 'roll', { material: 'Алюминий' }),
  item('catalog-v14-010', 'SP-STRETCH', 'pishchevaya-streych-plenka', 'cat-film-foil', 'folga-i-plenka', 'Пищевая стрейч-плёнка', 'Oziq-ovqat strech plyonkasi', 'Food stretch film', 'рулон', 'roll', { material: 'Пищевая плёнка' }),
  item('catalog-v14-011', 'SP-PARCHMENT', 'pergamentnaya-bumaga', 'cat-film-foil', 'folga-i-plenka', 'Пергаментная бумага', 'Pergament qog‘ozi', 'Parchment paper', 'рулон', 'roll', { material: 'Пергамент' }),
  item('catalog-v14-012', 'SP-VACUUM-FILM', 'plenka-dlya-vakuumnoy-upakovki', 'cat-film-foil', 'folga-i-plenka', 'Плёнка для вакуумной упаковки', 'Vakuum qadoqlash plyonkasi', 'Vacuum packaging film', 'упаковка', 'pack', { packaging_type: 'Вакуумная упаковка' }),
  item('catalog-v14-013', 'SP-GLOVE-PE', 'odnorazovye-polietilenovye-perchatki', 'cat-gloves', 'perchatki', 'Одноразовые полиэтиленовые перчатки', 'Bir martalik polietilen qo‘lqoplar', 'Disposable polyethylene gloves', 'упаковка', 'pack', { material: 'Полиэтилен' }),
  item('catalog-v14-014', 'SP-GLOVE-NITRILE', 'odnorazovye-nitrilovye-perchatki', 'cat-gloves', 'perchatki', 'Одноразовые нитриловые перчатки', 'Bir martalik nitril qo‘lqoplar', 'Disposable nitrile gloves', 'упаковка', 'pack', { material: 'Нитрил' }),
  item('catalog-v14-015', 'SP-GLOVE-RUBBER', 'khozyaystvennye-rezinovye-perchatki', 'cat-gloves', 'perchatki', 'Хозяйственные резиновые перчатки', 'Xo‘jalik rezina qo‘lqoplari', 'Household rubber gloves', 'пара', 'set', { material: 'Резина' }),
];

const carrierBags = [
  item('catalog-v14-016', 'SP-BAG-3KG', 'pakety-mayka-3kg-29x41', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты «Майка» SANPACK 3 кг, 29×41 см, 100 шт.', 'SANPACK «Mayka» paketlari 3 kg, 29×41 sm, 100 dona', 'SANPACK T-shirt bags 3 kg, 29×41 cm, 100 pcs', 'упаковка', 'pack', { load: '3 кг', size: '29×41 см', package_quantity: '100 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-017', 'SP-BAG-5KG', 'pakety-mayka-5kg-29x47', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты «Майка» SANPACK 5 кг, 29×47 см, 100 шт.', 'SANPACK «Mayka» paketlari 5 kg, 29×47 sm, 100 dona', 'SANPACK T-shirt bags 5 kg, 29×47 cm, 100 pcs', 'упаковка', 'pack', { load: '5 кг', size: '29×47 см', package_quantity: '100 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-018', 'SP-BAG-10KG', 'pakety-mayka-10kg-33x57', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты «Майка» SANPACK 10 кг, 33×57 см, 100 шт.', 'SANPACK «Mayka» paketlari 10 kg, 33×57 sm, 100 dona', 'SANPACK T-shirt bags 10 kg, 33×57 cm, 100 pcs', 'упаковка', 'pack', { load: '10 кг', size: '33×57 см', package_quantity: '100 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-019', 'SP-BAG-25KG', 'pakety-mayka-25kg-46x70', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты «Майка» SANPACK 25 кг, 46×70 см, 25 шт.', 'SANPACK «Mayka» paketlari 25 kg, 46×70 sm, 25 dona', 'SANPACK T-shirt bags 25 kg, 46×70 cm, 25 pcs', 'упаковка', 'pack', { load: '25 кг', size: '46×70 см', package_quantity: '25 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-020', 'SP-BAG-50KG', 'pakety-mayka-50kg-52x100', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты «Майка» SANPACK 50 кг, 52×100 см, 25 шт.', 'SANPACK «Mayka» paketlari 50 kg, 52×100 sm, 25 dona', 'SANPACK T-shirt bags 50 kg, 52×100 cm, 25 pcs', 'упаковка', 'pack', { load: '50 кг', size: '52×100 см', package_quantity: '25 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-021', 'SP-BAG-LOGO', 'pakety-s-logotipom-na-zakaz', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты с логотипом на заказ', 'Logotipli paketlar buyurtma asosida', 'Custom printed carrier bags', 'кг', 'kilogram', { size: 'На выбор', color: 'На выбор', printing: 'Логотип заказчика' }, { brandName: 'SANPACK', ownProduction: true, minimumOrder: 100 }),
  item('catalog-v14-022', 'SP-ROLL-1927', 'pakety-v-rulone-19x27-222', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты в рулоне 19×27 см, 222 шт.', 'Rulondagi paketlar 19×27 sm, 222 dona', 'Roll bags 19×27 cm, 222 pcs', 'рулон', 'roll', { size: '19×27 см', package_quantity: '222 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-023', 'SP-ROLL-2838', 'pakety-v-rulone-28x38-303', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты в рулоне 28×38 см, 303 шт.', 'Rulondagi paketlar 28×38 sm, 303 dona', 'Roll bags 28×38 cm, 303 pcs', 'рулон', 'roll', { size: '28×38 см', package_quantity: '303 шт.' }, { brandName: 'SANPACK', ownProduction: true }),
  item('catalog-v14-024', 'SP-PIZZA-BAG', 'pakety-dlya-pitstsy', 'cat-tshirt-bags', 'pakety-mayka', 'Пакеты для пиццы', 'Pitsa paketlari', 'Pizza carrier bags', 'упаковка', 'pack', { purpose: 'Для коробок с пиццей' }),
];

const hygiene = [
  item('catalog-v14-025', 'SP-HYG-001', 'listovye-bumazhnye-polotentsa', 'cat-consumables', 'consumables', 'Листовые бумажные полотенца', 'Varaqli qog‘oz sochiqlar', 'Folded paper towels', 'упаковка', 'pack', { size: '21×17 см / 19,5×10,5 см', pack_options: '75 / 100 / 180 / 200 шт.' }),
  item('catalog-v14-026', 'SP-HYG-002', 'bumazhnye-salfetki-32x33', 'cat-consumables', 'consumables', 'Бумажные салфетки 32×33 см, двухслойные', 'Qog‘oz salfetkalar 32×33 sm, ikki qatlamli', 'Two-ply paper napkins 32×33 cm', 'упаковка', 'pack', { layers: '2', size: '32×33 см', package_quantity: '40 шт.' }),
  item('catalog-v14-027', 'SP-HYG-003', 'bumazhnye-polotentsa-2-rulona', 'cat-consumables', 'consumables', 'Бумажные полотенца, двухслойные, 2 рулона', 'Qog‘oz sochiqlar, ikki qatlamli, 2 rulon', 'Two-ply paper towels, 2 rolls', 'упаковка', 'pack', { layers: '2', package_quantity: '2 рулона' }),
  item('catalog-v14-028', 'SP-HYG-004', 'tualetnaya-bumaga-8-rulonov', 'cat-consumables', 'consumables', 'Туалетная бумага, двухслойная, 8 рулонов', 'Tualet qog‘ozi, ikki qatlamli, 8 rulon', 'Two-ply toilet paper, 8 rolls', 'упаковка', 'pack', { layers: '2', package_quantity: '8 рулонов', roll_length: '27 м' }),
  item('catalog-v14-029', 'SP-HYG-005', 'bumazhnye-salfetki-23x23', 'cat-consumables', 'consumables', 'Бумажные салфетки 23×23 см', 'Qog‘oz salfetkalar 23×23 sm', 'Paper napkins 23×23 cm', 'упаковка', 'pack', { size: '23×23 см', pack_options: '50 / 100 шт.' }),
  item('catalog-v14-030', 'SP-HYG-006', 'tryapka-dlya-stekol', 'cat-consumables', 'consumables', 'Тряпка для стёкол', 'Shisha uchun latta', 'Glass cleaning cloth', 'штука', 'piece'),
  item('catalog-v14-031', 'SP-HYG-007', 'salfetki-dlya-stekol', 'cat-consumables', 'consumables', 'Салфетки для стёкол', 'Shisha uchun salfetkalar', 'Glass cleaning wipes', 'упаковка', 'pack'),
  item('catalog-v14-032', 'SP-HYG-008', 'tryapki-v-rulone-20', 'cat-consumables', 'consumables', 'Тряпки в рулоне, 20 шт.', 'Rulondagi lattalar, 20 dona', 'Cleaning cloth roll, 20 pcs', 'рулон', 'roll', { package_quantity: '20 шт.' }),
  item('catalog-v14-033', 'SP-HYG-009', 'tryapki-universalnye-3', 'cat-consumables', 'consumables', 'Тряпки универсальные, 3 шт.', 'Universal lattalar, 3 dona', 'Universal cleaning cloths, 3 pcs', 'упаковка', 'pack', { package_quantity: '3 шт.' }),
  item('catalog-v14-034', 'SP-HYG-010', 'gubki-dlya-posudy-3', 'cat-consumables', 'consumables', 'Губки для посуды, 3 шт.', 'Idish yuvish gubkalari, 3 dona', 'Dishwashing sponges, 3 pcs', 'упаковка', 'pack', { package_quantity: '3 шт.' }),
];

const grocery = [
  item('catalog-v14-035', 'SP-GRC-001', 'ris-lazer', 'cat-groceries', 'bakaleya', 'Рис Лазер', 'Lazer guruchi', 'Lazer rice', 'кг', 'kilogram', { product_type: 'Рис' }),
  item('catalog-v14-036', 'SP-GRC-002', 'ris-alanga', 'cat-groceries', 'bakaleya', 'Рис Аланга', 'Alanga guruchi', 'Alanga rice', 'кг', 'kilogram', { product_type: 'Рис' }),
  item('catalog-v14-037', 'SP-GRC-003', 'grechka', 'cat-groceries', 'bakaleya', 'Гречка', 'Grechka', 'Buckwheat', 'кг', 'kilogram'),
  item('catalog-v14-038', 'SP-GRC-004', 'chechevitsa', 'cat-groceries', 'bakaleya', 'Чечевица', 'Yasmiq', 'Lentils', 'кг', 'kilogram'),
  item('catalog-v14-039', 'SP-GRC-005', 'nut-iran', 'cat-groceries', 'bakaleya', 'Нут (Иран)', 'No‘xat (Eron)', 'Chickpeas (Iran)', 'кг', 'kilogram', { origin: 'Иран' }),
  item('catalog-v14-040', 'SP-GRC-006', 'nut-amerika', 'cat-groceries', 'bakaleya', 'Нут (Америка)', 'No‘xat (Amerika)', 'Chickpeas (USA)', 'кг', 'kilogram', { origin: 'Америка' }),
  item('catalog-v14-041', 'SP-GRC-007', 'muka-dani-nan', 'cat-groceries', 'bakaleya', 'Мука Dani Nan', 'Dani Nan uni', 'Dani Nan flour', 'мешок', 'pack', { grades: 'Высший сорт / первый сорт', package_weight: '50 кг' }, { brandName: 'Dani Nan' }),
  item('catalog-v14-042', 'SP-GRC-008', 'muka-motabar', 'cat-groceries', 'bakaleya', 'Мука Mo‘tabar', 'Mo‘tabar uni', 'Mo‘tabar flour', 'мешок', 'pack', { grades: 'Высший сорт / первый сорт', package_weight: '50 кг' }, { brandName: 'Mo‘tabar' }),
  item('catalog-v14-043', 'SP-GRC-009', 'muka-altyn-dan', 'cat-groceries', 'bakaleya', 'Мука Алтын Дан', 'Altyn Dan uni', 'Altyn Dan flour', 'мешок', 'pack', { grades: 'Высший сорт / первый сорт', package_weight: '50 кг' }, { brandName: 'Алтын Дан' }),
  item('catalog-v14-044', 'SP-GRC-010', 'sakhar-rossiya', 'cat-groceries', 'bakaleya', 'Сахар (Россия)', 'Shakar (Rossiya)', 'Sugar (Russia)', 'кг', 'kilogram', { origin: 'Россия' }),
  item('catalog-v14-045', 'SP-GRC-011', 'maslo-oleyna', 'cat-groceries', 'bakaleya', 'Подсолнечное масло «Олейна»', '«Oleyna» kungaboqar yog‘i', 'Oleina sunflower oil', 'бутылка', 'liter', { volume: '5 л' }, { brandName: 'Олейна' }),
  item('catalog-v14-046', 'SP-FOOD-001', 'kurinoe-myaso', 'cat-food', 'food-horeca', 'Куриное мясо', 'Tovuq go‘shti', 'Chicken meat', 'кг', 'kilogram', { cuts: 'Целая тушка / отдельные части' }),
  item('catalog-v14-047', 'SP-FOOD-002', 'govyadina', 'cat-food', 'food-horeca', 'Говядина', 'Mol go‘shti', 'Beef', 'кг', 'kilogram', { cuts: 'Разные части / мякоть / мясо на кости' }),
  item('catalog-v14-048', 'SP-FOOD-003', 'frukty', 'cat-food', 'food-horeca', 'Фрукты', 'Mevalar', 'Fruit', 'кг', 'kilogram', { assortment: 'Сезонный ассортимент' }),
];

const cheeseAndButter = [
  item('catalog-v14-049', 'SP-DAIRY-001', 'syr-svalya-3kg', 'cat-cheeses', 'syry-i-maslo', 'Сыр Svalya полутвёрдый, 45%, 3 кг', 'Svalya yarim qattiq pishlog‘i, 45%, 3 kg', 'Svalya semi-hard cheese, 45%, 3 kg', 'упаковка', 'pack', { fat: '45%', weight: '3 кг' }, { brandName: 'Svalya' }),
  item('catalog-v14-050', 'SP-DAIRY-002', 'syr-viola-plavlenyy-400g', 'cat-cheeses', 'syry-i-maslo', 'Сыр Viola плавленый, 60%, 400 г', 'Viola eritilgan pishlog‘i, 60%, 400 g', 'Viola processed cheese, 60%, 400 g', 'упаковка', 'pack', { fat: '60%', weight: '400 г' }, { brandName: 'Viola' }),
  item('catalog-v14-051', 'SP-DAIRY-003', 'syr-valio-cheese-burger-150g', 'cat-cheeses', 'syry-i-maslo', 'Сыр Valio Cheese Burger, 150 г', 'Valio Cheese Burger pishlog‘i, 150 g', 'Valio Cheese Burger slices, 150 g', 'упаковка', 'pack', { weight: '150 г' }, { brandName: 'Valio' }),
  item('catalog-v14-052', 'SP-DAIRY-004', 'syr-valio-narezka-150g', 'cat-cheeses', 'syry-i-maslo', 'Сыр Valio в нарезке, 150 г', 'Valio tilimlangan pishlog‘i, 150 g', 'Valio sliced cheese, 150 g', 'упаковка', 'pack', { weight: '150 г' }, { brandName: 'Valio' }),
  item('catalog-v14-053', 'SP-DAIRY-005', 'syr-fitaki-original-500g', 'cat-cheeses', 'syry-i-maslo', 'Сыр Fitaki Original мягкий, 500 г', 'Fitaki Original yumshoq pishlog‘i, 500 g', 'Fitaki Original soft cheese, 500 g', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Fitaki' }),
  item('catalog-v14-054', 'SP-DAIRY-006', 'syr-camembert-125g', 'cat-cheeses', 'syry-i-maslo', 'Сыр Camembert, 125 г', 'Camembert pishlog‘i, 125 g', 'Camembert cheese, 125 g', 'упаковка', 'pack', { weight: '125 г' }),
  item('catalog-v14-055', 'SP-DAIRY-007', 'syr-brie-125g', 'cat-cheeses', 'syry-i-maslo', 'Сыр Brie, 125 г', 'Brie pishlog‘i, 125 g', 'Brie cheese, 125 g', 'упаковка', 'pack', { weight: '125 г' }),
  item('catalog-v14-056', 'SP-DAIRY-008', 'syr-parnidzhio-1kg', 'cat-cheeses', 'syry-i-maslo', 'Сыр Парниджио твёрдый, 40%, 1 кг', 'Parnidjio qattiq pishlog‘i, 40%, 1 kg', 'Parnigio hard cheese, 40%, 1 kg', 'упаковка', 'pack', { fat: '40%', weight: '1 кг' }, { brandName: 'Парниджио' }),
  item('catalog-v14-057', 'SP-DAIRY-009', 'syr-dorblu-classic-2-5kg', 'cat-cheeses', 'syry-i-maslo', 'Сыр Dorblu Classic полутвёрдый, 2,5 кг', 'Dorblu Classic yarim qattiq pishlog‘i, 2,5 kg', 'Dorblu Classic semi-hard cheese, 2.5 kg', 'упаковка', 'pack', { weight: '2,5 кг' }, { brandName: 'Dorblu' }),
  item('catalog-v14-058', 'SP-DAIRY-010', 'syr-landana-green-pesto', 'cat-cheeses', 'syry-i-maslo', 'Сыр Landana Green Pesto, 50%, 4–5 кг', 'Landana Green Pesto pishlog‘i, 50%, 4–5 kg', 'Landana Green Pesto cheese, 50%, 4–5 kg', 'упаковка', 'pack', { fat: '50%', weight: '4–5 кг' }, { brandName: 'Landana' }),
  item('catalog-v14-059', 'SP-DAIRY-011', 'syr-landana-mild-goat', 'cat-cheeses', 'syry-i-maslo', 'Сыр Landana Mild Goat, 50%, 4–6 кг', 'Landana Mild Goat pishlog‘i, 50%, 4–6 kg', 'Landana Mild Goat cheese, 50%, 4–6 kg', 'упаковка', 'pack', { fat: '50%', weight: '4–6 кг' }, { brandName: 'Landana' }),
  item('catalog-v14-060', 'SP-DAIRY-012', 'maslo-svalya-25kg', 'cat-cheeses', 'syry-i-maslo', 'Масло сливочное Svalya, 82%, 25 кг', 'Svalya sariyog‘i, 82%, 25 kg', 'Svalya butter, 82%, 25 kg', 'упаковка', 'pack', { fat: '82%', weight: '25 кг' }, { brandName: 'Svalya' }),
  item('catalog-v14-061', 'SP-DAIRY-013', 'maslo-valio-1kg', 'cat-cheeses', 'syry-i-maslo', 'Масло сливочное Valio, 1 кг', 'Valio sariyog‘i, 1 kg', 'Valio butter, 1 kg', 'упаковка', 'pack', { weight: '1 кг' }, { brandName: 'Valio' }),
  item('catalog-v14-062', 'SP-DAIRY-014', 'maslo-valio-500g', 'cat-cheeses', 'syry-i-maslo', 'Масло сливочное Valio, 82%, 500 г', 'Valio sariyog‘i, 82%, 500 g', 'Valio butter, 82%, 500 g', 'упаковка', 'pack', { fat: '82%', weight: '500 г' }, { brandName: 'Valio' }),
  item('catalog-v14-063', 'SP-DAIRY-015', 'maslo-fin-500g', 'cat-cheeses', 'syry-i-maslo', 'Масло сливочное FIN, 79%, 500 г', 'FIN sariyog‘i, 79%, 500 g', 'FIN butter, 79%, 500 g', 'упаковка', 'pack', { fat: '79%', weight: '500 г' }, { brandName: 'FIN' }),
];

const greens = [
  item('catalog-v14-064', 'SP-GREEN-001', 'rukola-novagreen', 'cat-greens', 'svezhaya-zelen', 'Рукола Novagreen', 'Novagreen rukolasi', 'Novagreen arugula', 'упаковка', 'pack', { pack_options: '250 / 500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-065', 'SP-GREEN-002', 'aysberg-novagreen', 'cat-greens', 'svezhaya-zelen', 'Салат Айсберг Novagreen', 'Novagreen Aysberg salati', 'Novagreen Iceberg lettuce', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-066', 'SP-GREEN-003', 'mangold-novagreen', 'cat-greens', 'svezhaya-zelen', 'Мангольд Novagreen', 'Novagreen mangoldi', 'Novagreen Swiss chard', 'упаковка', 'pack', { pack_options: '250 / 500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-067', 'SP-GREEN-004', 'shpinat-novagreen', 'cat-greens', 'svezhaya-zelen', 'Шпинат Novagreen', 'Novagreen ismaloqi', 'Novagreen spinach', 'упаковка', 'pack', { pack_options: '250 / 500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-068', 'SP-GREEN-005', 'latuk-novagreen', 'cat-greens', 'svezhaya-zelen', 'Латук Novagreen', 'Novagreen latugi', 'Novagreen leaf lettuce', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-069', 'SP-GREEN-006', 'romano-novagreen', 'cat-greens', 'svezhaya-zelen', 'Салат Романо Novagreen', 'Novagreen Romano salati', 'Novagreen Romaine lettuce', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-070', 'SP-GREEN-007', 'lollo-rossa-novagreen', 'cat-greens', 'svezhaya-zelen', 'Салат Лолло Росса Novagreen', 'Novagreen Lollo Rossa salati', 'Novagreen Lollo Rosso lettuce', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-071', 'SP-GREEN-008', 'keyl-novagreen', 'cat-greens', 'svezhaya-zelen', 'Кейл Novagreen', 'Novagreen keyli', 'Novagreen kale', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-072', 'SP-GREEN-009', 'myata-novagreen', 'cat-greens', 'svezhaya-zelen', 'Мята Novagreen', 'Novagreen yalpizi', 'Novagreen mint', 'упаковка', 'pack', { pack_options: '60 / 500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-073', 'SP-GREEN-010', 'petrushka-novagreen', 'cat-greens', 'svezhaya-zelen', 'Петрушка Novagreen', 'Novagreen petrushkasi', 'Novagreen parsley', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-074', 'SP-GREEN-011', 'rozmarin-novagreen', 'cat-greens', 'svezhaya-zelen', 'Розмарин Novagreen', 'Novagreen rozmarini', 'Novagreen rosemary', 'упаковка', 'pack', { pack_options: '20 / 250 / 500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-075', 'SP-GREEN-012', 'ukrop-novagreen', 'cat-greens', 'svezhaya-zelen', 'Укроп Novagreen', 'Novagreen ukropi', 'Novagreen dill', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-076', 'SP-GREEN-013', 'zelenyy-luk-novagreen', 'cat-greens', 'svezhaya-zelen', 'Зелёный лук Novagreen', 'Novagreen ko‘k piyozi', 'Novagreen spring onion', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-077', 'SP-GREEN-014', 'kinza-novagreen', 'cat-greens', 'svezhaya-zelen', 'Кинза Novagreen', 'Novagreen kinzasi', 'Novagreen coriander', 'упаковка', 'pack', { weight: '500 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-078', 'SP-MICRO-001', 'mikrozelen-amarant', 'cat-greens', 'svezhaya-zelen', 'Микрозелень амаранта Novagreen', 'Novagreen amarant mikroko‘kati', 'Novagreen amaranth microgreens', 'упаковка', 'pack', { weight: '200 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-079', 'SP-MICRO-002', 'mikrozelen-gorokh', 'cat-greens', 'svezhaya-zelen', 'Микрозелень гороха Novagreen', 'Novagreen no‘xat mikroko‘kati', 'Novagreen pea shoots', 'упаковка', 'pack', { weight: '200 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-080', 'SP-MICRO-003', 'mikrozelen-rukola', 'cat-greens', 'svezhaya-zelen', 'Микрозелень руколы Novagreen', 'Novagreen rukola mikroko‘kati', 'Novagreen arugula microgreens', 'упаковка', 'pack', { weight: '200 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-081', 'SP-MICRO-004', 'mikrozelen-rediska', 'cat-greens', 'svezhaya-zelen', 'Микрозелень редиски Novagreen', 'Novagreen rediska mikroko‘kati', 'Novagreen radish microgreens', 'упаковка', 'pack', { weight: '200 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-082', 'SP-MICRO-005', 'mikrozelen-gorchitsa', 'cat-greens', 'svezhaya-zelen', 'Микрозелень горчицы Novagreen', 'Novagreen xantal mikroko‘kati', 'Novagreen mustard microgreens', 'упаковка', 'pack', { weight: '200 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-083', 'SP-MICRO-006', 'mikrozelen-brokkoli', 'cat-greens', 'svezhaya-zelen', 'Микрозелень брокколи Novagreen', 'Novagreen brokkoli mikroko‘kati', 'Novagreen broccoli microgreens', 'упаковка', 'pack', { weight: '200 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-084', 'SP-MICRO-007', 'mikrozelen-kress-salat', 'cat-greens', 'svezhaya-zelen', 'Микрозелень кресс-салата Novagreen', 'Novagreen kress-salat mikroko‘kati', 'Novagreen garden cress microgreens', 'упаковка', 'pack', { weight: '200 г' }, { brandName: 'Novagreen' }),
  item('catalog-v14-085', 'SP-GRC-012', 'yablochnyy-uksus-350ml', 'cat-groceries', 'bakaleya', 'Яблочный уксус, 350 мл', 'Olma sirkasi, 350 ml', 'Apple cider vinegar, 350 ml', 'бутылка', 'milliliter', { volume: '350 мл' }),
];

const catalogItems: CatalogItem[] = [
  ...trashBags,
  ...filmsAndGloves,
  ...carrierBags,
  ...hygiene,
  ...grocery,
  ...cheeseAndButter,
  ...greens,
];

function getProductImage(entry: CatalogItem): string {
  if (entry.categoryId === 'cat-trash-bags') {
    return '/catalog/sanpack_trash_bag_roll_10.png';
  }
  if (entry.categoryId === 'cat-tshirt-bags') {
    return '/catalog/commercial_packaging_2.png';
  }
  if (entry.categoryId === 'cat-film-foil') {
    return '/catalog/commercial_packaging_5.webp';
  }
  if (entry.categoryId === 'cat-gloves') {
    return '/catalog/commercial_packaging_8.webp';
  }
  if (entry.categoryId === 'cat-consumables') {
    return '/catalog/commercial_packaging_3.webp';
  }
  if (entry.categoryId === 'cat-groceries') {
    return '/catalog/extracted_p11_img3.jpeg';
  }
  if (entry.categoryId === 'cat-cheeses') {
    return '/catalog/extracted_p12_img2.jpeg';
  }
  if (entry.categoryId === 'cat-greens') {
    return '/catalog/extracted_p13_img1.jpeg';
  }
  if (entry.categoryId === 'cat-food') {
    return '/catalog/extracted_p14_img1.jpeg';
  }
  return PLACEHOLDER_IMAGE;
}

export const catalogV14Products: Product[] = catalogItems.map((entry, index) => {
  const img = getProductImage(entry);
  return {
    id: entry.id,
    slug: entry.slug,
    sku: entry.sku,
    status: 'published',
    brandName: entry.brandName,
    categoryId: entry.categoryId,
    categorySlug: entry.categorySlug,
    titleRu: entry.titleRu,
    titleUz: entry.titleUz,
    titleEn: entry.titleEn,
    shortDescriptionRu: `${entry.titleRu}. Позиция из каталога SANPACK v1.4.`,
    shortDescriptionUz: `${entry.titleUz}. SANPACK v1.4 katalogidagi mahsulot.`,
    shortDescriptionEn: `${entry.titleEn}. Product from the SANPACK v1.4 catalogue.`,
    descriptionRu: `Оптовая поставка от SANPACK. Характеристики и доступность уточняйте у менеджера.`,
    descriptionUz: `SANPACK ulgurji yetkazib berishi. Xususiyatlar va mavjudlikni menejerdan aniqlashtiring.`,
    descriptionEn: `Wholesale supply by SANPACK. Confirm specifications and availability with a manager.`,
    images: [img],
    mainImage: img,
    attributes: {
      ...entry.attributes,
      ...(entry.brandName ? { brand: entry.brandName } : {}),
    },
    variants: [],
    currency: 'UZS',
    showPrice: false,
    stockStatus: 'on_order',
    minimumOrder: entry.minimumOrder ?? 1,
    salesUnit: entry.salesUnit,
    unitCode: entry.unitCode,
    quantityStep: 1,
    priceMode: 'request',
    availability: 'on_order',
    featured: index < 8,
    newProduct: index >= 8 && index < 14,
    ownProduction: entry.ownProduction ?? false,
    sortOrder: index + 1,
    seo: {
      titleRu: `${entry.titleRu} — SANPACK`,
      titleUz: `${entry.titleUz} — SANPACK`,
      titleEn: `${entry.titleEn} — SANPACK`,
    },
    createdAt: IMPORTED_AT,
    updatedAt: IMPORTED_AT,
  };
});

export const catalogV14Categories: Category[] = [
  { id: 'cat-packaging', slug: 'packaging', titleRu: 'Упаковка и пакеты', titleUz: 'Qadoqlash va paketlar', titleEn: 'Packaging and bags', descriptionRu: 'Пакеты, мусорные мешки и упаковочные решения.', descriptionUz: 'Paketlar, chiqindi qoplari va qadoqlash yechimlari.', descriptionEn: 'Bags, refuse sacks and packaging solutions.', image: '/catalog/categories/packaging_hero.png', icon: 'Package', status: 'active', sortOrder: 1 },
  { id: 'cat-trash-bags', parentId: 'cat-packaging', slug: 'meshki-dlya-musora', titleRu: 'Мешки для мусора', titleUz: 'Chiqindi qoplari', titleEn: 'Refuse bags', image: '/catalog/categories/trash_bags.png', icon: 'Trash2', status: 'active', sortOrder: 10 },
  { id: 'cat-tshirt-bags', parentId: 'cat-packaging', slug: 'pakety-mayka', titleRu: 'Пакеты «Майка» и рулонные', titleUz: '«Mayka» va rulonli paketlar', titleEn: 'Carrier and roll bags', image: '/catalog/categories/carrier_bags.png', icon: 'ShoppingBag', status: 'active', sortOrder: 11 },
  { id: 'cat-consumables', slug: 'consumables', titleRu: 'Расходные материалы и гигиена', titleUz: 'Sarf materiallari va gigiyena', titleEn: 'Consumables and hygiene', image: '/catalog/categories/cleaning.png', icon: 'Shield', status: 'active', sortOrder: 2 },
  { id: 'cat-gloves', parentId: 'cat-consumables', slug: 'perchatki', titleRu: 'Перчатки', titleUz: 'Qo‘lqoplar', titleEn: 'Gloves', image: '/catalog/categories/gloves.png', icon: 'Hand', status: 'active', sortOrder: 20 },
  { id: 'cat-film-foil', parentId: 'cat-consumables', slug: 'folga-i-plenka', titleRu: 'Фольга, плёнка и пергамент', titleUz: 'Folga, plyonka va pergament', titleEn: 'Foil, film and parchment', image: '/catalog/categories/food_packaging.png', icon: 'Film', status: 'active', sortOrder: 21 },
  { id: 'cat-food', slug: 'food-horeca', titleRu: 'Продукты питания', titleUz: 'Oziq-ovqat mahsulotlari', titleEn: 'Food products', image: '/catalog/categories/food_hero.png', icon: 'Utensils', status: 'active', sortOrder: 3 },
  { id: 'cat-groceries', parentId: 'cat-food', slug: 'bakaleya', titleRu: 'Бакалея, рис и мука', titleUz: 'Baqolchilik, guruch va un', titleEn: 'Groceries, rice and flour', image: '/catalog/categories/flour.png', icon: 'Wheat', status: 'active', sortOrder: 30 },
  { id: 'cat-cheeses', parentId: 'cat-food', slug: 'syry-i-maslo', titleRu: 'Сыры и сливочное масло', titleUz: 'Pishloqlar va sariyog‘', titleEn: 'Cheese and butter', image: '/catalog/categories/dairy.png', icon: 'PieChart', status: 'active', sortOrder: 31 },
  { id: 'cat-greens', parentId: 'cat-food', slug: 'svezhaya-zelen', titleRu: 'Свежая зелень Novagreen', titleUz: 'Yangi ko‘katlar Novagreen', titleEn: 'Fresh Novagreen produce', image: '/catalog/categories/fresh_greens.png', icon: 'Leaf', status: 'active', sortOrder: 32 },
  { id: 'cat-branding', slug: 'branding-polygraphy', titleRu: 'Полиграфия и брендирование', titleUz: 'Poligrafiya va brendlash', titleEn: 'Printing and branding', image: '/catalog/commercial_packaging_10.webp', icon: 'Printer', status: 'active', sortOrder: 4 },
];

export const catalogV14Attributes: Attribute[] = [
  { id: 'attr-brand', key: 'brand', titleRu: 'Бренд', titleUz: 'Brend', titleEn: 'Brand', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 1 },
  { id: 'attr-size', key: 'size', titleRu: 'Размер', titleUz: 'O‘lcham', titleEn: 'Size', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 2 },
  { id: 'attr-volume', key: 'volume', titleRu: 'Объём', titleUz: 'Hajm', titleEn: 'Volume', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 3 },
  { id: 'attr-weight', key: 'weight', titleRu: 'Вес', titleUz: 'Og‘irlik', titleEn: 'Weight', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 4 },
  { id: 'attr-package-quantity', key: 'package_quantity', titleRu: 'Количество в упаковке', titleUz: 'Qadoqdagi miqdor', titleEn: 'Pack quantity', type: 'text', filterable: false, required: false, cardVisible: true, productVisible: true, sortOrder: 5 },
  { id: 'attr-material', key: 'material', titleRu: 'Материал', titleUz: 'Material', titleEn: 'Material', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 6 },
  { id: 'attr-origin', key: 'origin', titleRu: 'Страна происхождения', titleUz: 'Kelib chiqishi', titleEn: 'Origin', type: 'text', filterable: true, required: false, cardVisible: false, productVisible: true, sortOrder: 7 },
  { id: 'attr-fat', key: 'fat', titleRu: 'Жирность', titleUz: 'Yog‘lilik', titleEn: 'Fat content', type: 'text', filterable: true, required: false, cardVisible: true, productVisible: true, sortOrder: 8 },
];

if (catalogV14Products.length !== 85) {
  throw new Error(`Ожидалось 85 товаров каталога SANPACK v1.4, получено ${catalogV14Products.length}.`);
}
