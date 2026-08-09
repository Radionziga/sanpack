import type { Language, Product } from '@/types';

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
}

export function getProductOrderRule(
  product: Product,
  language: Language = 'ru'
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

  return {
    salesUnit: product.salesUnit?.trim() || 'шт.',
    packageEnabled,
    packageName: packageEnabled ? localizedPackageName(product, language) : '',
    unitsPerPackage,
    minimumPackages,
    packageStep,
    minimumQuantity: packageEnabled
      ? unitsPerPackage * minimumPackages
      : positiveNumber(product.minimumOrder, 1),
    quantityStep: packageEnabled
      ? unitsPerPackage * packageStep
      : positiveNumber(product.quantityStep, 1),
  };
}

export function normalizeOrderQuantity(product: Product, requestedQuantity: number) {
  const rule = getProductOrderRule(product);
  if (!Number.isFinite(requestedQuantity)) return rule.minimumQuantity;
  if (requestedQuantity <= rule.minimumQuantity) return rule.minimumQuantity;

  const steps = Math.ceil(
    (requestedQuantity - rule.minimumQuantity - EPSILON) / rule.quantityStep
  );
  return rule.minimumQuantity + Math.max(0, steps) * rule.quantityStep;
}

export function isValidOrderQuantity(product: Product, quantity: number) {
  const rule = getProductOrderRule(product);
  if (!Number.isFinite(quantity) || quantity < rule.minimumQuantity) return false;
  const ratio = (quantity - rule.minimumQuantity) / rule.quantityStep;
  return Math.abs(ratio - Math.round(ratio)) <= EPSILON;
}

export function getOrderRuleSummary(product: Product, language: Language = 'ru') {
  const rule = getProductOrderRule(product, language);
  if (!rule.packageEnabled) {
    const copy = {
      ru: `Минимум ${rule.minimumQuantity} ${rule.salesUnit}; шаг — ${rule.quantityStep} ${rule.salesUnit}.`,
      uz: `Minimum ${rule.minimumQuantity} ${rule.salesUnit}; qadam — ${rule.quantityStep} ${rule.salesUnit}.`,
      en: `Minimum ${rule.minimumQuantity} ${rule.salesUnit}; step — ${rule.quantityStep} ${rule.salesUnit}.`,
    };
    return copy[language];
  }

  const copy = {
    ru: `Цена за 1 ${rule.salesUnit}. В 1 ${rule.packageName} — ${rule.unitsPerPackage} ${rule.salesUnit}. Минимум ${rule.minimumPackages} ${rule.packageName} (${rule.minimumQuantity} ${rule.salesUnit}).`,
    uz: `Narx 1 ${rule.salesUnit} uchun. 1 ${rule.packageName}da — ${rule.unitsPerPackage} ${rule.salesUnit}. Minimum ${rule.minimumPackages} ${rule.packageName} (${rule.minimumQuantity} ${rule.salesUnit}).`,
    en: `Price per 1 ${rule.salesUnit}. 1 ${rule.packageName} contains ${rule.unitsPerPackage} ${rule.salesUnit}. Minimum ${rule.minimumPackages} ${rule.packageName} (${rule.minimumQuantity} ${rule.salesUnit}).`,
  };
  return copy[language];
}

export function getMinimumOrderLabel(product: Product, language: Language = 'ru') {
  const rule = getProductOrderRule(product, language);
  if (!rule.packageEnabled) {
    return {
      ru: `Мин. ${rule.minimumQuantity} ${rule.salesUnit}`,
      uz: `Min. ${rule.minimumQuantity} ${rule.salesUnit}`,
      en: `Min. ${rule.minimumQuantity} ${rule.salesUnit}`,
    }[language];
  }
  return {
    ru: `Мин. ${rule.minimumPackages} ${rule.packageName} · ${rule.minimumQuantity} ${rule.salesUnit}`,
    uz: `Min. ${rule.minimumPackages} ${rule.packageName} · ${rule.minimumQuantity} ${rule.salesUnit}`,
    en: `Min. ${rule.minimumPackages} ${rule.packageName} · ${rule.minimumQuantity} ${rule.salesUnit}`,
  }[language];
}
