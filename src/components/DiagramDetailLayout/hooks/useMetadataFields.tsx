import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Tooltip } from '@mui/material';
import { VersionSelector, VersionLabel, resolveLatestKey, type VersionHistory } from '@components/VersionSelector';
import ErrorIcon from '@mui/icons-material/Error';
import { MonoText } from '@components/MonoText';
import { StateBadge } from '@components/StateBadge';
import type { ProcessInstanceProcessType } from '@base/openapi';
import type { MetadataField } from '../types';
import { formatDate } from '../utils';

interface UseMetadataFieldsOptions {
  entityKey?: number | string;
  stateField?: MetadataField;
  state?: string;
  incidentsCount?: number;
  processType?: ProcessInstanceProcessType;
  createdAt?: string;
  businessKey?: string;
  name?: string;
  version?: number;
  versionTag?: string;
  versionHistory?: VersionHistory;
  onVersionChange?: (key: string) => void;
  additionalFields?: MetadataField[];
  keyLabel?: string;
  directFields?: MetadataField[];
}

/**
 * The metadata fields of a definition or instance page: `directFields` when
 * given, otherwise fields built from the individual options. The version
 * field is a selector when there are other versions to switch to, or a
 * failed version list to retry, and a label otherwise.
 */
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
  versionHistory,
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
        value: t(`processes:types.${processType}`),
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
      const displayedKey = String(entityKey);
      const displayed = { key: displayedKey, version, versionTag };
      // Other versions to switch to, or a failed load, whose Retry item is in
      // the selector's menu
      const needsSelector =
        !!versionHistory &&
        (versionHistory.hasMore ||
          !!versionHistory.error ||
          versionHistory.versions.some((v) => v.key !== displayedKey));

      if (needsSelector && onVersionChange) {
        result.push({
          label: t('common:fields.version'),
          value: (
            <VersionSelector
              value={displayedKey}
              onChange={(val) => onVersionChange(val)}
              options={versionHistory.versions}
              // Shown before the page holding it is loaded
              selectedOption={displayed}
              latestKey={versionHistory.latestKey}
              hasMore={versionHistory.hasMore}
              loadingMore={versionHistory.loadingMore}
              onLoadMore={versionHistory.loadMore}
              error={versionHistory.error}
              retrying={versionHistory.retrying}
              onRetry={versionHistory.retry}
              showViewingChip
            />
          ),
        });
      } else {
        result.push({
          label: t('common:fields.version'),
          value: (
            <VersionLabel
              version={version}
              versionTag={versionTag}
              // No "latest" while the version list is loading or failed to
              isLatest={
                resolveLatestKey(versionHistory?.latestKey, versionHistory?.versions ?? [], displayed) ===
                displayedKey
              }
              tagLines={2}
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
    versionHistory,
    onVersionChange,
    additionalFields,
    t,
    keyLabel,
  ]);
}
