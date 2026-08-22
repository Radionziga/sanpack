import { describe, expect, it } from 'vitest';
import {
  getCatalogCompanyName,
  getCatalogDocumentTheme,
  getCatalogFilename,
  getCatalogSiteLabel,
} from '@/lib/documents/catalogIdentity';

describe('catalog document identity', () => {
  it('uses the configured company name without embedding a store brand', () => {
    expect(getCatalogCompanyName({ company: { name: '  Example Trade  ' } })).toBe(
      'Example Trade',
    );
    expect(getCatalogCompanyName({ company: { name: '   ' } })).toBe('Storefront');
  });

  it('extracts a display hostname only from a valid configured URL', () => {
    expect(getCatalogSiteLabel('https://www.example.com/catalog')).toBe('example.com');
    expect(getCatalogSiteLabel('http://localhost:3000')).toBe('localhost');
    expect(getCatalogSiteLabel('not a URL')).toBe('');
    expect(getCatalogSiteLabel()).toBe('');
  });

  it('creates neutral and predictable download filenames', () => {
    expect(getCatalogFilename(true, 'ru')).toBe('catalog-price-list-ru.pdf');
    expect(getCatalogFilename(false, 'uz')).toBe('catalog-presentation-uz.pdf');
  });

  it('derives accessible document colors from storefront settings', () => {
    expect(getCatalogDocumentTheme({
      primaryColor: '#F4D35E',
      secondaryColor: '#123456',
    })).toEqual({
      brand: '#F4D35E',
      brandDeep: '#B09844',
      accent: '#123456',
      onBrand: '#14231C',
      onBrandDeep: '#14231C',
    });

    expect(getCatalogDocumentTheme({ primaryColor: '#102A22' }).onBrand).toBe('#FFFFFF');
  });

  it('uses neutral document colors when settings are missing or malformed', () => {
    expect(getCatalogDocumentTheme({ primaryColor: 'invalid', secondaryColor: '' })).toEqual({
      brand: '#334155',
      brandDeep: '#252F3D',
      accent: '#E2E8F0',
      onBrand: '#FFFFFF',
      onBrandDeep: '#FFFFFF',
    });
  });
});
