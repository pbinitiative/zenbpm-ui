import type { ReactNode } from 'react';
import { Box, Button } from '@mui/material';
import { themeColors } from '../../base/theme';

export interface SubTab {
  value: string;
  label: string;
  badge?: number;
}

interface SubTabsProps {
  tabs: SubTab[];
  value: string;
  onChange: (value: string) => void;
  /** Optional actions to display on the right side, aligned with tabs */
  actions?: ReactNode;
}

/**
 * Segmented control component matching Design 3 style.
 * Gray background container with white active segment.
 * Optionally accepts actions to display on the right side.
 */
export const SubTabs = ({ tabs, value, onChange, actions }: SubTabsProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 3,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          bgcolor: themeColors.bgGray,
          borderRadius: '8px',
          p: 0.375,
        }}
      >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <Button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            disableRipple
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              minWidth: 'auto',
              border: 'none',
              bgcolor: isActive ? themeColors.bgWhite : 'transparent',
              color: isActive ? themeColors.textPrimary : themeColors.textSecondary,
              boxShadow: isActive ? `0 1px 3px ${themeColors.shadows.light}` : 'none',
              '&:hover': {
                bgcolor: isActive ? themeColors.bgWhite : 'transparent',
                color: themeColors.textPrimary,
              },
            }}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  px: 1,
                  py: 0.25,
                  borderRadius: '10px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  bgcolor: isActive ? themeColors.successBg : themeColors.bgWhite,
                  color: isActive ? themeColors.successText : themeColors.textSecondary,
                }}
              >
                {tab.badge}
              </Box>
            )}
          </Button>
        );
      })}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};
