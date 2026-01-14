import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Popover,
  TextField,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { themeColors } from '@base/theme';

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface QuickSelectOption {
  label: string;
  getValue: () => DateRangeValue;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: string;
  disabled?: boolean;
}

// Helper to format datetime to ISO string for datetime-local input
function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Helper to format datetime for display
function formatDisplayDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// Quick select option factories (labels provided by translations)
const createQuickSelectOptions = (t: (key: string) => string): QuickSelectOption[] => [
  {
    label: t('common:dateRange.quickSelect.last15Minutes'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 15 * 60 * 1000);
      return { from: formatDateTimeLocal(from), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last1Hour'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 60 * 60 * 1000);
      return { from: formatDateTimeLocal(from), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last24Hours'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { from: formatDateTimeLocal(from), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last7Days'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: formatDateTimeLocal(from), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last30Days'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: formatDateTimeLocal(from), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.last90Days'),
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { from: formatDateTimeLocal(from), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.today'),
    getValue: () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: formatDateTimeLocal(startOfDay), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.thisWeek'),
    getValue: () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      return { from: formatDateTimeLocal(startOfWeek), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.thisMonth'),
    getValue: () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDateTimeLocal(startOfMonth), to: formatDateTimeLocal(now) };
    },
  },
  {
    label: t('common:dateRange.quickSelect.thisYear'),
    getValue: () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { from: formatDateTimeLocal(startOfYear), to: formatDateTimeLocal(now) };
    },
  },
];

type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export const DateRangePicker = ({
  value,
  onChange,
  label,
  disabled = false,
}: DateRangePickerProps) => {
  const { t } = useTranslation([ns.common]);
  const quickSelectOptions = useMemo(() => createQuickSelectOptions(t), [t]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tempFrom, setTempFrom] = useState(value.from || '');
  const [tempTo, setTempTo] = useState(value.to || '');

  // Relative time state
  const [fromMode, setFromMode] = useState<'absolute' | 'relative'>('absolute');
  const [toMode, setToMode] = useState<'absolute' | 'relative'>('absolute');
  const [relativeFromValue, setRelativeFromValue] = useState(15);
  const [relativeFromUnit, setRelativeFromUnit] = useState<TimeUnit>('minutes');
  const [relativeToValue, setRelativeToValue] = useState(0);
  const [relativeToUnit, setRelativeToUnit] = useState<TimeUnit>('minutes');

  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setTempFrom(value.from || '');
    setTempTo(value.to || '');
  }, [value]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleQuickSelect = useCallback(
    (option: QuickSelectOption) => {
      const newValue = option.getValue();
      setTempFrom(newValue.from || '');
      setTempTo(newValue.to || '');
      setFromMode('absolute');
      setToMode('absolute');
      onChange(newValue);
      handleClose();
    },
    [onChange, handleClose]
  );

  // Calculate relative time
  const getRelativeTime = useCallback((amount: number, unit: TimeUnit, direction: 'past' | 'future'): Date => {
    const now = new Date();
    const multiplier = direction === 'past' ? -1 : 1;

    switch (unit) {
      case 'minutes':
        return new Date(now.getTime() + multiplier * amount * 60 * 1000);
      case 'hours':
        return new Date(now.getTime() + multiplier * amount * 60 * 60 * 1000);
      case 'days':
        return new Date(now.getTime() + multiplier * amount * 24 * 60 * 60 * 1000);
      case 'weeks':
        return new Date(now.getTime() + multiplier * amount * 7 * 24 * 60 * 60 * 1000);
      case 'months': {
        const result = new Date(now);
        result.setMonth(result.getMonth() + multiplier * amount);
        return result;
      }
      default:
        return now;
    }
  }, []);

  const handleApply = useCallback(() => {
    let fromValue = tempFrom;
    let toValue = tempTo;

    // Calculate relative "from" if in relative mode
    if (fromMode === 'relative') {
      const relativeDate = getRelativeTime(relativeFromValue, relativeFromUnit, 'past');
      fromValue = formatDateTimeLocal(relativeDate);
    }

    // Calculate relative "to" if in relative mode
    if (toMode === 'relative') {
      if (relativeToValue === 0) {
        toValue = formatDateTimeLocal(new Date());
      } else {
        const relativeDate = getRelativeTime(relativeToValue, relativeToUnit, 'past');
        toValue = formatDateTimeLocal(relativeDate);
      }
    }

    onChange({ from: fromValue || undefined, to: toValue || undefined });
    handleClose();
  }, [tempFrom, tempTo, fromMode, toMode, relativeFromValue, relativeFromUnit, relativeToValue, relativeToUnit, getRelativeTime, onChange, handleClose]);

  const handleClear = useCallback(() => {
    onChange({ from: undefined, to: undefined });
    setTempFrom('');
    setTempTo('');
    handleClose();
  }, [onChange, handleClose]);

  // Display text for the button
  const displayText = useMemo(() => {
    if (!value.from && !value.to) {
      return label || t('common:dateRange.selectDateRange');
    }
    const fromDisplay = formatDisplayDateTime(value.from);
    const toDisplay = formatDisplayDateTime(value.to);
    if (fromDisplay && toDisplay) {
      return `${fromDisplay} → ${toDisplay}`;
    }
    if (fromDisplay) {
      return t('common:dateRange.fromDate', { date: fromDisplay });
    }
    if (toDisplay) {
      return t('common:dateRange.untilDate', { date: toDisplay });
    }
    return label || t('common:dateRange.selectDateRange');
  }, [value, label, t]);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={handleClick}
        disabled={disabled}
        startIcon={<CalendarTodayIcon />}
        sx={{
          justifyContent: 'flex-start',
          textTransform: 'none',
          color: 'text.primary',
          borderColor: themeColors.overlay.inputBorder,
          backgroundColor: 'background.paper',
          minWidth: 280,
          height: 40,
          '&:hover': {
            borderColor: 'text.primary',
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayText}
        </Typography>
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: { width: 650, maxHeight: 500 },
          },
        }}
      >
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Quick select sidebar */}
          <Box
            sx={{
              width: 180,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.50',
              maxHeight: 450,
              overflow: 'auto',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1.5, pt: 1.5, pb: 0.5, display: 'block', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}
            >
              {t('common:dateRange.quickSelectTitle')}
            </Typography>
            <List dense disablePadding>
              {quickSelectOptions.map((option) => (
                <ListItemButton
                  key={option.label}
                  onClick={() => handleQuickSelect(option)}
                  sx={{ py: 0.5, px: 1.5 }}
                >
                  <ListItemText
                    primary={option.label}
                    primaryTypographyProps={{ variant: 'body2', fontSize: '0.8rem' }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>

          {/* Main datetime pickers area */}
          <Box sx={{ flex: 1, p: 2 }}>
            <Stack spacing={2.5}>
              {/* From datetime picker */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('common:filters.from')}
                  </Typography>
                  <ToggleButtonGroup
                    value={fromMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setFromMode(newMode)}
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

                {fromMode === 'absolute' ? (
                  <TextField
                    type="datetime-local"
                    size="small"
                    value={tempFrom}
                    onChange={(e) => setTempFrom(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      type="number"
                      size="small"
                      value={relativeFromValue}
                      onChange={(e) => setRelativeFromValue(parseInt(e.target.value) || 0)}
                      sx={{ width: 80 }}
                      inputProps={{ min: 0 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={relativeFromUnit}
                        onChange={(e) => setRelativeFromUnit(e.target.value as TimeUnit)}
                      >
                        <MenuItem value="minutes">{t('common:dateRange.units.minutes')}</MenuItem>
                        <MenuItem value="hours">{t('common:dateRange.units.hours')}</MenuItem>
                        <MenuItem value="days">{t('common:dateRange.units.days')}</MenuItem>
                        <MenuItem value="weeks">{t('common:dateRange.units.weeks')}</MenuItem>
                        <MenuItem value="months">{t('common:dateRange.units.months')}</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary">
                      {t('common:dateRange.ago')}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider />

              {/* To datetime picker */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t('common:filters.to')}
                  </Typography>
                  <ToggleButtonGroup
                    value={toMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setToMode(newMode)}
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

                {toMode === 'absolute' ? (
                  <TextField
                    type="datetime-local"
                    size="small"
                    value={tempTo}
                    onChange={(e) => setTempTo(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      type="number"
                      size="small"
                      value={relativeToValue}
                      onChange={(e) => setRelativeToValue(parseInt(e.target.value) || 0)}
                      sx={{ width: 80 }}
                      inputProps={{ min: 0 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={relativeToUnit}
                        onChange={(e) => setRelativeToUnit(e.target.value as TimeUnit)}
                      >
                        <MenuItem value="minutes">{t('common:dateRange.units.minutes')}</MenuItem>
                        <MenuItem value="hours">{t('common:dateRange.units.hours')}</MenuItem>
                        <MenuItem value="days">{t('common:dateRange.units.days')}</MenuItem>
                        <MenuItem value="weeks">{t('common:dateRange.units.weeks')}</MenuItem>
                        <MenuItem value="months">{t('common:dateRange.units.months')}</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary">
                      {t('common:dateRange.agoZeroIsNow')}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider />

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="outlined" size="small" onClick={handleClear}>
                  {t('common:actions.clear')}
                </Button>
                <Button variant="contained" size="small" onClick={handleApply}>
                  {t('common:actions.apply')}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Popover>
    </>
  );
};
