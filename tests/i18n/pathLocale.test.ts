import { describe, expect, it } from 'vitest';
import { getPathLanguage, sanitizeLocalizedReturnPath } from '@/lib/i18n/pathLocale';

describe('URL locale source', () => {
  it.each([
    { pathname: '/ru/catalog', fallback: 'en' as const, expected: 'ru' },
    { pathname: '/uz/product/example', fallback: 'ru' as const, expected: 'uz' },
    { pathname: '/en', fallback: 'ru' as const, expected: 'en' },
    { pathname: '/zh/catalog', fallback: 'ru' as const, expected: 'zh' },
    { pathname: '/admin', fallback: 'ru' as const, expected: 'ru' },
  ])('resolves $pathname as $expected', ({ pathname, fallback, expected }) => {
    expect(getPathLanguage(pathname, fallback)).toBe(expected);
  });
});

describe('localized return paths', () => {
  it.each(['/ru/request', '/uz/catalog', '/en/profile', '/zh/request'])('keeps %s', (pathname) => {
    expect(sanitizeLocalizedReturnPath(pathname)).toBe(pathname);
  });

  it.each([null, '', '//evil.example', '/admin', 'https://evil.example/ru'])('rejects %s', (pathname) => {
    expect(sanitizeLocalizedReturnPath(pathname)).toBe('/ru/request');
  });
});
