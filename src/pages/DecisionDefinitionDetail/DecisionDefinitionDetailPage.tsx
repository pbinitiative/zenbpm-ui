import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DmnViewer } from '@components/DmnViewer';
import { DiagramDetailLayout, MetadataPanel } from '@components/DiagramDetailLayout';
import type { MetadataField, VersionInfo } from '@components/DiagramDetailLayout';
import { DecisionInstancesTable } from './components/DecisionInstancesTable';
import { getDmnResourceDefinition, getDmnResourceDefinitions } from '@base/openapi';

interface DmnResourceDefinition {
  key: number;
  version: number;
  dmnResourceDefinitionId: string;
  name?: string;
  resourceName?: string;
  dmnData?: string;
}

export const DecisionDefinitionDetailPage = () => {
  const { dmnResourceDefinitionKey } = useParams<{ dmnResourceDefinitionKey: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation([ns.common, ns.decisions]);

  // State
  const [definition, setDefinition] = useState<DmnResourceDefinition | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch definition
  useEffect(() => {
    if (!dmnResourceDefinitionKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getDmnResourceDefinition(dmnResourceDefinitionKey as unknown as number);
        setDefinition(data as unknown as DmnResourceDefinition);

        // Fetch all versions for this DMN resource
        if (data.dmnResourceDefinitionId) {
          try {
            const versionsData = await getDmnResourceDefinitions({
              dmnResourceDefinitionId: data.dmnResourceDefinitionId,
              page: 1,
              size: 100,
            });
            const items = (versionsData.items || []) as VersionInfo[];
            items.sort((a, b) => b.version - a.version);
            setVersions(items);
          } catch {
            // Versions fetch is not critical
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load decision definition');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dmnResourceDefinitionKey]);

  // Handlers
  const handleVersionChange = useCallback(
    (key: string) => {
      navigate(`/decision-definitions/${key}`);
    },
    [navigate]
  );

  // Build additional metadata fields (must be before early returns to follow rules of hooks)
  const additionalFields = useMemo((): MetadataField[] => {
    if (!definition) return [];

    return [
      {
        label: t('decisions:fields.dmnResourceId'),
        value: definition.dmnResourceDefinitionId,
      },
    ];
  }, [definition, t]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !definition) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || t('common:errors.decisionDefinitionNotFound')}</Alert>
      </Box>
    );
  }

  // Metadata content using MetadataPanel
  const metadataContent = (
    <MetadataPanel
      entityKey={definition.key}
      name={definition.name}
      version={definition.version}
      versions={versions}
      resourceName={definition.resourceName}
      additionalFields={additionalFields}
      onVersionChange={handleVersionChange}
    />
  );

  // Diagram content
  const diagramContent = definition.dmnData ? (
    <DmnViewer diagramData={definition.dmnData} height={400} />
  ) : (
    <Box
      sx={{
        height: { xs: 200, sm: 300, md: 400 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        borderRadius: 1,
      }}
    >
      <Typography color="text.secondary">
        {t('decisions:detail.noDiagram')}
      </Typography>
    </Box>
  );

  // Bottom section (instances table)
  const instancesContent = (
    <DecisionInstancesTable
      dmnResourceDefinitionKey={dmnResourceDefinitionKey}
    />
  );

  return (
    <DiagramDetailLayout
      leftSection={metadataContent}
      leftTitle={t('decisions:detail.metadata')}
      rightSection={diagramContent}
      rightTitle={t('decisions:detail.diagram')}
      bottomSection={instancesContent}
      bottomTitle={t('decisions:detail.instances')}
    />
  );
};
