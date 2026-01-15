import type { FilterConfig, FilterValues } from '../types';
import { flattenFilters } from '../hooks/useFilterState';

export function getFiltersFromUrlParams(
  filters: FilterConfig[],
  searchParams: URLSearchParams
): FilterValues {
  const urlFilters: FilterValues = {};
  const flatFilters = flattenFilters(filters);
  flatFilters.forEach((filter) => {
    const paramValue = searchParams.get(filter.id);
    if (paramValue !== null) {
      if (filter.type === 'dateRange') {
        const fromValue = searchParams.get(`${filter.id}From`);
        const toValue = searchParams.get(`${filter.id}To`);
        if (fromValue || toValue) {
          urlFilters[filter.id] = { from: fromValue || undefined, to: toValue || undefined };
        }
      } else {
        urlFilters[filter.id] = paramValue;
      }
    } else if (filter.type === 'dateRange') {
      const fromValue = searchParams.get(`${filter.id}From`);
      const toValue = searchParams.get(`${filter.id}To`);
      if (fromValue || toValue) {
        urlFilters[filter.id] = { from: fromValue || undefined, to: toValue || undefined };
      }
    }
  });
  return urlFilters;
}

export function computeInitialFilterValues(
  syncWithUrl: boolean,
  filters: FilterConfig[],
  searchParams: URLSearchParams,
  initialFilterValues: FilterValues
): FilterValues {
  if (syncWithUrl) {
    const urlFilters = getFiltersFromUrlParams(filters, searchParams);
    return { ...initialFilterValues, ...urlFilters };
  }
  return initialFilterValues;
}

