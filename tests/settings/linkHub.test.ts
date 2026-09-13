import { describe, expect, it } from 'vitest';
import { enabledLinkHubLinks, getLinkHubText, isInternalLinkHubHref, isSafeLinkHubHref } from '@/lib/settings/linkHub';
import { initialSiteSettings } from '@/lib/seedData';

describe('link hub public contract', () => {
  it('resolves localized copy with the standard Russian fallback', () => {
    const settings = { ...initialSiteSettings.linkHub!, titleEn: '' };
    expect(getLinkHubText('uz', settings, 'title')).toBe(settings.titleUz);
    expect(getLinkHubText('en', settings, 'title')).toBe(settings.titleRu);
  });

  it('exposes only enabled links with a safe destination', () => {
    const settings = {
      ...initialSiteSettings.linkHub!,
      links: [
        ...initialSiteSettings.linkHub!.links,
        { id: 'disabled', labelRu: 'Скрытая', href: '/about', icon: 'website' as const, enabled: false },
        { id: 'unsafe', labelRu: 'Опасная', href: 'javascript:alert(1)', icon: 'website' as const, enabled: true },
      ],
    };
    const result = enabledLinkHubLinks(settings);
    expect(result.some((link) => link.id === 'disabled')).toBe(false);
    expect(result.some((link) => link.id === 'unsafe')).toBe(false);
  });

  it('distinguishes locale-aware internal links from safe external/contact links', () => {
    expect(isInternalLinkHubHref('/catalog')).toBe(true);
    expect(isSafeLinkHubHref('https://t.me/example')).toBe(true);
    expect(isSafeLinkHubHref('tel:+998901234567')).toBe(true);
    expect(isSafeLinkHubHref('mailto:hello@sanpack.uz')).toBe(true);
    expect(isSafeLinkHubHref('javascript:alert(1)')).toBe(false);
    expect(isSafeLinkHubHref('data:text/html,test')).toBe(false);
    expect(isSafeLinkHubHref('//evil.example/path')).toBe(false);
    expect(isSafeLinkHubHref('http://example.com')).toBe(false);
  });
});
