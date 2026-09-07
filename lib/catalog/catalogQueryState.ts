import type { CatalogAttributeFilters } from './productFacets';

export interface CatalogQueryState {
  sortBy: string;
  viewMode: 'grid' | 'list';
  inStockOnly: boolean;
  ownProductionOnly: boolean;
  filters: CatalogAttributeFilters;
}

export function readCatalogQueryState(params: URLSearchParams): CatalogQueryState {
  const filters: CatalogAttributeFilters = {};
  for (const [key, value] of params.entries()) {
    if (!key.startsWith('f.') || !value) continue;
    try {
      const parsed = JSON.parse(value) as CatalogAttributeFilters[string];
      if (parsed && ['options', 'boolean', 'range'].includes(parsed.kind)) filters[key.slice(2)] = parsed;
    } catch { /* Ignore malformed share URLs. */ }
  }
  return {
    sortBy: params.get('sort') || 'popular',
    viewMode: params.get('view') === 'list' ? 'list' : 'grid',
    inStockOnly: params.get('stock') === '1',
    ownProductionOnly: params.get('own') === '1',
    filters,
  };
}

export function writeCatalogQueryState(params: URLSearchParams, state: CatalogQueryState) {
  const next = new URLSearchParams(params);
  for (const key of [...next.keys()]) {
    if (key.startsWith('f.')) next.delete(key);
  }
  for (const key of ['sort', 'view', 'stock', 'own']) next.delete(key);
  if (state.sortBy !== 'popular') next.set('sort', state.sortBy);
  if (state.viewMode !== 'grid') next.set('view', state.viewMode);
  if (state.inStockOnly) next.set('stock', '1');
  if (state.ownProductionOnly) next.set('own', '1');
  for (const [key, selection] of Object.entries(state.filters)) {
    next.set(`f.${key}`, JSON.stringify(selection));
  }
  return next;
}
