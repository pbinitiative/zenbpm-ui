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
  /**
   * Lines the tag may take before it is cut short (the full tag is then in
   * its tooltip). Unlimited when omitted, as in an open menu, which is where
   * a touch screen user reads a long tag.
   */
  tagLines?: number;
  size?: 'small' | 'medium';
}

const markerChipSx = { height: 18, fontSize: '0.65rem', flexShrink: 0 };

/**
 * Numeric version pill, optionally followed by the version tag and
 * "latest" / "viewing" markers. When they don't fit on one line, the tag and
 * markers wrap onto the next lines instead of being cut short.
 */
export function VersionLabel({
  version,
  versionTag,
  isLatest = false,
  isViewing = false,
  tagLines,
  size = 'small',
}: VersionLabelProps) {
  const { t } = useTranslation([ns.common]);

  return (
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 1, rowGap: 0.5, minWidth: 0 }}
    >
      <VersionPill version={version} size={size} sx={{ flexShrink: 0 }} />
      {versionTag && (
        <Typography
          component="span"
          variant="captionNormal"
          title={versionTag}
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            minWidth: 0,
            // Tags rarely have spaces to break at, e.g. release-2024-11-05-rc1
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            ...(tagLines !== undefined && {
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: tagLines,
              overflow: 'hidden',
            }),
          }}
          data-testid="version-tag"
        >
          {versionTag}
        </Typography>
      )}
      {isLatest && (
        <Chip
          label={t('common:versionLatest')}
          size="small"
          variant="outlined"
          // Green border, dark text: green text on white fails the WCAG contrast minimum
          sx={{ ...markerChipSx, borderColor: 'success.main', color: 'text.primary' }}
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
