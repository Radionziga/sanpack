import type { SiteSettings } from '@/types';

type StoredSiteSettings = Partial<SiteSettings> & {
  company?: Partial<SiteSettings['company']>;
  contacts?: Partial<SiteSettings['contacts']>;
  locale?: Partial<SiteSettings['locale']>;
  design?: Partial<SiteSettings['design']>;
  seo?: Partial<SiteSettings['seo']>;
  modules?: {
    bagDesigner?: Partial<NonNullable<NonNullable<SiteSettings['modules']>['bagDesigner']>>;
  };
};

export function mergeSiteSettings(
  defaults: SiteSettings,
  stored?: StoredSiteSettings | null
): SiteSettings {
  if (!stored) return defaults;

  return {
    ...defaults,
    ...stored,
    company: { ...defaults.company, ...stored.company },
    contacts: { ...defaults.contacts, ...stored.contacts },
    locale: { ...defaults.locale, ...stored.locale },
    design: { ...defaults.design, ...stored.design },
    seo: { ...defaults.seo, ...stored.seo },
    modules: {
      ...defaults.modules,
      ...stored.modules,
      bagDesigner: {
        enabled: stored.modules?.bagDesigner?.enabled
          ?? defaults.modules?.bagDesigner?.enabled
          ?? false,
      },
    },
  };
}
