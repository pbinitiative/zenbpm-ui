import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Button, Stack, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { FilterRenderer } from './FilterRenderer';
import type { FilterConfig, FilterGroupConfig, FilterValues, FiltersByZone } from '../types';

interface FirstLineToolbarProps {
  filtersByZone: FiltersByZone;
  filterGroups: FilterGroupConfig[];
  filterValues: FilterValues;
  onFilterChange: (filterId: string, value: string | string[] | { from?: string; to?: string }) => void;
  hasHideableFilters: boolean;
  showHideableFilters: boolean;
  onToggleHideableFilters: () => void;
}

/**
 * Renders the first line toolbar with Filters button and exposed_first_line filters
 */
export const FirstLineToolbar = ({
  filtersByZone,
  filterGroups,
  filterValues,
  onFilterChange,
  hasHideableFilters,
  showHideableFilters,
  onToggleHideableFilters,
}: FirstLineToolbarProps) => {
  const { t } = useTranslation([ns.common]);

  const zoneData = filtersByZone['exposed_first_line'];
  const leftGroups = Array.from(zoneData.left.entries());
  const rightGroups = Array.from(zoneData.right.entries());
  const showFiltersButton = hasHideableFilters;

  if (!showFiltersButton && leftGroups.length === 0 && rightGroups.length === 0) {
    return null;
  }

  const renderGroups = (groups: [string, FilterConfig[]][]) => {
    return groups.map(([groupId, groupFilters]) => {
      const groupConfig = filterGroups.find((g) => g.id === groupId);

      return (
        <Box key={groupId} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {groupConfig?.label && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {groupConfig.label}
            </Typography>
          )}
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        width: '100%',
      }}
    >
      {/* Left side: Filters button + left-aligned filters */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showFiltersButton && (
          <Button
            variant={showHideableFilters ? 'contained' : 'outlined'}
            size="small"
            startIcon={<FilterListIcon />}
            onClick={onToggleHideableFilters}
            sx={{ minWidth: 'auto' }}
          >
            {t('common:filters.filters')}
          </Button>
        )}

        {leftGroups.length > 0 && (
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            {renderGroups(leftGroups)}
          </Stack>
        )}
      </Box>

      {/* Right side: right-aligned filters */}
      {rightGroups.length > 0 && (
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          {renderGroups(rightGroups)}
        </Stack>
      )}
    </Box>
  );
};
