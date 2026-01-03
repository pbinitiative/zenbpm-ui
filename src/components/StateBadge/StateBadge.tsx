import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import PendingIcon from '@mui/icons-material/Pending';
import BlockIcon from '@mui/icons-material/Block';

type StateType =
  | 'active'
  | 'completed'
  | 'terminated'
  | 'resolved'
  | 'unresolved'
  | 'created'
  | 'canceled'
  | 'failed';

interface StateConfig {
  color: string;
  icon: React.ReactNode;
}

const getStateConfig = (state: StateType): StateConfig => {
  const iconSize = 16;

  switch (state) {
    case 'active':
      return {
        color: 'primary.main',
        icon: <PlayCircleFilledIcon sx={{ fontSize: iconSize, color: 'primary.main' }} />,
      };
    case 'completed':
      return {
        color: 'text.secondary',
        icon: <CheckCircleIcon sx={{ fontSize: iconSize, color: 'text.secondary' }} />,
      };
    case 'resolved':
      return {
        color: 'success.main',
        icon: <CheckCircleIcon sx={{ fontSize: iconSize, color: 'success.main' }} />,
      };
    case 'terminated':
      return {
        color: 'warning.main',
        icon: <RemoveCircleIcon sx={{ fontSize: iconSize, color: 'warning.main' }} />,
      };
    case 'canceled':
      return {
        color: 'warning.main',
        icon: <BlockIcon sx={{ fontSize: iconSize, color: 'warning.main' }} />,
      };
    case 'failed':
      return {
        color: 'error.main',
        icon: <ErrorIcon sx={{ fontSize: iconSize, color: 'error.main' }} />,
      };
    case 'unresolved':
      return {
        color: 'error.main',
        icon: <CancelIcon sx={{ fontSize: iconSize, color: 'error.main' }} />,
      };
    case 'created':
      return {
        color: 'info.main',
        icon: <PendingIcon sx={{ fontSize: iconSize, color: 'info.main' }} />,
      };
    default:
      return {
        color: 'text.secondary',
        icon: <PendingIcon sx={{ fontSize: iconSize, color: 'text.secondary' }} />,
      };
  }
};

interface StateBadgeProps {
  state: StateType | string;
  label?: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const StateBadge = ({
  state,
  label,
  size = 'small',
  sx,
}: StateBadgeProps) => {
  const lowerState = state.toLowerCase() as StateType;
  const { color, icon } = getStateConfig(lowerState);
  const displayLabel = label || state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ...sx,
      }}
      data-testid={`state-badge-${lowerState}`}
    >
      {icon}
      <Typography
        variant="body2"
        component="span"
        sx={{
          color,
          fontWeight: 500,
          fontSize: size === 'small' ? '0.8125rem' : '0.875rem',
        }}
      >
        {displayLabel}
      </Typography>
    </Box>
  );
};
