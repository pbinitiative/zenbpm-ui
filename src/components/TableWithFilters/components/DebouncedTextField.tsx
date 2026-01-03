import { useState, useEffect, useCallback, useRef } from 'react';
import { TextField } from '@mui/material';
import { themeColors } from '@base/theme';

interface DebouncedTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  width?: number | string;
}

export const DebouncedTextField = ({
  value,
  onChange,
  debounce = 200,
  label,
  placeholder,
  disabled,
  readonly,
  width = 200,
}: DebouncedTextFieldProps) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for debounced onChange
      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounce);
    },
    [onChange, debounce]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TextField
      size="small"
      label={label}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      disabled={disabled}
      sx={{ minWidth: width, maxWidth: width }}
      slotProps={{
        input: {
          readOnly: readonly,
          sx: readonly
            ? {
                bgcolor: themeColors.bgGray,
                '& .MuiInputBase-input': { color: 'text.secondary' },
              }
            : undefined,
        },
      }}
    />
  );
};
