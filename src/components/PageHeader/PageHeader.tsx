import { Box, Typography } from '@mui/material';
import { themeColors } from '../../base/theme';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, actions, children }: PageHeaderProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 4,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: themeColors.textPrimary,
            }}
          >
            {title}
          </Typography>
          {children}
        </Box>
        {subtitle && (
          <Typography
            sx={{
              mt: 0.75,
              fontSize: '0.875rem',
              color: themeColors.textMuted,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1.5 }}>{actions}</Box>}
    </Box>
  );
};
