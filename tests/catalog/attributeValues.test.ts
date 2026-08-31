import { describe, expect, it } from 'vitest';
import {
  attributeValueAsList,
  attributeValueAsText,
  parseAttributeList,
  parseAttributeNumber,
  parseEditedAttributeValue,
} from '@/lib/catalog/attributeValues';

describe('admin product attribute values', () => {
  it.each([
    { value: undefined, expected: '' },
    { value: false, expected: 'false' },
    { value: 0, expected: '0' },
    { value: ['red', 'blue'], expected: 'red, blue' },
  ])('formats $value without truthy fallbacks', ({ value, expected }) => {
    expect(attributeValueAsText(value)).toBe(expected);
  });

  it('parses and de-duplicates a multi-value field', () => {
    expect(parseAttributeList('red, blue, red, , green')).toEqual(['red', 'blue', 'green']);
    expect(attributeValueAsList(['red', 'blue'])).toEqual(['red', 'blue']);
  });

  it.each([
    { value: '', expected: undefined },
    { value: '0', expected: 0 },
    { value: '1.25', expected: 1.25 },
    { value: 'not-a-number', expected: undefined },
  ])('parses numeric input $value', ({ value, expected }) => {
    expect(parseAttributeNumber(value)).toBe(expected);
  });

  it.each([
    { original: 45, text: '45', expected: 45 },
    { original: false, text: 'false', expected: false },
    { original: ['red', 'blue'], text: 'red, blue', expected: ['red', 'blue'] },
  ])('preserves an unchanged legacy $original value and its type', ({ original, text, expected }) => {
    expect(parseEditedAttributeValue(text, original)).toEqual(expected);
  });

  it('keeps the original legacy type when the stored value is edited', () => {
    expect(parseEditedAttributeValue('52.5', 45)).toBe(52.5);
    expect(parseEditedAttributeValue('true', false)).toBe(true);
    expect(parseEditedAttributeValue('green, blue', ['red'])).toEqual(['green', 'blue']);
  });

  it('uses a CMS definition as the serialization source of truth', () => {
    expect(parseEditedAttributeValue('256', undefined, { type: 'number' })).toBe(256);
    expect(parseEditedAttributeValue('false', undefined, { type: 'boolean' })).toBe(false);
    expect(parseEditedAttributeValue('black, blue', undefined, { type: 'multiselect' }))
      .toEqual(['black', 'blue']);
  });
});
