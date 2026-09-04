import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Chip, Tooltip } from '@mui/material';
import { VersionSelector } from '@components/VersionSelector';
import ErrorIcon from '@mui/icons-material/Error';
import { MonoText } from '@components/MonoText';
import { StateBadge } from '@components/StateBadge';
import type { MetadataField, VersionInfo } from '../types';
import { formatDate } from '../utils';

interface UseMetadataFieldsOptions {
  entityKey?: number | string;
  stateField?: MetadataField;
  state?: string;
  incidentsCount?: number;
  processType?: string;
  createdAt?: string;
  businessKey?: string;
  name?: string;
  version?: number;
  versionTag?: string;
  versions?: VersionInfo[];
  onVersionChange?: (key: string) => void;
  additionalFields?: MetadataField[];
  keyLabel?: string;
  directFields?: MetadataField[];
}

export function useMetadataFields({
  entityKey,
  stateField,
  state,
  incidentsCount,
  processType,
  createdAt,
  businessKey,
  name,
  version,
  versionTag,
  versions = [],
  onVersionChange,
  additionalFields = [],
  keyLabel,
  directFields,
}: UseMetadataFieldsOptions): MetadataField[] {
  const { t } = useTranslation([ns.common, ns.processInstance, ns.processes]);

  return useMemo((): MetadataField[] => {
    // If direct fields provided, use them
    if (directFields) {
      return directFields;
    }

    // Otherwise build from individual props
    if (entityKey === undefined) {
      return [];
    }

    const result: MetadataField[] = [];

    // State (first when present, for instances)
    if (stateField) {
      result.push(stateField);
    } else if (state) {
      result.push({
        label: t('common:fields.state'),
        value: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StateBadge state={state} />
            {incidentsCount !== undefined && incidentsCount > 0 && (
              <Tooltip title={t('processInstance:detail.hasIncidents', { count: incidentsCount })}>
                <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
              </Tooltip>
            )}
          </Box>
        ),
      });
    }

    // Key
    result.push({
      label: keyLabel || t('common:fields.key'),
      value: <MonoText>{entityKey}</MonoText>,
    });

    // Process Type
    if (processType) {
      result.push({
        label: t('common:fields.type'),
        value: t(`processes:types.${processType}`) as string,
      });
    }

    // Name
    if (name) {
      result.push({
        label: t('common:fields.name'),
        value: name,
      });
    }

    // Version
    if (version !== undefined) {
      if (versions.length > 1 && onVersionChange) {
        result.push({
          label: t('common:fields.version'),
          value: (
            <VersionSelector
              value={String(entityKey ?? '')}
              onChange={(val) => onVersionChange(val)}
              options={versions}
              currentKey={String(entityKey ?? '')}
              showCurrentChip
            />
          ),
        });
      } else {
        result.push({
          label: t('common:fields.version'),
          value: (
            <Chip
              label={versionTag || `v${version}`}
              size="small"
              sx={{
                bgcolor: 'grey.100',
                color: 'primary.main',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 20,
              }}
            />
          ),
        });
      }
    }

    // Created at
    if (createdAt) {
      result.push({
        label: t('common:fields.createdAt'),
        value: formatDate(createdAt),
      });
    }

    // Business key
    if (businessKey) {
      result.push({
        label: t('common:fields.businessKey'),
        value: businessKey,
      });
    }

    // Additional fields
    result.push(...additionalFields);

    return result;
  }, [
    directFields,
    entityKey,
    stateField,
    state,
    incidentsCount,
    processType,
    createdAt,
    businessKey,
    name,
    version,
    versionTag,
    versions,
    onVersionChange,
    additionalFields,
    t,
    keyLabel,
  ]);
}
