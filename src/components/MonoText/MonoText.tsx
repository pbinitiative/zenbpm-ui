import { Typography, type TypographyProps } from '@mui/material';
import { themeColors } from '../../base/theme';

interface MonoTextProps extends Omit<TypographyProps, 'fontFamily'> {
  children: React.ReactNode;
}

export const MonoText = ({ children, sx, ...props }: MonoTextProps) => {
  return (
    <Typography
      component="span"
      sx={{
        fontFamily: "'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        fontSize: '0.6875rem',
        color: themeColors.textMuted,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  );
};
