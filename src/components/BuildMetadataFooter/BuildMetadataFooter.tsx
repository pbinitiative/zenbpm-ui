import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  frontendBuildMetadata,
  isBuildMetadataMatch,
  type BuildMetadata,
} from '@base/buildMetadata';

const fetchSystemStatus = (): Promise<BuildMetadata> =>
  axios.get<BuildMetadata>('/system/status').then(({ data }) => data);

const formatMetadata = ({ git, build }: BuildMetadata): string =>
  `${build.version} (${git.commitId})`;

export const BuildMetadataFooter = () => {
  const { t } = useTranslation([ns.common]);
  const { data: backendBuildMetadata, isError, isLoading } = useQuery({
    queryKey: ['systemStatus', 'buildMetadata'],
    queryFn: fetchSystemStatus,
    retry: false,
    staleTime: Infinity,
  });

  const isMatching = backendBuildMetadata
    ? isBuildMetadataMatch(frontendBuildMetadata, backendBuildMetadata)
    : false;
  const showStatus = !isLoading && !isError && !isMatching;
  const statusLabel = isLoading
    ? t('buildMetadata.loading')
    : isError
      ? t('buildMetadata.unavailable')
      : t('buildMetadata.mismatch');
  const StatusIcon = isLoading || isError
    ? InfoOutlinedIcon
    : ErrorOutlineIcon;
  const statusColor = isLoading || isError ? 'text.secondary' : 'warning.dark';

  return (
    <Box
      component="footer"
      data-testid="build-metadata-footer"
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        color: 'text.secondary',
        px: { xs: 2, sm: 3, md: 5 },
        py: 0.75,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 0.5, sm: 2 },
          maxWidth: 1600,
          mx: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
          <Typography component="p" variant="captionNormal">
            {t('buildMetadata.zenbpm')}: {isLoading
              ? t('buildMetadata.loading')
              : isError || !backendBuildMetadata
                ? t('buildMetadata.unavailable')
                : formatMetadata(backendBuildMetadata)}
          </Typography>
          <Typography component="p" variant="captionNormal">
            {t('buildMetadata.ui')}: {formatMetadata(frontendBuildMetadata)}
          </Typography>
        </Box>
        {showStatus && (
          <Box
            component="span"
            role="status"
            aria-live="polite"
            data-testid="build-metadata-status"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: statusColor }}
          >
            <StatusIcon aria-hidden="true" sx={{ fontSize: '0.875rem' }} />
            <Typography component="span" variant="captionNormal">
              {statusLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
