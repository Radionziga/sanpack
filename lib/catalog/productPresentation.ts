import type { Attribute, Language, Product, QuantityUnit } from '@/types';
import { fixPrepositions } from '@/lib/utils/formatText';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import { localizeSeedAttributeValue } from '@/lib/catalog/seedProductLocalization';

type ContentLanguage = Exclude<Language, 'zh'>;

function getContentLanguage(language: Language): ContentLanguage {
  return language === 'zh' ? 'en' : language;
}

const localeByLanguage: Record<ContentLanguage, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  en: 'en-US',
};

const currencyLabelByLanguage: Record<ContentLanguage, string> = {
  ru: 'сум',
  uz: 'so‘m',
  en: 'UZS',
};

const hiddenAttributeKeys = new Set([
  'sku',
  'id',
  'category_id',
  'categoryid',
  'own_production',
  'ownproduction',
  'popular',
  'search_text',
  'searchtext',
  'image',
  'main_image',
  'mainimage',
]);

const chineseAttributeLabels: Record<string, string> = {
  brand: '品牌', product_type: '商品类型', size: '尺寸', weight: '重量', volume: '容量',
  units_per_pack: '每包数量', package_quantity: '包装数量', packs_per_sack: '每袋或每箱包数',
  load: '承重', load_capacity: '承重', grade: '等级', origin: '产地', material: '材质',
  thickness: '厚度', density: '密度', fat: '脂肪含量', packaging_type: '包装类型',
  horeca_category: '分类', price_per_kg: '每千克价格', color: '颜色',
};

const chineseAttributeUnits: Record<string, string> = {
  units_per_pack: '件', packs_per_sack: '包', load_capacity: '千克', price_per_kg: '千克',
};

interface AttributePresentationFallback {
  labels: Record<ContentLanguage, string>;
  units?: Partial<Record<ContentLanguage, string>>;
  moneyUnit?: Partial<Record<ContentLanguage, string>>;
  sortOrder: number;
}

const fallbackAttributePresentation: Record<string, AttributePresentationFallback> = {
  brand: {
    labels: { ru: 'Бренд', uz: 'Brend', en: 'Brand' },
    sortOrder: 10,
  },
  product_type: {
    labels: { ru: 'Вид продукта', uz: 'Mahsulot turi', en: 'Product type' },
    sortOrder: 20,
  },
  size: {
    labels: { ru: 'Размер', uz: 'O‘lcham', en: 'Size' },
    sortOrder: 30,
  },
  weight: {
    labels: { ru: 'Вес', uz: 'Og‘irlik', en: 'Weight' },
    sortOrder: 40,
  },
  volume: {
    labels: { ru: 'Объём', uz: 'Hajm', en: 'Volume' },
    sortOrder: 50,
  },
  units_per_pack: {
    labels: { ru: 'Количество в упаковке', uz: 'Qadoqdagi miqdor', en: 'Units per pack' },
    units: { ru: 'шт.', uz: 'dona', en: 'pcs' },
    sortOrder: 60,
  },
  package_quantity: {
    labels: { ru: 'Количество в упаковке', uz: 'Qadoqdagi miqdor', en: 'Pack quantity' },
    sortOrder: 65,
  },
  packs_per_sack: {
    labels: { ru: 'Упаковок в мешке или коробке', uz: 'Qop yoki qutidagi qadoqlar', en: 'Packs per sack or case' },
    units: { ru: 'уп.', uz: 'qadoq', en: 'packs' },
    sortOrder: 70,
  },
  load: {
    labels: { ru: 'Допустимая нагрузка', uz: 'Yuk ko‘tarish quvvati', en: 'Load capacity' },
    sortOrder: 80,
  },
  load_capacity: {
    labels: { ru: 'Допустимая нагрузка', uz: 'Yuk ko‘tarish quvvati', en: 'Load capacity' },
    units: { ru: 'кг', uz: 'kg', en: 'kg' },
    sortOrder: 80,
  },
  grade: {
    labels: { ru: 'Сорт', uz: 'Nav', en: 'Grade' },
    sortOrder: 90,
  },
  origin: {
    labels: { ru: 'Страна происхождения', uz: 'Kelib chiqishi', en: 'Country of origin' },
    sortOrder: 100,
  },
  material: {
    labels: { ru: 'Материал', uz: 'Material', en: 'Material' },
    sortOrder: 110,
  },
  thickness: {
    labels: { ru: 'Толщина', uz: 'Qalinlik', en: 'Thickness' },
    sortOrder: 120,
  },
  density: {
    labels: { ru: 'Плотность', uz: 'Zichlik', en: 'Density' },
    sortOrder: 130,
  },
  fat: {
    labels: { ru: 'Жирность', uz: 'Yog‘lilik', en: 'Fat content' },
    sortOrder: 135,
  },
  packaging_type: {
    labels: { ru: 'Тип упаковки', uz: 'Qadoq turi', en: 'Packaging type' },
    sortOrder: 140,
  },
  horeca_category: {
    labels: { ru: 'Категория', uz: 'Kategoriya', en: 'Category' },
    sortOrder: 150,
  },
  color: {
    labels: { ru: 'Цвет', uz: 'Rang', en: 'Color' },
    sortOrder: 155,
  },
  printing: {
    labels: { ru: 'Печать', uz: 'Bosma', en: 'Printing' },
    sortOrder: 156,
  },
  price_per_kg: {
    labels: { ru: 'Цена за килограмм', uz: 'Kilogramm narxi', en: 'Price per kilogram' },
    moneyUnit: { ru: 'кг', uz: 'kg', en: 'kg' },
    sortOrder: 160,
  },
};

const localizedUnits: Record<string, Record<ContentLanguage, string>> = {
  'шт': { ru: 'шт.', uz: 'dona', en: 'pcs' },
  'шт.': { ru: 'шт.', uz: 'dona', en: 'pcs' },
  'уп': { ru: 'уп.', uz: 'qadoq', en: 'packs' },
  'уп.': { ru: 'уп.', uz: 'qadoq', en: 'packs' },
  'кг': { ru: 'кг', uz: 'kg', en: 'kg' },
  'г': { ru: 'г', uz: 'g', en: 'g' },
  'гр': { ru: 'г', uz: 'g', en: 'g' },
  'л': { ru: 'л', uz: 'l', en: 'L' },
  'мл': { ru: 'мл', uz: 'ml', en: 'ml' },
};

interface UnitForms {
  ru: { one: string; few: string; many: string; accusative: string };
  uz: { one: string; other: string };
  en: { one: string; other: string };
}

const unitForms: Record<string, UnitForms> = {
  piece: {
    ru: { one: 'штука', few: 'штуки', many: 'штук', accusative: 'штуку' },
    uz: { one: 'dona', other: 'dona' },
    en: { one: 'piece', other: 'pieces' },
  },
  pack: {
    ru: { one: 'упаковка', few: 'упаковки', many: 'упаковок', accusative: 'упаковку' },
    uz: { one: 'qadoq', other: 'qadoq' },
    en: { one: 'pack', other: 'packs' },
  },
  roll: {
    ru: { one: 'рулон', few: 'рулона', many: 'рулонов', accusative: 'рулон' },
    uz: { one: 'rulon', other: 'rulon' },
    en: { one: 'roll', other: 'rolls' },
  },
  box: {
    ru: { one: 'коробка', few: 'коробки', many: 'коробок', accusative: 'коробку' },
    uz: { one: 'quti', other: 'quti' },
    en: { one: 'box', other: 'boxes' },
  },
  sack: {
    ru: { one: 'мешок', few: 'мешка', many: 'мешков', accusative: 'мешок' },
    uz: { one: 'qop', other: 'qop' },
    en: { one: 'sack', other: 'sacks' },
  },
  tray: {
    ru: { one: 'лоток', few: 'лотка', many: 'лотков', accusative: 'лоток' },
    uz: { one: 'lotok', other: 'lotok' },
    en: { one: 'tray', other: 'trays' },
  },
  canister: {
    ru: { one: 'канистра', few: 'канистры', many: 'канистр', accusative: 'канистру' },
    uz: { one: 'kanistra', other: 'kanistra' },
    en: { one: 'canister', other: 'canisters' },
  },
  bottle: {
    ru: { one: 'бутылка', few: 'бутылки', many: 'бутылок', accusative: 'бутылку' },
    uz: { one: 'butilka', other: 'butilka' },
    en: { one: 'bottle', other: 'bottles' },
  },
  set: {
    ru: { one: 'набор', few: 'набора', many: 'наборов', accusative: 'набор' },
    uz: { one: 'to‘plam', other: 'to‘plam' },
    en: { one: 'set', other: 'sets' },
  },
  kilogram: {
    ru: { one: 'кг', few: 'кг', many: 'кг', accusative: 'килограмм' },
    uz: { one: 'kg', other: 'kg' },
    en: { one: 'kg', other: 'kg' },
  },
  gram: {
    ru: { one: 'г', few: 'г', many: 'г', accusative: 'грамм' },
    uz: { one: 'g', other: 'g' },
    en: { one: 'g', other: 'g' },
  },
  liter: {
    ru: { one: 'л', few: 'л', many: 'л', accusative: 'литр' },
    uz: { one: 'l', other: 'l' },
    en: { one: 'L', other: 'L' },
  },
  milliliter: {
    ru: { one: 'мл', few: 'мл', many: 'мл', accusative: 'миллилитр' },
    uz: { one: 'ml', other: 'ml' },
    en: { one: 'ml', other: 'ml' },
  },
};

const unitAliases: Record<string, string> = {
  'шт': 'piece',
  'штука': 'piece',
  'штуки': 'piece',
  piece: 'piece',
  pcs: 'piece',
  dona: 'piece',
  'уп': 'pack',
  'упаковка': 'pack',
  'пачка': 'pack',
  pack: 'pack',
  qadoq: 'pack',
  'рулон': 'roll',
  roll: 'roll',
  rulon: 'roll',
  'коробка': 'box',
  box: 'box',
  case: 'box',
  quti: 'box',
  'мешок': 'sack',
  sack: 'sack',
  qop: 'sack',
  'лоток': 'tray',
  tray: 'tray',
  lotok: 'tray',
  'канистра': 'canister',
  canister: 'canister',
  kanistra: 'canister',
  'бутылка': 'bottle',
  bottle: 'bottle',
  butilka: 'bottle',
  'набор': 'set',
  set: 'set',
  'кг': 'kilogram',
  'килограмм': 'kilogram',
  kilogram: 'kilogram',
  kg: 'kilogram',
  'г': 'gram',
  'гр': 'gram',
  'грамм': 'gram',
  gram: 'gram',
  'л': 'liter',
  'литр': 'liter',
  liter: 'liter',
  litre: 'liter',
  'мл': 'milliliter',
  'миллилитр': 'milliliter',
  milliliter: 'milliliter',
  millilitre: 'milliliter',
};

function getLocalizedValue(
  language: Language,
  ru: string,
  uz?: string,
  en?: string,
  zh?: string,
) {
  return resolveLocalizedText(language, { ru, uz, en, zh }).text;
}

function normalizeKey(key: string) {
  return key.trim().toLocaleLowerCase('en-US').replace(/-/g, '_');
}

function capitalize(value: string, language: Language) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toLocaleUpperCase(localeByLanguage[getContentLanguage(language)])}${trimmed.slice(1)}`;
}

function formatDeterministicNumber(
  value: number,
  language: Language,
  maximumFractionDigits: number,
) {
  const group = language === 'en' || language === 'zh' ? ',' : '\u00a0';
  const decimal = language === 'en' || language === 'zh' ? '.' : ',';

  // Node and Chromium currently ship different grouping data for uz-UZ.
  // Start from the stable en-US parts and localize separators ourselves so
  // server-rendered prices always match the hydrated client output.
  return new Intl.NumberFormat('en-US', { maximumFractionDigits })
    .formatToParts(value)
    .map((part) => {
      if (part.type === 'group') return group;
      if (part.type === 'decimal') return decimal;
      return part.value;
    })
    .join('');
}

function formatNumber(value: number, language: Language) {
  return formatDeterministicNumber(value, language, 3);
}

function parseNumericValue(value: string) {
  const normalized = value.replace(/[\s\u00a0\u202f']/g, '').replace(',', '.');
  return /^-?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

export function formatMoney(
  value: number,
  language: Language,
  currency = 'UZS',
) {
  const formatted = formatDeterministicNumber(value, language, 0);
  const normalizedCurrency = currency.trim().toLocaleLowerCase('ru-RU');
  const isUzbekSom = normalizedCurrency === 'uzs'
    || normalizedCurrency === 'сум'
    || /^so['‘’ʻ]?m$/i.test(normalizedCurrency);
  const currencyLabel = isUzbekSom
    ? language === 'zh' ? '苏姆' : currencyLabelByLanguage[getContentLanguage(language)]
    : currency;
  return `${formatted}\u00a0${currencyLabel}`;
}

function canonicalUnit(unit: string, unitCode?: QuantityUnit) {
  if (unitCode && unitCode !== 'custom' && unitCode !== 'service') return unitCode;
  const normalized = unit.trim().toLocaleLowerCase('ru-RU').replace(/\.$/, '');
  return unitAliases[normalized] || '';
}

function getUnitForm(value: number, unit: string, language: Language, unitCode?: QuantityUnit) {
  const canonical = canonicalUnit(unit, unitCode);
  const forms = unitForms[canonical];
  if (!forms) return unit.trim();
  if (language === 'zh') {
    return {
      piece: '件', pack: '包', roll: '卷', box: '箱', sack: '袋', tray: '托盘',
      canister: '桶', bottle: '瓶', set: '套', kilogram: '千克', gram: '克',
      liter: '升', milliliter: '毫升',
    }[canonical] || forms.en.other;
  }
  if (language === 'uz') return forms.uz.other;
  if (language === 'en') return Math.abs(value) === 1 ? forms.en.one : forms.en.other;

  const category = new Intl.PluralRules('ru-RU').select(value);
  if (category === 'one') return forms.ru.one;
  if (category === 'few') return forms.ru.few;
  return forms.ru.many;
}

export function formatQuantity(
  value: number,
  unit: string,
  language: Language,
  unitCode?: QuantityUnit,
) {
  const formattedValue = formatNumber(value, language);
  const formattedUnit = getUnitForm(value, unit, language, unitCode);
  return formattedUnit ? `${formattedValue}\u00a0${formattedUnit}` : formattedValue;
}

export function formatProductQuantity(product: Product, value: number, language: Language) {
  return formatQuantity(value, product.salesUnit || '', language, product.unitCode);
}

function formatAttributeValue(
  key: string,
  rawValue: string | number | boolean,
  definition: Attribute | undefined,
  language: Language,
  currency: string,
) {
  const option = definition?.options?.find(
    (candidate) => candidate.value === String(rawValue),
  );
  const localizedOption = option
    ? getLocalizedValue(language, option.labelRu, option.labelUz, option.labelEn, option.labelZh)
    : undefined;

  if (typeof rawValue === 'boolean') {
    if (language === 'uz') return rawValue ? 'Ha' : 'Yo‘q';
    if (language === 'en') return rawValue ? 'Yes' : 'No';
    if (language === 'zh') return rawValue ? '是' : '否';
    return rawValue ? 'Да' : 'Нет';
  }

  const fallback = fallbackAttributePresentation[key];
  const definitionUnit = definition?.unit?.trim() || '';
  const localizedDefinitionUnit = localizedUnits[definitionUnit.toLocaleLowerCase('ru-RU')]
    ?.[getContentLanguage(language)];
  const unit = language === 'zh'
    ? (definitionUnit ? localizeSeedAttributeValue(definitionUnit, 'zh') : chineseAttributeUnits[key] || '')
    : localizedDefinitionUnit || fallback?.units?.[getContentLanguage(language)] || definitionUnit;
  const moneyUnit = language === 'zh'
    ? (key === 'price_per_kg' ? '千克' : undefined)
    : fallback?.moneyUnit?.[getContentLanguage(language)];
  const isMoney = Boolean(moneyUnit)
    || definition?.key.startsWith('price_')
    || key.startsWith('price_')
    || /^(sum|сум|so['‘’]?m|uzs)$/i.test(unit);

  if (typeof rawValue === 'number') {
    if (isMoney) {
      const money = formatMoney(rawValue, language, currency);
      return moneyUnit ? `${money}/${moneyUnit}` : money;
    }
    return unit
      ? `${formatNumber(rawValue, language)}\u00a0${unit}`
      : formatNumber(rawValue, language);
  }

  const value = localizedOption || localizeSeedAttributeValue(rawValue.trim(), language);
  if (!value) return '';
  if (isMoney) {
    const numberValue = parseNumericValue(value);
    if (numberValue !== null) {
      const money = formatMoney(numberValue, language, currency);
      return moneyUnit ? `${money}/${moneyUnit}` : money;
    }
  }

  const withUnit = unit && !value.toLocaleLowerCase(localeByLanguage[getContentLanguage(language)])
    .includes(unit.toLocaleLowerCase(localeByLanguage[getContentLanguage(language)]))
    ? `${value}\u00a0${unit}`
    : value;

  return capitalize(withUnit, language);
}

export interface PresentedProductAttribute {
  key: string;
  label: string;
  value: string;
  sortOrder: number;
}

function isAmbiguousSingleUnitCount(
  key: string,
  rawValue: Product['attributes'][string],
  definition?: Attribute,
) {
  if (key !== 'units_per_pack' || definition?.unit?.trim()) return false;
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  return values.length === 1 && (values[0] === 1 || String(values[0]).trim() === '1');
}

export function getPresentedProductAttributes(
  product: Product,
  definitions: Attribute[],
  language: Language,
  attributeOverrides: Record<string, string> = {},
): PresentedProductAttribute[] {
  const definitionByKey = new Map(
    definitions.map((definition) => [normalizeKey(definition.key), definition]),
  );
  const attributes: Product['attributes'] = {
    ...product.attributes,
    ...attributeOverrides,
  };
  if (product.brandName?.trim() && !Object.keys(attributes).some((key) => normalizeKey(key) === 'brand')) {
    attributes.brand = product.brandName.trim();
  }

  return Object.entries(attributes)
    .map(([sourceKey, rawValue]) => {
      const key = normalizeKey(sourceKey);
      if (hiddenAttributeKeys.has(key)) return null;

      const definition = definitionByKey.get(key);
      if (definition?.productVisible === false || isAmbiguousSingleUnitCount(key, rawValue, definition)) {
        return null;
      }

      const fallback = fallbackAttributePresentation[key];
      const label = (language === 'zh' ? chineseAttributeLabels[key] : undefined)
        || fallback?.labels[getContentLanguage(language)]
        || (definition
          ? getLocalizedValue(language, definition.titleRu, definition.titleUz, definition.titleEn, definition.titleZh)
          : capitalize(key.replace(/_/g, ' '), language));
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      const value = values
        .map((item) => formatAttributeValue(key, item, definition, language, product.currency))
        .filter(Boolean)
        .join(', ');

      if (!value) return null;
      return {
        key,
        label,
        value,
        sortOrder: definition?.sortOrder ?? fallback?.sortOrder ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .filter((attribute): attribute is PresentedProductAttribute => attribute !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, localeByLanguage[getContentLanguage(language)]));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanDescription(description: string, title: string, language: Language) {
  let result = description.replace(/\s+/g, ' ').trim();
  if (!result) return '';

  const normalizedTitle = title.replace(/\s+/g, ' ').trim();
  if (normalizedTitle) {
    result = result.replace(
      new RegExp(`^${escapeRegExp(normalizedTitle)}(?:\\s*[.!,;:\u2014\u2013-]+\\s*|\\s+)?`, 'iu'),
      '',
    );
  }

  const boilerplatePatterns: Record<ContentLanguage, RegExp[]> = {
    ru: [
      /(?:Позиция|Товар)\s+из\s+(?:актуального\s+)?(?:прайс[- ]листа|каталога)(?:\s+SANPACK)?(?:\s+v?1\.4)?[.!?]?/giu,
      /Цена\s+(?:указана|приведена)\s+за\s+[^.!?]+[.!?]?/giu,
    ],
    uz: [
      /(?:SANPACK\s+v?1\.4\s+)?katalogidagi\s+mahsulot[.!?]?/giu,
      /Narx\s+[^.!?]+?\s+uchun\s+ko['‘’ʻ]?rsatilgan[.!?]?/giu,
    ],
    en: [
      /Product\s+from\s+(?:the\s+)?(?:current\s+)?SANPACK(?:\s+v?1\.4)?\s+(?:catalogue|catalog|price list)[.!?]?/giu,
      /Price\s+is\s+(?:shown|listed)\s+per\s+[^.!?]+[.!?]?/giu,
    ],
  };

  result = result.replace(/SANPACK\s+v?1\.4/giu, '');
  for (const pattern of boilerplatePatterns[getContentLanguage(language)]) result = result.replace(pattern, '');
  result = result
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])\1+/g, '$1')
    .replace(/^[\s,.;:\u2014\u2013-]+|[\s,;:\u2014\u2013-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (result.toLocaleLowerCase(localeByLanguage[getContentLanguage(language)]) === normalizedTitle.toLocaleLowerCase(localeByLanguage[getContentLanguage(language)])) {
    return '';
  }
  return fixPrepositions(result);
}

export function getProductSupportingText(product: Product, language: Language) {
  const title = getLocalizedValue(language, product.titleRu, product.titleUz, product.titleEn, product.titleZh);
  const description = getLocalizedValue(
    language,
    product.shortDescriptionRu,
    product.shortDescriptionUz,
    product.shortDescriptionEn,
    product.shortDescriptionZh,
  );
  return cleanDescription(description, title, language);
}

export function getProductDescriptionText(product: Product, language: Language) {
  const title = getLocalizedValue(language, product.titleRu, product.titleUz, product.titleEn, product.titleZh);
  const description = getLocalizedValue(
    language,
    product.descriptionRu,
    product.descriptionUz,
    product.descriptionEn,
    product.descriptionZh,
  );
  return cleanDescription(description, title, language);
}

function getLocalizedSalesUnit(product: Product, language: Language, accusative = false) {
  const canonical = canonicalUnit(product.salesUnit || '', product.unitCode);
  const forms = unitForms[canonical];
  if (!forms) return product.salesUnit?.trim();
  if (language === 'zh') {
    return {
      piece: '件', pack: '包', roll: '卷', box: '箱', sack: '袋', tray: '托盘',
      canister: '桶', bottle: '瓶', set: '套', kilogram: '千克', gram: '克',
      liter: '升', milliliter: '毫升',
    }[canonical] || forms.en.one;
  }
  if (language === 'uz') return forms.uz.one;
  if (language === 'en') return forms.en.one;
  return accusative ? forms.ru.accusative : forms.ru.one;
}

export function getProductSalesUnitLabel(product: Product, language: Language) {
  return getLocalizedSalesUnit(product, language) || product.salesUnit?.trim() || '';
}

export function getProductPriceLabel(product: Product, language: Language) {
  const unit = getLocalizedSalesUnit(product, language, language === 'ru');
  if (language === 'zh') return unit ? `每${unit}价格` : '价格';
  if (language === 'en') return unit ? `Price per ${unit}` : 'Price';
  if (language === 'uz') return unit ? capitalize(`${unit} uchun narx`, language) : 'Narx';
  return unit ? `Цена за ${unit}` : 'Цена';
}

export function getProductCatalogPriceText(product: Product, language: Language) {
  if (language === 'zh') {
    if (!product.showPrice) return '价格面议';
    const variantPrices = (product.variants || [])
      .map((variant) => variant.price)
      .filter((price): price is number => typeof price === 'number' && price > 0);
    if (product.variants?.length) {
      if (!variantPrices.length) return '价格面议';
      return `起价 ${formatMoney(Math.min(...variantPrices), language, product.currency)}`;
    }
    return product.price && product.price > 0
      ? formatMoney(product.price, language, product.currency)
      : '价格面议';
  }
  const priceOnRequest = {
    ru: 'Цена по запросу',
    uz: 'Narx so‘rov bo‘yicha',
    en: 'Price on request',
  }[getContentLanguage(language)];
  if (!product.showPrice) return priceOnRequest;

  const variantPrices = (product.variants || [])
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === 'number' && price > 0);
  if (product.variants?.length) {
    if (!variantPrices.length) return priceOnRequest;
    const from = { ru: 'от', uz: 'dan', en: 'from' }[getContentLanguage(language)];
    return `${from} ${formatMoney(Math.min(...variantPrices), language, product.currency)}`;
  }

  return product.price && product.price > 0
    ? formatMoney(product.price, language, product.currency)
    : priceOnRequest;
}
