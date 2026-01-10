import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Typography,
  CircularProgress,
} from '@mui/material';
import { getProcessDefinitions } from '@base/openapi';
import { themeColors } from '@base/theme';

export interface VersionInfo {
  key: number;
  version: number;
  createdAt?: string;
  name?: string;
}

export interface VersionSwitcherProps {
  /** Current process definition key */
  currentKey: number;
  /** BPMN Process ID to fetch all versions */
  bpmnProcessId: string;
  /** Callback when version is selected */
  onVersionChange: (key: number) => void;
  /** Optional: pre-loaded versions (if not provided, will fetch) */
  versions?: VersionInfo[];
}

export const VersionSwitcher = ({
  currentKey,
  bpmnProcessId,
  onVersionChange,
  versions: propVersions,
}: VersionSwitcherProps) => {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<VersionInfo[]>(propVersions || []);
  const [loading, setLoading] = useState(!propVersions);

  // Fetch versions if not provided
  useEffect(() => {
    if (propVersions) {
      setVersions(propVersions);
      setLoading(false);
      return;
    }

    const fetchVersions = async () => {
      setLoading(true);
      try {
        const data = await getProcessDefinitions({ bpmnProcessId, page: 1, size: 100 });
        const items = (data.items || []) as VersionInfo[];
        // Sort by version descending (newest first)
        items.sort((a, b) => b.version - a.version);
        setVersions(items);
      } catch (error) {
        console.error('Failed to fetch versions:', error);
        setVersions([]);
      } finally {
        setLoading(false);
      }
    };

    if (bpmnProcessId) {
      fetchVersions();
    }
  }, [bpmnProcessId, propVersions]);

  // Find current version info
  const currentVersion = useMemo(() => {
    return versions.find((v) => v.key === currentKey);
  }, [versions, currentKey]);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          {t('common:loading')}...
        </Typography>
      </Box>
    );
  }

  if (versions.length <= 1) {
    // Only one version, show as chip
    return (
      <Chip
        label={`v${currentVersion?.version || 1}`}
        size="small"
        sx={{
          bgcolor: themeColors.primaryBg,
          color: 'primary.main',
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <Select
        value={currentKey}
        onChange={(e) => onVersionChange(Number(e.target.value))}
        renderValue={() => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`v${currentVersion?.version}`}
              size="small"
              sx={{
                bgcolor: themeColors.primaryBg,
                color: 'primary.main',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 20,
              }}
            />
            <Typography variant="body2">
              {t('processes:fields.version')}
            </Typography>
          </Box>
        )}
        sx={{
          '& .MuiSelect-select': {
            py: 0.75,
          },
        }}
      >
        {versions.map((v) => (
          <MenuItem
            key={v.key}
            value={v.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`v${v.version}`}
                size="small"
                sx={{
                  bgcolor: v.key === currentKey ? 'primary.main' : '#e8eaf6',
                  color: v.key === currentKey ? 'white' : 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
              {v.key === currentKey && (
                <Typography variant="caption" color="text.secondary">
                  ({t('common:current')})
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {v.createdAt && (
                <Typography variant="caption" color="text.secondary">
                  {formatDate(v.createdAt)}
                </Typography>
              )}
              <Typography
                variant="caption"
                sx={{
                  fontFamily: '"SF Mono", Monaco, monospace',
                  fontSize: '0.65rem',
                  color: 'text.disabled',
                }}
              >
                {v.key}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
