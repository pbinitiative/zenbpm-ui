export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface QuickSelectOption {
  label: string;
  getValue: () => DateRangeValue;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: string;
  disabled?: boolean;
}

export type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export type DateInputMode = 'absolute' | 'relative';
