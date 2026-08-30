import type { SiteSettings, StorefrontServiceSettings } from '@/types';

type StoredSiteSettings = Partial<SiteSettings> & {
  company?: Partial<SiteSettings['company']>;
  contacts?: Partial<SiteSettings['contacts']>;
  locale?: Partial<SiteSettings['locale']>;
  design?: Partial<SiteSettings['design']>;
  seo?: Partial<SiteSettings['seo']>;
  modules?: {
    branding?: Partial<NonNullable<NonNullable<SiteSettings['modules']>['branding']>>;
    bagDesigner?: Partial<NonNullable<NonNullable<SiteSettings['modules']>['bagDesigner']>>;
  };
};

function mergeServiceModule(
  defaults: StorefrontServiceSettings | undefined,
  stored: Partial<StorefrontServiceSettings> | undefined,
): StorefrontServiceSettings {
  return {
    ...defaults,
    ...stored,
    enabled: stored?.enabled ?? defaults?.enabled ?? true,
  };
}

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
      branding: mergeServiceModule(defaults.modules?.branding, stored.modules?.branding),
      bagDesigner: mergeServiceModule(defaults.modules?.bagDesigner, stored.modules?.bagDesigner),
    },
  };
}
