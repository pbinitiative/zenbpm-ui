import { Box, type SxProps, type Theme } from '@mui/material';
import { themeColors } from '../../base/theme';

interface TypeBadgeProps {
  type: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const TypeBadge = ({ type, size = 'small', sx }: TypeBadgeProps) => {
  const isSmall = size === 'small';

  // Format the type for display (e.g., "user-task" -> "User Task")
  const formatType = (t: string) => {
    return t
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: isSmall ? 1.25 : 1.5,
        py: isSmall ? 0.375 : 0.5,
        borderRadius: '6px',
        fontSize: isSmall ? '0.6875rem' : '0.75rem',
        fontWeight: 500,
        backgroundColor: themeColors.bgGray,
        color: themeColors.textSecondary,
        whiteSpace: 'nowrap',
        ...sx,
      }}
      data-testid="type-badge"
    >
      {formatType(type)}
    </Box>
  );
};
