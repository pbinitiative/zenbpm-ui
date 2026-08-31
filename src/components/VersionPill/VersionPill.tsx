import { Box, type SxProps, type Theme } from '@mui/material';
import { themeColors } from '../../base/theme';

interface VersionPillProps {
  version: number | string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
  withoutVPrefix?: boolean;
}

export const VersionPill = ({ version, size = 'small', sx, withoutVPrefix }: VersionPillProps) => {
  const isSmall = size === 'small';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: isSmall ? 1.5 : 1.75,
        py: isSmall ? 0.375 : 0.5,
        borderRadius: '100px',
        fontSize: isSmall ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        backgroundColor: themeColors.successBg,
        color: themeColors.successText,
        whiteSpace: 'nowrap',
        ...sx,
      }}
      data-testid="version-pill"
    >
      {withoutVPrefix ? version : `v${version}`}
    </Box>
  );
};
