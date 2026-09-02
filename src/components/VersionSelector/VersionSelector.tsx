import { useTranslation } from 'react-i18next';
import { Box, Chip, FormControl, Select, MenuItem, Typography } from '@mui/material';
import { ns } from '@base/i18n';
import { VersionPill } from '@components/VersionPill';

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
  /** The key of the currently active version (displays a "current" chip) */
  currentKey?: string;
  /** Label for the form control */
  label?: string;
  /** Whether to show the current chip */
  showCurrentChip?: boolean;
  /** Size of the Select */
  size?: 'small' | 'medium';
}

/**
 * A shared version selector dropdown.
 * - Displays versionTag as a Chip when present
 * - Falls back to plain "v{version}" display when no versionTag
 */
export function VersionSelector({
  value,
  onChange,
  options,
  disabled = false,
  currentKey,
  label,
  showCurrentChip = true,
  size = 'small',
}: VersionSelectorProps) {
  const { t } = useTranslation([ns.common, ns.processes]);

  return (
    <FormControl size={size} disabled={disabled}>
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
        data-testid="version-selector"
      >
        {options.map((option) => (
          <MenuItem key={option.key} value={option.key}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {option.versionTag ? (
                <VersionPill version={option.versionTag} size={size} withoutVPrefix />
              ) : (
                <VersionPill version={option.version} size={size} />
              )}
              {showCurrentChip && currentKey === option.key && (
                <Chip
                  label={t('common:current')}
                  size="small"
                  sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
