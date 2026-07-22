import { Chip, type ChipProps } from '@mui/material';

export interface NumericBadgeProps {
  value: number;
  color?: Exclude<ChipProps['color'], 'default'>;
}

export const NumericBadge = ({ value, color = 'primary' }: NumericBadgeProps) => {
  const hasPositiveValue = value > 0;

  return (
    <Chip
      size="small"
      label={value}
      sx={{
        bgcolor: hasPositiveValue ? `${color}.main` : 'grey.200',
        color: hasPositiveValue ? `${color}.contrastText` : 'text.secondary',
        fontWeight: 600,
        minWidth: 40,
      }}
    />
  );
};
