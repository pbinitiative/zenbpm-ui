import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Chip, Button, Collapse } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { themeColors } from '@base/theme';
import type { ActiveFilter } from '../types';

interface ActiveFilterBadgesProps {
  activeFilters: ActiveFilter[];
  onRemoveFilter: (filterId: string) => void;
  onClearAll: () => void;
}

export const ActiveFilterBadges = ({
  activeFilters,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterBadgesProps) => {
  const { t } = useTranslation([ns.common]);
  const hasActiveBadges = activeFilters.length > 0;

  return (
    <Collapse in={hasActiveBadges}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${themeColors.borderLight}`,
        }}
      >
        {activeFilters.map((filter) => (
          <Chip
            key={filter.id}
            data-testid={`filter-badge-${filter.id}`}
            label={
              <Box component="span" sx={{ display: 'flex', gap: 0.5 }}>
                <Box component="span" sx={{ color: themeColors.successText, fontWeight: 600 }}>
                  {filter.label}:
                </Box>
                <Box component="span" sx={{ color: themeColors.successText }}>
                  {filter.value}
                </Box>
              </Box>
            }
            size="small"
            onDelete={() => onRemoveFilter(filter.id)}
            sx={{
              bgcolor: themeColors.successBg,
              border: `1px solid ${themeColors.success}`,
              '& .MuiChip-label': {
                pr: 0,
              },
              '& .MuiChip-deleteIcon': {
                color: themeColors.success,
                ml: 0.75,
                mr: '-3px',
                '&:hover': { color: themeColors.successText },
              },
            }}
          />
        ))}

        {activeFilters.length > 1 && (
          <Button
            size="small"
            startIcon={<ClearIcon sx={{ fontSize: 16 }} />}
            onClick={onClearAll}
            sx={{ color: 'text.secondary', textTransform: 'none' }}
          >
            {t('common:filters.clearAll')}
          </Button>
        )}
      </Box>
    </Collapse>
  );
};
