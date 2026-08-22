import { describe, expect, it } from 'vitest';
import {
  attributeValueAsList,
  attributeValueAsText,
  parseAttributeList,
  parseAttributeNumber,
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
});
