import { Box, Button, Popover, Typography, Divider, Stack } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { themeColors } from '@base/theme';

// Types
import type { DateRangePickerProps } from './types';

// Hooks
import { useDateRangePicker } from './hooks/useDateRangePicker';

// Components
import { QuickSelectSidebar } from './components/QuickSelectSidebar';
import { DateTimeInput } from './components/DateTimeInput';

// Re-export types
export type { DateRangeValue, QuickSelectOption, DateRangePickerProps } from './types';

export const DateRangePicker = ({ value, onChange, label, disabled = false }: DateRangePickerProps) => {
  const { t } = useTranslation([ns.common]);

  const {
    // Popover state
    anchorEl,
    open,
    handleClick,
    handleClose,

    // Quick select
    quickSelectOptions,
    handleQuickSelect,

    // From input state
    tempFrom,
    setTempFrom,
    fromMode,
    setFromMode,
    relativeFromValue,
    setRelativeFromValue,
    relativeFromUnit,
    setRelativeFromUnit,

    // To input state
    tempTo,
    setTempTo,
    toMode,
    setToMode,
    relativeToValue,
    setRelativeToValue,
    relativeToUnit,
    setRelativeToUnit,

    // Actions
    handleApply,
    handleClear,

    // Display
    displayText,
  } = useDateRangePicker({ value, onChange, label });

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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
        slotProps={{
          paper: { sx: { width: 650, maxHeight: 500 } },
        }}
      >
        <Box sx={{ display: 'flex', height: '100%' }}>
          <QuickSelectSidebar options={quickSelectOptions} onSelect={handleQuickSelect} />

          <Box sx={{ flex: 1, p: 2 }}>
            <Stack spacing={2.5}>
              <DateTimeInput
                label={t('common:filters.from')}
                mode={fromMode}
                onModeChange={setFromMode}
                absoluteValue={tempFrom}
                onAbsoluteChange={setTempFrom}
                relativeValue={relativeFromValue}
                onRelativeValueChange={setRelativeFromValue}
                relativeUnit={relativeFromUnit}
                onRelativeUnitChange={setRelativeFromUnit}
              />

              <Divider />

              <DateTimeInput
                label={t('common:filters.to')}
                mode={toMode}
                onModeChange={setToMode}
                absoluteValue={tempTo}
                onAbsoluteChange={setTempTo}
                relativeValue={relativeToValue}
                onRelativeValueChange={setRelativeToValue}
                relativeUnit={relativeToUnit}
                onRelativeUnitChange={setRelativeToUnit}
                helperText={t('common:dateRange.agoZeroIsNow')}
              />

              <Divider />

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
