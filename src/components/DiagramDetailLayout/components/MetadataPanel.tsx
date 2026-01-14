import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Chip,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import { MonoText } from '@components/MonoText';
import { NavButton } from '@components/NavButton';
import { StateBadge } from '@components/StateBadge';
import { MetadataItem } from './MetadataItem';

export interface MetadataField {
  /** Label text displayed above the value */
  label: string;
  /** ReactNode to display as the value */
  value: ReactNode;
  /** Whether to use monospace font for string values */
  mono?: boolean;
}

export interface VersionInfo {
  key: number;
  version: number;
}

/** Definition info for instances - displayed as a link to the parent definition */
export interface DefinitionInfo {
  /** Definition key (used for link) */
  key: number | string;
  /** Type of definition (determines the link URL) */
  type: 'process' | 'decision';
}

export interface MetadataPanelProps {
  /** Primary entity key */
  entityKey?: number | string;

  /** State field - displayed first (for instances). Use this for custom state rendering. */
  stateField?: MetadataField;

  /** Entity state - when provided, renders StateBadge automatically (simpler than stateField) */
  state?: string;

  /** Number of unresolved incidents - shows warning icon next to state */
  incidentsCount?: number;

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
}

/**
 * A panel component for displaying metadata fields with optional navigation links.
 * Can be used in two ways:
 * 1. Pass `fields` directly for simple usage
 * 2. Pass individual props (entityKey, name, version, etc.) to auto-build fields
 */
// Helper function for date formatting
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export const MetadataPanel = ({
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
  definitionInfo,
  processInstanceKey,
  additionalFields = [],
  keyLabel,
  fields: directFields,
  gap = 1.5,
}: MetadataPanelProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);

  // Build metadata fields from props (or use direct fields)
  const fields = useMemo((): MetadataField[] => {
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
    // Use stateField if provided, otherwise build from state prop
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

  // Check if we have navigation links
  const hasLinks = definitionInfo || processInstanceKey;

  // Simple render if no links
  if (!hasLinks) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap, flex: 1 }}>
        {fields.map((field, index) => (
          <MetadataItem
            key={`${field.label}-${index}`}
            label={field.label}
            value={field.value}
            mono={field.mono}
          />
        ))}
      </Box>
    );
  }

  // Render with navigation links at bottom
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Main content */}
      <Box sx={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap }}>
        {fields.map((field, index) => (
          <MetadataItem
            key={`${field.label}-${index}`}
            label={field.label}
            value={field.value}
            mono={field.mono}
          />
        ))}
      </Box>

      {/* Spacer to push links to bottom */}
      <Box sx={{ flex: 1 }} />

      {/* Navigation links at bottom */}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
          <NavButton to={`/process-instances/${processInstanceKey}`}>
            {t('common:fields.processInstance')}
          </NavButton>
        )}
      </Box>
    </Box>
  );
};
