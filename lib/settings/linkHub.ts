import type { Language, LinkHubLink, LinkHubSettings } from '@/types';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';

export function getLinkHubText(
  locale: Language,
  value: LinkHubSettings | LinkHubLink,
  field: 'title' | 'description' | 'highlightTitle' | 'highlightDescription' | 'label',
) {
  const source = value as unknown as Record<string, string | undefined>;
  return resolveLocalizedText(locale, {
    ru: source[`${field}Ru`],
    uz: source[`${field}Uz`],
    en: source[`${field}En`],
    zh: source[`${field}Zh`],
  }).text;
}

export function isSafeLinkHubHref(href: string) {
  const value = href.trim();
  if (/^\/(?!\/)/.test(value)) return true;
  if (/^(tel:|mailto:)/i.test(value)) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function isInternalLinkHubHref(href: string) {
  return /^\/(?!\/)/.test(href.trim());
}

export function enabledLinkHubLinks(settings?: LinkHubSettings) {
  return (settings?.links || []).filter((link) => link.enabled && isSafeLinkHubHref(link.href));
}
