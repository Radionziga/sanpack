import type { Attribute, Product, ProductAttributeValue } from '@/types';

export type AttributeFilterSelection =
  | { kind: 'options'; values: string[] }
  | { kind: 'boolean'; value: true }
  | { kind: 'range'; min?: number; max?: number };

export type CatalogAttributeFilters = Record<string, AttributeFilterSelection>;

export interface AttributeFacetOption {
  value: string;
  count: number;
}

export interface AttributeFacet {
  attribute: Attribute;
  options: AttributeFacetOption[];
  minimum?: number;
  maximum?: number;
}

export interface ProductAttributeFilterOptions {
  inStockOnly?: boolean;
}

function hasValue(value: ProductAttributeValue | undefined): value is ProductAttributeValue {
  return value !== undefined
    && value !== ''
    && (!Array.isArray(value) || value.length > 0);
}

function asValues(value: ProductAttributeValue | undefined) {
  if (!hasValue(value)) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizedOption(value: string | number | boolean) {
  return String(value).trim().toLocaleLowerCase();
}

function asNumber(value: string | number | boolean) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asBoolean(value: string | number | boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', '1', 'yes', 'да'].includes(value.trim().toLocaleLowerCase());
}

function getProductBaseAttributes(product: Product) {
  const attributes = { ...(product.attributes || {}) };
  // brandName remains the Product source of truth. A CMS Attribute with the
  // conventional `brand` key can expose it as a regular storefront facet
  // without copying the value into product.attributes.
  if (!hasValue(attributes.brand) && product.brandName?.trim()) {
    attributes.brand = product.brandName.trim();
  }
  return attributes;
}

function getProductAttributeConfigurations(product: Product) {
  const baseAttributes = getProductBaseAttributes(product);
  return product.variants?.length
    ? product.variants.map((variant) => ({
        attributes: { ...baseAttributes, ...variant.attributes },
        stockStatus: variant.stockStatus ?? product.stockStatus,
        stockQuantity: variant.stockQuantity,
      }))
    : [{
        attributes: baseAttributes,
        stockStatus: product.stockStatus,
        stockQuantity: product.stockQuantity,
      }];
}

function isConfigurationInStock(
  configuration: ReturnType<typeof getProductAttributeConfigurations>[number],
) {
  return configuration.stockStatus === 'in_stock'
    && (configuration.stockQuantity === undefined || configuration.stockQuantity > 0);
}

function matchesSelection(
  value: ProductAttributeValue | undefined,
  selection: AttributeFilterSelection,
) {
  const values = asValues(value);
  if (selection.kind === 'boolean') return values.some(asBoolean);
  if (selection.kind === 'range') {
    return values.some((candidate) => {
      const numeric = asNumber(candidate);
      if (numeric === undefined) return false;
      if (selection.min !== undefined && numeric < selection.min) return false;
      if (selection.max !== undefined && numeric > selection.max) return false;
      return true;
    });
  }
  if (selection.values.length === 0) return true;
  const selected = new Set(selection.values.map(normalizedOption));
  return values.some((candidate) => selected.has(normalizedOption(candidate)));
}

export function isAttributeFilterActive(selection: AttributeFilterSelection | undefined) {
  if (!selection) return false;
  if (selection.kind === 'options') return selection.values.length > 0;
  if (selection.kind === 'range') return selection.min !== undefined || selection.max !== undefined;
  return true;
}

/**
 * A product matches only when one coherent sellable configuration satisfies
 * all filters. Product-level values are inherited by every variant; values
 * from different variants are never combined into a false match.
 */
export function productMatchesAttributeFilters(
  product: Product,
  filters: CatalogAttributeFilters,
  options: ProductAttributeFilterOptions = {},
) {
  const activeFilters = Object.entries(filters).filter(([, selection]) => (
    isAttributeFilterActive(selection)
  ));

  const configurations = getProductAttributeConfigurations(product);

  return configurations.some((configuration) => (
    (!options.inStockOnly || isConfigurationInStock(configuration))
    && activeFilters.every(([key, selection]) => (
      matchesSelection(configuration.attributes[key], selection)
    ))
  ));
}

export function getProductAttributeValues(product: Product, key: string) {
  const values: ProductAttributeValue[] = [];
  const add = (value: ProductAttributeValue | undefined) => {
    for (const item of asValues(value)) {
      const normalized = normalizedOption(item);
      if (!values.some((candidate) => normalizedOption(candidate as string | number | boolean) === normalized)) {
        values.push(item);
      }
    }
  };

  for (const configuration of getProductAttributeConfigurations(product)) {
    add(configuration.attributes[key]);
  }
  return values;
}

export function buildAttributeFacet(
  attribute: Attribute,
  products: Product[],
): AttributeFacet {
  const counts = new Map<string, { value: string; productIds: Set<string> }>();
  const numericValues: number[] = [];

  for (const product of products) {
    for (const value of getProductAttributeValues(product, attribute.key)) {
      if (attribute.type === 'number' || attribute.type === 'range') {
        const numeric = asNumber(value as string | number | boolean);
        if (numeric !== undefined) numericValues.push(numeric);
        continue;
      }
      if (attribute.type === 'boolean') continue;
      const displayValue = String(value).trim();
      if (!displayValue) continue;
      const key = normalizedOption(displayValue);
      const entry = counts.get(key) || { value: displayValue, productIds: new Set<string>() };
      entry.productIds.add(product.id);
      counts.set(key, entry);
    }
  }

  return {
    attribute,
    options: [...counts.values()]
      .map((entry) => ({ value: entry.value, count: entry.productIds.size }))
      .sort((left, right) => left.value.localeCompare(right.value)),
    minimum: numericValues.length ? Math.min(...numericValues) : undefined,
    maximum: numericValues.length ? Math.max(...numericValues) : undefined,
  };
}
