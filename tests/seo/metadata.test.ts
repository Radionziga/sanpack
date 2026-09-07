import { describe, expect, it } from 'vitest';
import { initialSiteSettings } from '@/lib/seedData';
import { buildBreadcrumbStructuredData, buildSeoMetadata, buildStaticRouteMetadata, localeAlternates } from '@/lib/seo/metadata';
import robots from '@/app/robots';

describe('SEO metadata foundation', () => {
  it('uses explicit copy first and builds locale-aware canonical/hreflang', () => {
    const metadata = buildSeoMetadata({
      locale: 'uz', path: '/catalog/bakaleya', title: 'Maxsus title', description: 'Maxsus tavsif',
      settings: initialSiteSettings, titleIsExplicit: true,
    });
    expect(metadata.title).toBe('Maxsus title');
    expect(metadata.description).toBe('Maxsus tavsif');
    expect(metadata.alternates).toMatchObject({ canonical: '/uz/catalog/bakaleya', languages: localeAlternates('/catalog/bakaleya') });
    expect(metadata.openGraph).toMatchObject({ title: 'Maxsus title', url: expect.stringContaining('/uz/catalog/bakaleya') });
  });

  it('adds company identity to generated titles and falls back to site description', () => {
    const metadata = buildSeoMetadata({ locale: 'ru', path: '/catalog', title: 'Каталог', settings: initialSiteSettings });
    expect(String(metadata.title)).toContain(initialSiteSettings.company.name);
    expect(metadata.description).toBeTruthy();
  });

  it('provides localized metadata for previously generic static routes', () => {
    const metadata = buildStaticRouteMetadata('delivery', 'en', initialSiteSettings);
    expect(String(metadata.title)).toContain('Delivery and payment');
    expect(metadata.alternates).toMatchObject({ canonical: '/en/delivery' });
  });

  it('produces canonical BreadcrumbList positions', () => {
    const data = buildBreadcrumbStructuredData([{ name: 'Home', path: '/en' }, { name: 'Catalog', path: '/en/catalog' }]);
    expect(data).toMatchObject({ '@type': 'BreadcrumbList', itemListElement: [{ position: 1, name: 'Home' }, { position: 2, name: 'Catalog' }] });
  });

  it('keeps private and utility routes out of crawler discovery', () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules[0].disallow : rules.disallow;
    expect(disallow).toEqual(expect.arrayContaining(['/admin/', '/api/', '/ru/search', '/uz/request', '/en/catalog/print']));
  });
});
