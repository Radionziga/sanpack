import { describe, expect, it } from 'vitest';
import { readCatalogQueryState, writeCatalogQueryState } from '@/lib/catalog/catalogQueryState';

describe('catalog URL state', () => {
  it('round-trips list state while preserving search query', () => {
    const params = writeCatalogQueryState(new URLSearchParams('q=milk'), {
      sortBy: 'price_asc', viewMode: 'list', inStockOnly: true,
      ownProductionOnly: false,
      page: 3,
      filters: { color: { kind: 'options', values: ['Blue'] }, width: { kind: 'range', min: 205 } },
    });
    expect(params.get('q')).toBe('milk');
    expect(readCatalogQueryState(params)).toMatchObject({ sortBy: 'price_asc', viewMode: 'list', inStockOnly: true, page: 3 });
    expect(readCatalogQueryState(params).filters.color).toEqual({ kind: 'options', values: ['Blue'] });
  });

  it('falls back to the first page for malformed pagination state', () => {
    expect(readCatalogQueryState(new URLSearchParams('page=invalid')).page).toBe(1);
    expect(readCatalogQueryState(new URLSearchParams('page=-4')).page).toBe(1);
  });
});
