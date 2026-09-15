import { describe, expect, it } from 'vitest';
import { initialCategories, initialProducts, initialSiteSettings } from '@/lib/seedData';
import { projectPublicCategories, projectPublicProducts, projectPublicSettings } from '@/lib/catalog/publicProjection';

describe('trusted public catalog projection', () => {
  it('returns only published products and strips unknown/internal fields recursively', () => {
    const published = { ...initialProducts[0], createdBy: 'private-uid', internalNote: 'secret', seo: { titleRu: 'Public', internal: 'secret' } };
    const draft = { ...initialProducts[0], id: 'draft', status: 'draft' as const };
    const result = projectPublicProducts([published, draft]);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('createdBy');
    expect(result[0]).not.toHaveProperty('internalNote');
    expect(result[0].seo).toEqual({ titleRu: 'Public' });
  });

  it('returns only categories whose full lineage is active', () => {
    const group = { ...initialCategories[0], id: 'group', parentId: null, status: 'hidden' as const };
    const child = { ...initialCategories[1], id: 'child', parentId: 'group', status: 'active' as const };
    expect(projectPublicCategories([group, child])).toEqual([]);
  });

  it('does not serialize unknown private settings fields', () => {
    const value = {
      ...initialSiteSettings,
      privateSettings: { token: 'secret' },
      company: { ...initialSiteSettings.company, internal: 'secret' },
      linkHub: {
        ...initialSiteSettings.linkHub!,
        internal: 'secret',
        links: initialSiteSettings.linkHub!.links.map((link) => ({ ...link, token: 'secret' })),
      },
      externalAnalytics: {
        ...initialSiteSettings.externalAnalytics!,
        internalToken: 'secret',
        googleAnalytics: { ...initialSiteSettings.externalAnalytics!.googleAnalytics, privateKey: 'secret' },
      },
    };
    const result = projectPublicSettings(value);
    expect(result).not.toHaveProperty('privateSettings');
    expect(result.company).not.toHaveProperty('internal');
    expect(result.linkHub).not.toHaveProperty('internal');
    expect(result.linkHub?.links[0]).not.toHaveProperty('token');
    expect(result.linkHub?.links[0]).toMatchObject({ id: 'catalog', href: '/catalog' });
    expect(result.externalAnalytics).not.toHaveProperty('internalToken');
    expect(result.externalAnalytics?.googleAnalytics).toEqual({ enabled: true, measurementId: 'G-ZXR9E6443E' });
  });
});
