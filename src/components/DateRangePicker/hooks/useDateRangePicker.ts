import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import type { DateRangeValue, QuickSelectOption, TimeUnit, DateInputMode } from '../types';
import { formatDateTimeLocal, formatDisplayDateTime, getRelativeTime, createQuickSelectOptions } from '../utils';

interface UseDateRangePickerOptions {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: string;
}

interface UseDateRangePickerResult {
  // Popover state
  anchorEl: HTMLElement | null;
  open: boolean;
  handleClick: (event: React.MouseEvent<HTMLElement>) => void;
  handleClose: () => void;

  // Quick select
  quickSelectOptions: QuickSelectOption[];
  handleQuickSelect: (option: QuickSelectOption) => void;

  // From input state
  tempFrom: string;
  setTempFrom: (value: string) => void;
  fromMode: DateInputMode;
  setFromMode: (mode: DateInputMode) => void;
  relativeFromValue: number;
  setRelativeFromValue: (value: number) => void;
  relativeFromUnit: TimeUnit;
  setRelativeFromUnit: (unit: TimeUnit) => void;

  // To input state
  tempTo: string;
  setTempTo: (value: string) => void;
  toMode: DateInputMode;
  setToMode: (mode: DateInputMode) => void;
  relativeToValue: number;
  setRelativeToValue: (value: number) => void;
  relativeToUnit: TimeUnit;
  setRelativeToUnit: (unit: TimeUnit) => void;

  // Actions
  handleApply: () => void;
  handleClear: () => void;

  // Display
  displayText: string;
}

export function useDateRangePicker({
  value,
  onChange,
  label,
}: UseDateRangePickerOptions): UseDateRangePickerResult {
  const { t } = useTranslation([ns.common]);
  const quickSelectOptions = useMemo(() => createQuickSelectOptions(t), [t]);

  // Popover state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  // Temp values for editing
  const [tempFrom, setTempFrom] = useState(value.from || '');
  const [tempTo, setTempTo] = useState(value.to || '');

  // Relative time state for "from"
  const [fromMode, setFromMode] = useState<DateInputMode>('absolute');
  const [relativeFromValue, setRelativeFromValue] = useState(15);
  const [relativeFromUnit, setRelativeFromUnit] = useState<TimeUnit>('minutes');

  // Relative time state for "to"
  const [toMode, setToMode] = useState<DateInputMode>('absolute');
  const [relativeToValue, setRelativeToValue] = useState(0);
  const [relativeToUnit, setRelativeToUnit] = useState<TimeUnit>('minutes');

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
      setTempFrom(value.from || '');
      setTempTo(value.to || '');
    },
    [value]
  );

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
  }, [
    tempFrom,
    tempTo,
    fromMode,
    toMode,
    relativeFromValue,
    relativeFromUnit,
    relativeToValue,
    relativeToUnit,
    onChange,
    handleClose,
  ]);

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

  return {
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
  };
}
