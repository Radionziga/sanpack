import type { Attribute, ProductAttributeValue } from '@/types';

export type { ProductAttributeValue } from '@/types';

export function attributeValueAsText(value: ProductAttributeValue | undefined) {
  if (value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function attributeValueAsList(value: ProductAttributeValue | undefined) {
  if (Array.isArray(value)) return value.map(String);
  return typeof value === 'string' && value.trim() ? [value.trim()] : [];
}

export function parseAttributeList(value: string) {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function parseAttributeNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Parses an admin text control without silently changing the type of a
 * previously stored legacy value when its Attribute definition is unavailable.
 */
export function parseEditedAttributeValue(
  value: string,
  original: ProductAttributeValue | undefined,
  definition?: Pick<Attribute, 'type'>,
): ProductAttributeValue | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;

  if (definition?.type === 'number' || definition?.type === 'range') {
    return parseAttributeNumber(value);
  }
  if (definition?.type === 'boolean') {
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return undefined;
  }
  if (definition?.type === 'multiselect') {
    const parsed = parseAttributeList(value);
    return parsed.length ? parsed : undefined;
  }
  if (definition) return normalized;

  if (original !== undefined && attributeValueAsText(original) === value) {
    return original;
  }
  if (Array.isArray(original)) {
    const parsed = parseAttributeList(value);
    return parsed.length ? parsed : undefined;
  }
  if (typeof original === 'number') {
    return parseAttributeNumber(value) ?? original;
  }
  if (typeof original === 'boolean') {
    if (normalized.toLocaleLowerCase() === 'true') return true;
    if (normalized.toLocaleLowerCase() === 'false') return false;
    return original;
  }
  return normalized;
}
