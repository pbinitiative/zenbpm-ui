import { useMemo, useRef, useState, type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, CircularProgress, FormControl, Select, MenuItem, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { ns } from '@base/i18n';
import { VersionLabel } from './VersionLabel';
import { resolveLatestKey, withSelectedOption } from './utils';

export interface VersionOption {
  key: string;
  version: number;
  versionTag?: string;
}

interface VersionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  /** The versions loaded so far */
  options: VersionOption[];
  /**
   * Key of the latest version. While it is unknown (versions still loading,
   * or failed to load), no option is marked latest.
   */
  latestKey?: string;
  /**
   * The selected version. It is added to the options when they lack it,
   * e.g. while its page of older versions isn't loaded yet.
   */
  selectedOption?: VersionOption;
  /** Older versions remain: `onLoadMore` is called when the menu is scrolled to its end */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** A failed load, shown at the end of the menu with a Retry action calling `onRetry` */
  error?: 'list' | 'olderVersions';
  onRetry?: () => void;
  disabled?: boolean;
  /** Label for the form control */
  label?: string;
  /** Mark the selected option as the version displayed on the page (menu only) */
  showViewingChip?: boolean;
  /** Size of the Select */
  size?: 'small' | 'medium';
}

/** Distance from the end of the menu at which the next page is requested */
const LOAD_MORE_THRESHOLD_PX = 120;

/** Value of the Retry menu item, which selects no version */
const RETRY_VALUE = '__retry__';

/**
 * A shared version selector dropdown.
 * - Always shows the numeric version, followed by the versionTag when present
 * - Marks the latest version (`latestKey`) and, optionally, the displayed one
 * - Loads older versions as the menu is scrolled
 */
export function VersionSelector({
  value,
  onChange,
  options,
  latestKey: listLatestKey,
  selectedOption,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  error,
  onRetry,
  disabled = false,
  label,
  showViewingChip = false,
  size = 'small',
}: VersionSelectorProps) {
  const { t } = useTranslation([ns.common]);
  const allOptions = useMemo(() => withSelectedOption(options, selectedOption), [options, selectedOption]);
  const latestKey = resolveLatestKey(listLatestKey, options, selectedOption);

  // Controlled, so that Retry keeps the menu open
  const [open, setOpen] = useState(false);
  const retryClickedRef = useRef(false);

  const handleMenuScroll = (event: UIEvent<HTMLElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    if (hasMore && scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD_PX) onLoadMore?.();
  };

  return (
    // Never wider than the container: the label wraps instead
    <FormControl size={size} disabled={disabled} sx={{ maxWidth: '100%', minWidth: 0 }}>
      {label && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      )}
      <Select
        value={value}
        onChange={(e) => {
          if (e.target.value !== RETRY_VALUE) onChange(String(e.target.value));
        }}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => {
          if (!retryClickedRef.current) setOpen(false);
          retryClickedRef.current = false;
        }}
        size={size}
        fullWidth
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300 }, onScroll: handleMenuScroll } } }}
        sx={{ '& .MuiSelect-select': { minWidth: 0 } }}
        renderValue={(selected) => {
          const option = allOptions.find((o) => o.key === selected);
          if (!option) return null;
          return (
            <VersionLabel
              version={option.version}
              versionTag={option.versionTag}
              isLatest={option.key === latestKey}
              tagLines={2}
              size={size}
            />
          );
        }}
        data-testid="version-selector"
      >
        {allOptions.map((option) => (
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
        {loadingMore && (
          // Disabled, so neither selectable nor focusable
          <MenuItem disabled data-testid="version-selector-loading-more">
            <CircularProgress size={16} sx={{ mr: 1 }} />
            {t('common:loading')}
          </MenuItem>
        )}
        {error && onRetry && (
          <MenuItem
            value={RETRY_VALUE}
            onClick={() => {
              retryClickedRef.current = true;
              onRetry();
            }}
            sx={{ whiteSpace: 'normal', gap: 1 }}
            data-testid="version-selector-retry"
          >
            <Box component="span" sx={{ color: 'error.main' }}>
              {error === 'olderVersions' ? t('common:olderVersionsLoadFailed') : t('common:versionsLoadFailed')}
            </Box>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'primary.main' }}>
              <ReplayIcon fontSize="small" />
              {t('common:actions.retry')}
            </Box>
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
}
