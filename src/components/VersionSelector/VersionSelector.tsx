import { useMemo } from 'react';
import { FormControl, Select, MenuItem, Typography } from '@mui/material';
import { VersionLabel } from './VersionLabel';
import { getLatestVersionKey } from './utils';

export interface VersionOption {
  key: string;
  version: number;
  versionTag?: string;
}

interface VersionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: VersionOption[];
  disabled?: boolean;
  /** Label for the form control */
  label?: string;
  /** Mark the selected option as the version displayed on the page (menu only) */
  showViewingChip?: boolean;
  /** Size of the Select */
  size?: 'small' | 'medium';
}

/**
 * A shared version selector dropdown.
 * - Always shows the numeric version, followed by the versionTag when present
 * - Marks the latest version (highest number among the options) and, optionally,
 *   the displayed one
 */
export function VersionSelector({
  value,
  onChange,
  options,
  disabled = false,
  label,
  showViewingChip = false,
  size = 'small',
}: VersionSelectorProps) {
  const latestKey = useMemo(() => getLatestVersionKey(options), [options]);

  return (
    // Never wider than the container, so a long tag shrinks instead of
    // pushing the version number and markers out of view
    <FormControl size={size} disabled={disabled} sx={{ maxWidth: '100%', minWidth: 0 }}>
      {label && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      )}
      <Select
        value={value}
        onChange={(e) => onChange(String(e.target.value))}
        size={size}
        fullWidth
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300 } } } }}
        sx={{ '& .MuiSelect-select': { minWidth: 0 } }}
        renderValue={(selected) => {
          const option = options.find((o) => o.key === selected);
          if (!option) return null;
          return (
            <VersionLabel
              version={option.version}
              versionTag={option.versionTag}
              isLatest={option.key === latestKey}
              size={size}
            />
          );
        }}
        data-testid="version-selector"
      >
        {options.map((option) => (
          <MenuItem key={option.key} value={option.key}>
            <VersionLabel
              version={option.version}
              versionTag={option.versionTag}
              isLatest={option.key === latestKey}
              isViewing={showViewingChip && option.key === value}
              size={size}
            />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
