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
  if (!pathname || pathname.length > 2_000 || pathname.includes('\\')) return fallback;
  try {
    const url = new URL(pathname, 'https://sanpack.invalid');
    if (url.origin !== 'https://sanpack.invalid'
      || !/^\/(ru|uz|en|zh)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
