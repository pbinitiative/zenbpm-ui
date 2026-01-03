import { useMemo } from 'react';
import type { FilterConfig, FiltersByZone, FilterZone } from '../types';

/**
 * Organizes filters by zone and alignment
 */
export const useFiltersByZone = (filters: FilterConfig[]): FiltersByZone => {
  return useMemo(() => {
    const zones: FiltersByZone = {
      exposed_first_line: { left: new Map(), right: new Map() },
      exposed_second_line: { left: new Map(), right: new Map() },
      hideable: { left: new Map(), right: new Map() },
    };

    filters.forEach((filter) => {
      const zone: FilterZone = filter.zone ?? 'hideable';
      const align = filter.align ?? 'left';
      const group = filter.group ?? '__default__';
      const alignMap = zones[zone][align];

      if (!alignMap.has(group)) {
        alignMap.set(group, []);
      }
      alignMap.get(group)!.push(filter);
    });

    return zones;
  }, [filters]);
};
