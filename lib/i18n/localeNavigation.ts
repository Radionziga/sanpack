import type { Language } from '@/types';

export function buildLocalizedPath(pathname: string, language: Language, query = '', hash = '') {
  const segments = pathname.split('/');
  segments[1] = language;
  const path = segments.join('/') || `/${language}`;
  return `${path}${query ? `?${query.replace(/^\?/, '')}` : ''}${hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''}`;
}
