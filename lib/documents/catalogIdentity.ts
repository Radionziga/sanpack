import type { Language } from '@/types';
import { accessibleForeground, darkenHex, normalizeHex } from '@/lib/theme/colors';

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

export function getCatalogDocumentTheme(design?: {
  primaryColor?: string;
  secondaryColor?: string;
}) {
  const brand = normalizeHex(design?.primaryColor || '', '#334155');
  const brandDeep = darkenHex(brand);
  const accent = normalizeHex(design?.secondaryColor || '', '#E2E8F0');

  return {
    brand,
    brandDeep,
    accent,
    onBrand: accessibleForeground(brand),
    onBrandDeep: accessibleForeground(brandDeep),
  };
}
