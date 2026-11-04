import { useTranslation } from 'react-i18next';
import { Box, Chip, Typography } from '@mui/material';
import { ns } from '@base/i18n';
import { VersionPill } from '@components/VersionPill';

interface VersionLabelProps {
  version: number;
  versionTag?: string;
  /** Marks this as the latest deployed version */
  isLatest?: boolean;
  /** Marks this as the version currently displayed on the page */
  isViewing?: boolean;
  size?: 'small' | 'medium';
}

const markerChipSx = { height: 18, fontSize: '0.65rem', flexShrink: 0 };

/**
 * Numeric version pill, optionally followed by the version tag and
 * "latest" / "viewing" markers.
 */
export function VersionLabel({
  version,
  versionTag,
  isLatest = false,
  isViewing = false,
  size = 'small',
}: VersionLabelProps) {
  const { t } = useTranslation([ns.common]);

  return (
    // Only the tag shrinks (with an ellipsis); the number and markers keep their size
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <VersionPill version={version} size={size} sx={{ flexShrink: 0 }} />
      {versionTag && (
        <Typography
          component="span"
          variant="caption"
          noWrap
          title={versionTag}
          // Tags are identifiers: show them verbatim, without the caption's uppercase
          sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0, textTransform: 'none' }}
          data-testid="version-tag"
        >
          {versionTag}
        </Typography>
      )}
      {isLatest && (
        <Chip
          label={t('common:versionLatest')}
          size="small"
          color="success"
          variant="outlined"
          sx={markerChipSx}
          data-testid="version-latest-chip"
        />
      )}
      {isViewing && (
        <Chip
          label={t('common:versionViewing')}
          size="small"
          sx={markerChipSx}
          data-testid="version-viewing-chip"
        />
      )}
    </Box>
  );
}
