import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Chip, FormControl, Select, MenuItem, Tooltip } from '@mui/material';
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
  createdAt?: string;
  name?: string;
  version?: number;
  versions?: VersionInfo[];
  resourceName?: string;
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
  createdAt,
  name,
  version,
  versions = [],
  resourceName,
  onVersionChange,
  additionalFields = [],
  keyLabel,
  directFields,
}: UseMetadataFieldsOptions): MetadataField[] {
  const { t } = useTranslation([ns.common, ns.processInstance]);

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

    // 1. State (first when present, for instances)
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

    // 2. Key
    result.push({
      label: keyLabel || t('common:fields.key'),
      value: <MonoText>{entityKey}</MonoText>,
    });

    // 3. Name
    if (name) {
      result.push({
        label: t('common:fields.name'),
        value: name,
      });
    }

    // 4. Version (with selector if multiple versions available)
    if (version !== undefined) {
      if (versions.length > 1 && onVersionChange) {
        result.push({
          label: t('common:fields.version'),
          value: (
            <FormControl size="small" fullWidth>
              <Select
                value={entityKey}
                onChange={(e) => onVersionChange(String(e.target.value))}
                sx={{ fontSize: '0.875rem' }}
              >
                {versions.map((v) => (
                  <MenuItem key={v.key} value={v.key}>
                    v{v.version}
                    {v.key === entityKey && (
                      <Chip
                        label={t('common:current')}
                        size="small"
                        sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ),
        });
      } else {
        result.push({
          label: t('common:fields.version'),
          value: (
            <Chip
              label={`v${version}`}
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

    // 5. Resource name
    if (resourceName) {
      result.push({
        label: t('common:fields.resourceName'),
        value: resourceName,
      });
    }

    // 6. Created at
    if (createdAt) {
      result.push({
        label: t('common:fields.createdAt'),
        value: formatDate(createdAt),
      });
    }

    // 7. Additional fields
    result.push(...additionalFields);

    return result;
  }, [
    directFields,
    entityKey,
    stateField,
    state,
    incidentsCount,
    createdAt,
    name,
    version,
    versions,
    resourceName,
    onVersionChange,
    additionalFields,
    t,
    keyLabel,
  ]);
}
