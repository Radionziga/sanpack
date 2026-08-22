import { describe, expect, it } from 'vitest';
import { getPathLanguage } from '@/lib/i18n/pathLocale';

describe('URL locale source', () => {
  it.each([
    { pathname: '/ru/catalog', fallback: 'en' as const, expected: 'ru' },
    { pathname: '/uz/product/example', fallback: 'ru' as const, expected: 'uz' },
    { pathname: '/en', fallback: 'ru' as const, expected: 'en' },
    { pathname: '/admin', fallback: 'ru' as const, expected: 'ru' },
  ])('resolves $pathname as $expected', ({ pathname, fallback, expected }) => {
    expect(getPathLanguage(pathname, fallback)).toBe(expected);
  });
});
