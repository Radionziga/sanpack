import type { Language, Product, ProductVariant } from '@/types';
import { formatProductQuantity, formatQuantity } from '@/lib/catalog/productPresentation';

const EPSILON = 1e-7;

function positiveNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveInteger(value: unknown, fallback: number) {
  return Math.max(1, Math.round(positiveNumber(value, fallback)));
}

function localizedPackageName(product: Product, language: Language) {
  const packaging = product.orderPackaging;
  if (!packaging) return '';
  if (language === 'uz') return packaging.nameUz || packaging.nameRu;
  if (language === 'en') return packaging.nameEn || packaging.nameRu;
  if (language === 'zh') return packaging.nameZh || packaging.nameEn || packaging.nameRu;
  return packaging.nameRu;
}

export interface ProductOrderRule {
  salesUnit: string;
  packageEnabled: boolean;
  packageName: string;
  unitsPerPackage: number;
  minimumPackages: number;
  packageStep: number;
  minimumQuantity: number;
  quantityStep: number;
  maximumQuantity?: number;
}

export function getProductOrderRule(
  product: Product,
  language: Language = 'ru',
  variant?: ProductVariant,
): ProductOrderRule {
  const packaging = product.orderPackaging;
  const packageEnabled = Boolean(
    packaging?.enabled &&
      packaging.nameRu?.trim() &&
      positiveNumber(packaging.unitsPerPackage, 0) > 0
  );
  const unitsPerPackage = packageEnabled
    ? positiveInteger(packaging?.unitsPerPackage, 1)
    : 1;
  const minimumPackages = packageEnabled
    ? positiveInteger(packaging?.minimumPackages, 1)
    : 1;
  const packageStep = packageEnabled
    ? positiveInteger(packaging?.packageStep, 1)
    : 1;

  const minimumQuantity = packageEnabled
    ? unitsPerPackage * minimumPackages
    : positiveNumber(variant?.minQuantity ?? variant?.minOrder ?? product.minimumOrder, 1);
  const quantityStep = packageEnabled
    ? unitsPerPackage * packageStep
    : positiveNumber(variant?.quantityStep ?? product.quantityStep, 1);
  const configuredMaximum = variant?.maxQuantity ?? product.maximumOrder;
  const maximumQuantity = typeof configuredMaximum === 'number'
    && Number.isFinite(configuredMaximum)
    && configuredMaximum >= minimumQuantity
    ? configuredMaximum
    : undefined;

  return {
    salesUnit: product.salesUnit?.trim() || 'шт.',
    packageEnabled,
    packageName: packageEnabled ? localizedPackageName(product, language) : '',
    unitsPerPackage,
    minimumPackages,
    packageStep,
    minimumQuantity,
    quantityStep,
    maximumQuantity,
  };
}

export function normalizeOrderQuantity(
  product: Product,
  requestedQuantity: number,
  variant?: ProductVariant,
) {
  const rule = getProductOrderRule(product, 'ru', variant);
  if (!Number.isFinite(requestedQuantity)) return rule.minimumQuantity;
  if (requestedQuantity <= rule.minimumQuantity) return rule.minimumQuantity;

  const steps = Math.ceil(
    (requestedQuantity - rule.minimumQuantity - EPSILON) / rule.quantityStep
  );
  const normalized = rule.minimumQuantity + Math.max(0, steps) * rule.quantityStep;
  if (rule.maximumQuantity === undefined || normalized <= rule.maximumQuantity) {
    return normalized;
  }
  const maximumSteps = Math.floor(
    (rule.maximumQuantity - rule.minimumQuantity + EPSILON) / rule.quantityStep
  );
  return rule.minimumQuantity + Math.max(0, maximumSteps) * rule.quantityStep;
}

export function isValidOrderQuantity(
  product: Product,
  quantity: number,
  variant?: ProductVariant,
) {
  const rule = getProductOrderRule(product, 'ru', variant);
  if (!Number.isFinite(quantity) || quantity < rule.minimumQuantity) return false;
  if (rule.maximumQuantity !== undefined && quantity > rule.maximumQuantity) return false;
  const ratio = (quantity - rule.minimumQuantity) / rule.quantityStep;
  return Math.abs(ratio - Math.round(ratio)) <= EPSILON;
}

export function getOrderRuleSummary(
  product: Product,
  language: Language = 'ru',
  variant?: ProductVariant,
) {
  const rule = getProductOrderRule(product, language, variant);
  const minimumQuantity = formatProductQuantity(product, rule.minimumQuantity, language);
  const quantityStep = formatProductQuantity(product, rule.quantityStep, language);
  const maximumSuffix = rule.maximumQuantity === undefined
    ? ''
    : {
        ru: ` Максимум — ${formatProductQuantity(product, rule.maximumQuantity, language)}.`,
        uz: ` Maksimum — ${formatProductQuantity(product, rule.maximumQuantity, language)}.`,
        en: ` Maximum: ${formatProductQuantity(product, rule.maximumQuantity, language)}.`,
        zh: ` 最大数量：${formatProductQuantity(product, rule.maximumQuantity, language)}。`,
      }[language];
  if (!rule.packageEnabled) {
    const copy = {
      ru: `Минимум ${minimumQuantity}; шаг — ${quantityStep}.${maximumSuffix}`,
      uz: `Minimum ${minimumQuantity}; qadam — ${quantityStep}.${maximumSuffix}`,
      en: `Minimum ${minimumQuantity}; step: ${quantityStep}.${maximumSuffix}`,
      zh: `最低 ${minimumQuantity}；每次增加 ${quantityStep}。${maximumSuffix}`,
    };
    return copy[language];
  }

  const onePackage = formatQuantity(1, rule.packageName, language);
  const minimumPackages = formatQuantity(rule.minimumPackages, rule.packageName, language);
  const unitsPerPackage = formatProductQuantity(product, rule.unitsPerPackage, language);
  const copy = {
    ru: `Внешняя упаковка — ${onePackage}, в ней ${unitsPerPackage}. Минимум ${minimumPackages} (${minimumQuantity}).${maximumSuffix}`,
    uz: `Tashqi qadoq — ${onePackage}, unda ${unitsPerPackage}. Minimum ${minimumPackages} (${minimumQuantity}).${maximumSuffix}`,
    en: `Outer package: ${onePackage}, containing ${unitsPerPackage}. Minimum ${minimumPackages} (${minimumQuantity}).${maximumSuffix}`,
    zh: `外包装：${onePackage}，每包 ${unitsPerPackage}。最低 ${minimumPackages}（${minimumQuantity}）。${maximumSuffix}`,
  };
  return copy[language];
}

export function getMinimumOrderLabel(
  product: Product,
  language: Language = 'ru',
  variant?: ProductVariant,
) {
  const rule = getProductOrderRule(product, language, variant);
  const minimumQuantity = formatProductQuantity(product, rule.minimumQuantity, language);
  if (!rule.packageEnabled) {
    if (language === 'zh') return `最低 ${minimumQuantity}`;
    return {
      ru: `Мин. ${minimumQuantity}`,
      uz: `Min. ${minimumQuantity}`,
      en: `Min. ${minimumQuantity}`,
    }[language];
  }
  const minimumPackages = formatQuantity(rule.minimumPackages, rule.packageName, language);
  if (language === 'zh') return `最低 ${minimumPackages} · ${minimumQuantity}`;
  return {
    ru: `Мин. ${minimumPackages} · ${minimumQuantity}`,
    uz: `Min. ${minimumPackages} · ${minimumQuantity}`,
    en: `Min. ${minimumPackages} · ${minimumQuantity}`,
  }[language];
}
