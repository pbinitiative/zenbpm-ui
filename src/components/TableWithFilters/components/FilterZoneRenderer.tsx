import { Box, Stack, Typography } from '@mui/material';
import { FilterRenderer } from './FilterRenderer';
import type { FilterConfig, FilterGroupConfig, FilterValues, FilterZone, FiltersByZone } from '../types';

interface FilterZoneRendererProps {
  zone: FilterZone;
  filtersByZone: FiltersByZone;
  filterGroups: FilterGroupConfig[];
  filterValues: FilterValues;
  onFilterChange: (filterId: string, value: string | string[] | { from?: string; to?: string }) => void;
}

/**
 * Renders all filters in a specific zone
 */
export const FilterZoneRenderer = ({
  zone,
  filtersByZone,
  filterGroups,
  filterValues,
  onFilterChange,
}: FilterZoneRendererProps) => {
  const zoneData = filtersByZone[zone];
  const leftGroups = Array.from(zoneData.left.entries());
  const rightGroups = Array.from(zoneData.right.entries());

  if (leftGroups.length === 0 && rightGroups.length === 0) {
    return null;
  }

  const renderGroups = (groups: [string, FilterConfig[]][]) => {
    return groups.map(([groupId, groupFilters]) => {
      const groupConfig = filterGroups.find((g) => g.id === groupId);
      // Check if any filter in this group is a group type filter
      const hasGroupFilter = groupFilters.some((f) => f.type === 'group');

      return (
        <Box
          key={groupId}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            width: hasGroupFilter ? '100%' : 'auto',
          }}
        >
          {groupConfig?.label && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {groupConfig.label}
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              flexWrap: 'wrap',
              width: hasGroupFilter ? '100%' : 'auto',
              '& > *': hasGroupFilter ? { width: '100%' } : undefined,
            }}
          >
            {groupFilters.map((filter) => (
              <FilterRenderer
                key={filter.id}
                filter={filter}
                filterValues={filterValues}
                onFilterChange={onFilterChange}
              />
            ))}
          </Stack>
        </Box>
      );
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, width: '100%' }}>
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', alignItems: 'flex-start', flex: 1 }}>
          {renderGroups(leftGroups)}
        </Stack>
        {rightGroups.length > 0 && (
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {renderGroups(rightGroups)}
          </Stack>
        )}
      </Box>
    </Box>
  );
};
