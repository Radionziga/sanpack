import { describe, expect, it } from 'vitest';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';

describe('localized text fallback', () => {
  it.each([
    {
      name: 'real Uzbek translation',
      language: 'uz' as const,
      values: { ru: 'Пакет', uz: 'Paket' },
      expected: { text: 'Paket', sourceLanguage: 'uz', isFallback: false },
    },
    {
      name: 'missing English translation',
      language: 'en' as const,
      values: { ru: 'Пакет' },
      expected: { text: 'Пакет', sourceLanguage: 'ru', isFallback: true },
    },
    {
      name: 'Russian text copied into Uzbek field',
      language: 'uz' as const,
      values: { ru: 'Пакет', uz: 'Пакет' },
      expected: { text: 'Пакет', sourceLanguage: 'ru', isFallback: true },
    },
    {
      name: 'missing Russian source',
      language: 'ru' as const,
      values: { uz: 'Paket' },
      expected: { text: 'Paket', sourceLanguage: 'uz', isFallback: true },
    },
  ])('reports $name', ({ language, values, expected }) => {
    expect(resolveLocalizedText(language, values)).toMatchObject(expected);
  });
});
