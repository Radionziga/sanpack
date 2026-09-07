import { describe, expect, it } from 'vitest';
import { readCatalogQueryState, writeCatalogQueryState } from '@/lib/catalog/catalogQueryState';

describe('catalog URL state', () => {
  it('round-trips list state while preserving search query', () => {
    const params = writeCatalogQueryState(new URLSearchParams('q=milk'), {
      sortBy: 'price_asc', viewMode: 'list', inStockOnly: true,
      ownProductionOnly: false,
      filters: { color: { kind: 'options', values: ['Blue'] }, width: { kind: 'range', min: 205 } },
    });
    expect(params.get('q')).toBe('milk');
    expect(readCatalogQueryState(params)).toMatchObject({ sortBy: 'price_asc', viewMode: 'list', inStockOnly: true });
    expect(readCatalogQueryState(params).filters.color).toEqual({ kind: 'options', values: ['Blue'] });
  });
});
