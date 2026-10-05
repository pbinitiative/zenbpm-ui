import type { SxProps, Theme } from '@mui/material';
import { themeColors } from '@base/theme';

/** Monospace link look shared by `MonoLink` and `MonoLinkButton`. */
export const monoLinkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  fontFamily: "'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: '0.6875rem',
  color: themeColors.primary,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
} satisfies SxProps<Theme>;
