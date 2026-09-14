import type { SiteSettings, StorefrontServiceSettings } from '@/types';

type StoredSiteSettings = Omit<Partial<SiteSettings>, 'company' | 'contacts' | 'locale' | 'design' | 'seo' | 'modules' | 'linkHub' | 'externalAnalytics'> & {
  company?: Partial<SiteSettings['company']>;
  contacts?: Partial<SiteSettings['contacts']>;
  locale?: Partial<SiteSettings['locale']>;
  design?: Partial<SiteSettings['design']>;
  seo?: Partial<SiteSettings['seo']>;
  modules?: {
    branding?: Partial<NonNullable<NonNullable<SiteSettings['modules']>['branding']>>;
    bagDesigner?: Partial<NonNullable<NonNullable<SiteSettings['modules']>['bagDesigner']>>;
  };
  linkHub?: Partial<NonNullable<SiteSettings['linkHub']>>;
  externalAnalytics?: {
    googleAnalytics?: Partial<NonNullable<SiteSettings['externalAnalytics']>['googleAnalytics']>;
    yandexMetrica?: Partial<NonNullable<SiteSettings['externalAnalytics']>['yandexMetrica']>;
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
    externalAnalytics: defaults.externalAnalytics || stored.externalAnalytics ? {
      googleAnalytics: {
        enabled: stored.externalAnalytics?.googleAnalytics?.enabled
          ?? defaults.externalAnalytics?.googleAnalytics.enabled
          ?? false,
        measurementId: stored.externalAnalytics?.googleAnalytics?.measurementId
          ?? defaults.externalAnalytics?.googleAnalytics.measurementId
          ?? '',
      },
      yandexMetrica: {
        enabled: stored.externalAnalytics?.yandexMetrica?.enabled
          ?? defaults.externalAnalytics?.yandexMetrica.enabled
          ?? false,
        counterId: stored.externalAnalytics?.yandexMetrica?.counterId
          ?? defaults.externalAnalytics?.yandexMetrica.counterId
          ?? '',
      },
    } : undefined,
    linkHub: defaults.linkHub || stored.linkHub ? {
      ...defaults.linkHub,
      ...stored.linkHub,
      enabled: stored.linkHub?.enabled ?? defaults.linkHub?.enabled ?? false,
      highlightEnabled: stored.linkHub?.highlightEnabled ?? defaults.linkHub?.highlightEnabled ?? false,
      links: stored.linkHub?.links ?? defaults.linkHub?.links ?? [],
      titleRu: stored.linkHub?.titleRu ?? defaults.linkHub?.titleRu ?? defaults.company.name,
      descriptionRu: stored.linkHub?.descriptionRu ?? defaults.linkHub?.descriptionRu ?? defaults.company.descriptionRu,
    } : undefined,
  };
}
