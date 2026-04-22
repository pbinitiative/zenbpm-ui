import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Autocomplete, Box, CircularProgress, TextField } from '@mui/material';
import type { AutocompleteInputChangeReason } from '@mui/material';

export interface SearchableSelectProps<T> {
  value: T | null;
  onChange: (value: T | null) => void;
  /** Stable function (wrap in useCallback) that fetches options for a given search string */
  fetchOptions: (search: string) => Promise<T[]>;
  /** Returns the primary display label for an option */
  getOptionLabel: (option: T) => string;
  /** Returns an optional secondary subtitle for an option (e.g. the raw ID when a name is shown) */
  getOptionSubtitle?: (option: T) => string | undefined;
  /** Returns a unique key for an option – used for equality checks and React keys */
  getOptionKey: (option: T) => React.Key;
  label: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

const DEBOUNCE_MS = 300;

export const SearchableSelect = <T,>({
  value,
  onChange,
  fetchOptions,
  getOptionLabel,
  getOptionSubtitle,
  getOptionKey,
  label,
  disabled,
  size = 'small',
}: SearchableSelectProps<T>) => {
  const { t } = useTranslation(ns.common);
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        const items = await fetchOptions(search);
        setOptions(items);
        setFetchError(null);
      } catch (err: unknown) {
        console.error('Failed to fetch options:', err);
        setOptions([]);
        setFetchError(t('errors.failedToFetchOptions'));
      } finally {
        setLoading(false);
      }
    },
    [fetchOptions, t],
  );

  // Load initial options on mount
  useEffect(() => {
    void doFetch('');
  }, [doFetch]);

  const handleInputChange = useCallback(
    (_: unknown, newInputValue: string, reason: AutocompleteInputChangeReason) => {
      setInputValue(newInputValue);
      if (reason !== 'input') return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void doFetch(newInputValue), DEBOUNCE_MS);
    },
    [doFetch],
  );

  return (
    <Autocomplete<T>
      value={value}
      inputValue={inputValue}
      options={options}
      loading={loading}
      disabled={disabled}
      size={size}
      filterOptions={(x) => x}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, val) => getOptionKey(option) === getOptionKey(val)}
      onChange={(_, newValue) => onChange(newValue)}
      onInputChange={handleInputChange}
      noOptionsText={fetchError ?? t('noOptions') }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const displayName = getOptionLabel(option);
        const subtitle = getOptionSubtitle?.(option);
        return (
          <li {...props} key={getOptionKey(option)}>
            <Box>
              <Box>{displayName}</Box>
              {subtitle && (
                <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {subtitle}
                </Box>
              )}
            </Box>
          </li>
        );
      }}
    />
  );
};
