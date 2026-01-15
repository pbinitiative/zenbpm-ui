import {
  Box,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import type { DateInputMode, TimeUnit } from '../types';

interface DateTimeInputProps {
  label: string;
  mode: DateInputMode;
  onModeChange: (mode: DateInputMode) => void;
  absoluteValue: string;
  onAbsoluteChange: (value: string) => void;
  relativeValue: number;
  onRelativeValueChange: (value: number) => void;
  relativeUnit: TimeUnit;
  onRelativeUnitChange: (unit: TimeUnit) => void;
  helperText?: string;
}

export const DateTimeInput = ({
  label,
  mode,
  onModeChange,
  absoluteValue,
  onAbsoluteChange,
  relativeValue,
  onRelativeValueChange,
  relativeUnit,
  onRelativeUnitChange,
  helperText,
}: DateTimeInputProps) => {
  const { t } = useTranslation([ns.common]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, newMode: DateInputMode | null) => newMode && onModeChange(newMode)}
          size="small"
        >
          <ToggleButton value="absolute" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>
            {t('common:dateRange.mode.absolute')}
          </ToggleButton>
          <ToggleButton value="relative" sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>
            {t('common:dateRange.mode.relative')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {mode === 'absolute' ? (
        <TextField
          type="datetime-local"
          size="small"
          value={absoluteValue}
          onChange={(e) => onAbsoluteChange(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      ) : (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            type="number"
            size="small"
            value={relativeValue}
            onChange={(e) => onRelativeValueChange(parseInt(e.target.value) || 0)}
            sx={{ width: 80 }}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={relativeUnit} onChange={(e) => onRelativeUnitChange(e.target.value as TimeUnit)}>
              <MenuItem value="minutes">{t('common:dateRange.units.minutes')}</MenuItem>
              <MenuItem value="hours">{t('common:dateRange.units.hours')}</MenuItem>
              <MenuItem value="days">{t('common:dateRange.units.days')}</MenuItem>
              <MenuItem value="weeks">{t('common:dateRange.units.weeks')}</MenuItem>
              <MenuItem value="months">{t('common:dateRange.units.months')}</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {helperText || t('common:dateRange.ago')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
