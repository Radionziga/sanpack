import type {
  Product,
  ProductPriceMode,
  ProductUnitPricing,
  ProductVariant,
  QuantityUnit,
} from '@/types';

export interface EffectiveCatalogPrice {
  amount: number;
  currency: string;
  basis: 'sale' | 'comparison';
  unit?: QuantityUnit;
  isFrom: boolean;
}

interface PricedOffer {
  price: number;
  variant?: ProductVariant;
  unitPricing?: ProductUnitPricing;
}

const unitDimensions: Partial<Record<QuantityUnit, { dimension: string; factor: number }>> = {
  piece: { dimension: 'count', factor: 1 },
  gram: { dimension: 'mass', factor: 1 },
  kilogram: { dimension: 'mass', factor: 1_000 },
  milliliter: { dimension: 'volume', factor: 1 },
  liter: { dimension: 'volume', factor: 1_000 },
  meter: { dimension: 'length', factor: 1 },
  square_meter: { dimension: 'area', factor: 1 },
};

export function areComparisonUnitsCompatible(
  sourceUnit: QuantityUnit,
  displayUnit: QuantityUnit = sourceUnit,
) {
  const source = unitDimensions[sourceUnit];
  const target = unitDimensions[displayUnit];
  return Boolean(source && target && source.dimension === target.dimension);
}

export function getProductPriceMode(
  product: Product,
  variant?: ProductVariant,
): ProductPriceMode {
  return variant?.priceMode
    ?? product.priceMode
    ?? (product.showPrice ? 'fixed' : 'request');
}

export function getProductUnitPrice(product: Product, variant?: ProductVariant) {
  return variant?.price ?? product.price;
}

export function getProductWholesaleTiers(product: Product, variant?: ProductVariant) {
  return variant?.wholesaleTiers?.length
    ? variant.wholesaleTiers
    : product.wholesaleTiers || [];
}

export function getProductOrderUnitPrice(
  product: Product,
  variant?: ProductVariant,
  quantity?: number,
) {
  const basePrice = getProductUnitPrice(product, variant);
  if (!Number.isFinite(quantity)) return basePrice;
  const tier = [...getProductWholesaleTiers(product, variant)]
    .sort((left, right) => right.minQuantity - left.minQuantity)
    .find((candidate) => quantity! >= candidate.minQuantity);
  return tier?.price ?? basePrice;
}

function getPricedOffers(product: Product): PricedOffer[] {
  if (!product.showPrice) return [];
  const variants = product.variants || [];
  if (variants.length === 0) {
    return typeof product.price === 'number' && product.price > 0
      ? [{ price: product.price, unitPricing: product.unitPricing }]
      : [];
  }
  return variants.flatMap((variant) => {
    const price = getProductUnitPrice(product, variant);
    return typeof price === 'number' && price > 0
      ? [{ price, variant, unitPricing: variant.unitPricing ?? product.unitPricing }]
      : [];
  });
}

export function getMinimumSalePrice(product: Product): EffectiveCatalogPrice | undefined {
  const offers = getPricedOffers(product);
  if (offers.length === 0) return undefined;
  let minimum = offers[0];
  for (const offer of offers.slice(1)) {
    if (offer.price < minimum.price) minimum = offer;
  }
  return {
    amount: minimum.price,
    currency: product.currency,
    basis: 'sale',
    isFrom: offers.length > 1 || getProductPriceMode(product, minimum.variant) === 'from',
  };
}

export function getNormalizedUnitPrice(
  price: number,
  unitPricing: ProductUnitPricing | undefined,
) {
  if (!unitPricing || !Number.isFinite(price) || price < 0 || unitPricing.quantity <= 0) {
    return undefined;
  }
  const source = unitDimensions[unitPricing.unit];
  const displayUnit = unitPricing.displayUnit ?? unitPricing.unit;
  const target = unitDimensions[displayUnit];
  if (!source || !target || !areComparisonUnitsCompatible(unitPricing.unit, displayUnit)) return undefined;
  const quantityInDisplayUnits = unitPricing.quantity * source.factor / target.factor;
  if (!Number.isFinite(quantityInDisplayUnits) || quantityInDisplayUnits <= 0) return undefined;
  return { amount: price / quantityInDisplayUnits, unit: displayUnit };
}

export function getMinimumComparisonPrice(product: Product): EffectiveCatalogPrice | undefined {
  const offers = getPricedOffers(product);
  const firstConfiguredOffer = offers.find((offer) => offer.unitPricing);
  const displayUnit = product.unitPricing?.displayUnit
    ?? product.unitPricing?.unit
    ?? firstConfiguredOffer?.unitPricing?.displayUnit
    ?? firstConfiguredOffer?.unitPricing?.unit;
  if (!displayUnit) return undefined;

  const normalized = offers.flatMap((offer) => {
    if (!offer.unitPricing || !areComparisonUnitsCompatible(offer.unitPricing.unit, displayUnit)) {
      return [];
    }
    const comparison = getNormalizedUnitPrice(offer.price, {
      ...offer.unitPricing,
      displayUnit,
    });
    return comparison ? [{ ...comparison, variant: offer.variant }] : [];
  });
  if (normalized.length === 0) return undefined;
  if (normalized.length !== offers.length) return undefined;
  let minimum = normalized[0];
  for (const offer of normalized.slice(1)) {
    if (offer.amount < minimum.amount) minimum = offer;
  }
  return {
    amount: minimum.amount,
    currency: product.currency,
    basis: 'comparison',
    unit: minimum.unit,
    isFrom: normalized.length > 1 || getProductPriceMode(product, minimum.variant) === 'from',
  };
}

export function getEffectiveCatalogPrice(product: Product) {
  if (product.catalogPriceBasis === 'comparison') {
    return getMinimumComparisonPrice(product) ?? getMinimumSalePrice(product);
  }
  return getMinimumSalePrice(product);
}

export function isProductOrderable(product: Product, variant?: ProductVariant) {
  return getProductPriceMode(product, variant) !== 'informational';
}
