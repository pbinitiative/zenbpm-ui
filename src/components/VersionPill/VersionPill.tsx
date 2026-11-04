import { Box, type SxProps, type Theme } from '@mui/material';

interface VersionPillProps {
  version: number | string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const VersionPill = ({ version, size = 'small', sx }: VersionPillProps) => {
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
        backgroundColor: 'var(--zb-badge-soft)',
        color: 'var(--zb-badge-soft-text)',
        whiteSpace: 'nowrap',
        ...sx,
      }}
      data-testid="version-pill"
    >
      v{version}
    </Box>
  );
};
