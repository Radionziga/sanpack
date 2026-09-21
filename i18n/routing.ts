import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ru', 'uz', 'en', 'zh'],
  defaultLocale: 'ru',
  localePrefix: 'always',
  localeDetection: true,
  // Page metadata owns hreflang. The middleware-generated Link header points
  // x-default at the locale-less redirect, creating a conflicting target.
  alternateLinks: false,
});
