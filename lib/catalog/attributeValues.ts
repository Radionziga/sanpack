import type { Product } from '@/types';

export type ProductAttributeValue = Product['attributes'][string];

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
