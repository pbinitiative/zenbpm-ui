import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
} from '@mui/material';
import { IOSSwitch } from '@components/IOSSwitch';
import { DateRangePicker } from '@components/DateRangePicker';
import { DebouncedTextField } from './DebouncedTextField';
import type { SimpleFilterConfig, FilterValues, FilterOption } from '../types';

// Helper component to render option content with proper vertical alignment
const OptionContent = ({ option }: { option: FilterOption }) => (
  option.renderContent ? (
    <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
      {option.renderContent}
    </Box>
  ) : (
    <>{option.label}</>
  )
);

interface FilterControlProps {
  filter: SimpleFilterConfig;
  value: string | string[] | { from?: string; to?: string } | undefined;
  onChange: (filterId: string, value: string | string[] | { from?: string; to?: string }) => void;
}

export const FilterControl = ({ filter, value, onChange }: FilterControlProps) => {
  const { t } = useTranslation([ns.common]);
  const isReadonly = filter.readonly === true;
  const width = filter.width ?? 200;

  const handleChange = useCallback(
    (newValue: string | string[] | { from?: string; to?: string }) => {
      onChange(filter.id, newValue);
    },
    [filter.id, onChange]
  );

  switch (filter.type) {
    case 'select': {
      const selectedOption = filter.options?.find((o) => o.value === value) || null;

      if (filter.searchable) {
        // Searchable select using Autocomplete
        return (
          <Autocomplete
            size="small"
            options={filter.options || []}
            getOptionLabel={(option) => option.label}
            value={selectedOption}
            onChange={(_, newValue) => handleChange(newValue?.value || '')}
            disabled={isReadonly}
            sx={{ minWidth: width, maxWidth: width }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={filter.label}
                placeholder={filter.placeholder}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.value}>
                <OptionContent option={option} />
              </li>
            )}
            isOptionEqualToValue={(option, val) => option.value === val.value}
          />
        );
      }
      // Regular select dropdown
      return (
        <FormControl
          size="small"
          disabled={isReadonly}
          sx={{ minWidth: width, maxWidth: width }}
        >
          <InputLabel>{filter.label}</InputLabel>
          <Select
            value={(value as string) || ''}
            label={filter.label}
            onChange={(e) => handleChange(e.target.value)}
            onClose={() => {
              // Remove focus from select after closing to prevent persistent outline
              setTimeout(() => {
                (document.activeElement as HTMLElement)?.blur();
              }, 0);
            }}
            readOnly={isReadonly}
            renderValue={(val) => {
              if (!val) return <em>{t('common:filters.all')}</em>;
              const opt = filter.options?.find((o) => o.value === val);
              return opt ? <OptionContent option={opt} /> : val;
            }}
          >
            {!filter.hideAllOption && (
              <MenuItem value="">
                <em>{t('common:filters.all')}</em>
              </MenuItem>
            )}
            {filter.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <OptionContent option={option} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    case 'text':
      return (
        <DebouncedTextField
          label={filter.label}
          placeholder={filter.placeholder}
          value={(value as string) || ''}
          onChange={(newValue) => handleChange(newValue)}
          debounce={filter.debounce ?? 200}
          disabled={isReadonly}
          readonly={isReadonly}
          width={width}
        />
      );

    case 'date':
      return (
        <TextField
          size="small"
          type="date"
          label={filter.label}
          value={(value as string) || ''}
          onChange={(e) => handleChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: width, maxWidth: width }}
        />
      );

    case 'dateRange': {
      const rangeValue = (value as { from?: string; to?: string }) || {};
      return (
        <DateRangePicker
          label={filter.label}
          value={rangeValue}
          onChange={(newValue) => handleChange(newValue)}
          disabled={isReadonly}
        />
      );
    }

    case 'switch': {
      const labelPosition = filter.labelPosition ?? 'right';
      return (
        <FormControlLabel
          control={
            <IOSSwitch
              checked={value === 'true'}
              onChange={(e) => handleChange(e.target.checked ? 'true' : 'false')}
              disabled={isReadonly}
            />
          }
          label={filter.label}
          labelPlacement={labelPosition === 'left' ? 'start' : 'end'}
          sx={{
            ml: 0,
            gap: 1,
            '& .MuiFormControlLabel-label': {
              fontSize: '0.875rem',
            },
          }}
        />
      );
    }

    default:
      return null;
  }
};

// Props interface for external use
export interface FilterControlExternalProps {
  filter: SimpleFilterConfig;
  filterValues: FilterValues;
  onFilterChange: (filterId: string, value: string | string[] | { from?: string; to?: string }) => void;
}
