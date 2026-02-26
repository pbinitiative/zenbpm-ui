import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Divider } from '@mui/material';
import { NavButton } from '@components/NavButton';
import { MetadataItem } from './MetadataItem';
import type { MetadataField, VersionInfo, DefinitionInfo } from '../types';
import { useMetadataFields } from '../hooks';

// Re-export types for backward compatibility
export type { MetadataField, VersionInfo, DefinitionInfo };

export interface MetadataPanelProps {
  /** Primary entity key */
  entityKey?: number | string;

  /** State field - displayed first (for instances). Use this for custom state rendering. */
  stateField?: MetadataField;

  /** Entity state - when provided, renders StateBadge automatically (simpler than stateField) */
  state?: string;

  /** Number of unresolved incidents - shows warning icon next to state */
  incidentsCount?: number;

  /** Process type (e.g. default, multiInstance, subprocess, callActivity) */
  processType?: string;

  /** Created at timestamp - formatted automatically */
  createdAt?: string;

  /** Entity name */
  name?: string;

  /** Current version number */
  version?: number;

  /** All available versions for version selector */
  versions?: VersionInfo[];

  /** Resource file name */
  resourceName?: string;

  /** Callback when version is changed */
  onVersionChange?: (key: string) => void;

  /** Definition info - when provided, shows a link to the parent definition */
  definitionInfo?: DefinitionInfo;

  /** Related process instance key (displayed as link) */
  processInstanceKey?: number | string;

  /** Additional fields to display */
  additionalFields?: MetadataField[];

  /** Custom label for the key field */
  keyLabel?: string;

  /** Direct fields - when provided, renders these instead of building from props */
  fields?: MetadataField[];

  /** Gap between fields (MUI spacing units, default: 1.5) */
  gap?: number;

  /** Action buttons to display at the bottom of the panel */
  actions?: ReactNode;
}

/**
 * A panel component for displaying metadata fields with optional navigation links.
 * Can be used in two ways:
 * 1. Pass `fields` directly for simple usage
 * 2. Pass individual props (entityKey, name, version, etc.) to auto-build fields
 */
export const MetadataPanel = ({
  entityKey,
  stateField,
  state,
  incidentsCount,
  processType,
  createdAt,
  name,
  version,
  versions = [],
  resourceName,
  onVersionChange,
  definitionInfo,
  processInstanceKey,
  additionalFields = [],
  keyLabel,
  fields: directFields,
  gap = 1.5,
  actions,
}: MetadataPanelProps) => {
  const { t } = useTranslation([ns.common]);

  const fields = useMetadataFields({
    entityKey,
    stateField,
    state,
    incidentsCount,
    processType,
    createdAt,
    name,
    version,
    versions,
    resourceName,
    onVersionChange,
    additionalFields,
    keyLabel,
    directFields,
  });

  const hasLinks = definitionInfo || processInstanceKey;
  const hasBottomSection = hasLinks || actions;

  // Simple render if no links or actions
  if (!hasBottomSection) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap, flex: 1 }}>
        {fields.map((field, index) => (
          <MetadataItem key={`${field.label}-${index}`} label={field.label} value={field.value} mono={field.mono} />
        ))}
      </Box>
    );
  }

  // Render with navigation links and/or actions at bottom
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Main content */}
      <Box sx={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap }}>
        {fields.map((field, index) => (
          <MetadataItem key={`${field.label}-${index}`} label={field.label} value={field.value} mono={field.mono} />
        ))}
      </Box>

      {/* Spacer to push bottom section down */}
      <Box sx={{ flex: 1 }} />

      {/* Bottom section: actions and navigation links */}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Action buttons */}
        {actions}

        {/* Navigation links */}
        {definitionInfo && (
          <NavButton
            to={
              definitionInfo.type === 'process'
                ? `/process-definitions/${definitionInfo.key}`
                : `/decision-definitions/${definitionInfo.key}`
            }
          >
            {definitionInfo.type === 'process'
              ? t('common:fields.processDefinition')
              : t('common:fields.decisionDefinition')}
          </NavButton>
        )}
        {processInstanceKey && (
          <NavButton to={`/process-instances/${processInstanceKey}`}>{t('common:fields.processInstance')}</NavButton>
        )}
      </Box>
    </Box>
  );
};
