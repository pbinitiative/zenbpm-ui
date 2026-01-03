import { Button, alpha, type ButtonProps } from '@mui/material';
import { themeColors } from '@base/theme';

type PrimaryButtonProps = Omit<ButtonProps, 'variant' | 'color'>;

export const PrimaryButton = ({ children, sx, ...props }: PrimaryButtonProps) => {
  return (
    <Button
      variant="outlined"
      sx={{
        color: themeColors.primary,
        borderColor: themeColors.primary,
        backgroundColor: themeColors.primaryBg,
        '&:hover': {
          borderColor: themeColors.primary,
          backgroundColor: alpha(themeColors.primary, 0.15),
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};
