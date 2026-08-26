import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ru', 'uz', 'en', 'zh'],
  defaultLocale: 'ru',
  localePrefix: 'always',
  localeDetection: true,
});
