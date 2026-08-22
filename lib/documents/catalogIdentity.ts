import type { Language } from '@/types';

const DEFAULT_COMPANY_NAME = 'Storefront';

export function getCatalogCompanyName(settings: { company: { name: string } }): string {
  return settings.company.name.trim() || DEFAULT_COMPANY_NAME;
}

export function getCatalogSiteLabel(configuredSiteUrl?: string): string {
  const value = configuredSiteUrl?.trim();
  if (!value) return '';

  try {
    return new URL(value).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

export function getCatalogFilename(withPrices: boolean, language: Language): string {
  const documentType = withPrices ? 'price-list' : 'presentation';
  return `catalog-${documentType}-${language}.pdf`;
}
