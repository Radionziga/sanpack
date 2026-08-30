import type { Language } from '@/types';

const supportedLanguages: ReadonlySet<Language> = new Set(['ru', 'uz', 'en', 'zh']);

export function getPathLanguage(pathname: string, fallback: Language): Language {
  const candidate = pathname.split('/')[1];
  return supportedLanguages.has(candidate as Language)
    ? candidate as Language
    : fallback;
}

export function sanitizeLocalizedReturnPath(
  pathname: string | null,
  fallback = '/ru/request',
) {
  if (!pathname || !/^\/(ru|uz|en|zh)(\/|$)/.test(pathname)) return fallback;
  return pathname;
}
