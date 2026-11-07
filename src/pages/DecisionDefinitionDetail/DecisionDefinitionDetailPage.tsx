import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DmnViewer } from '@components/DmnViewer';
import { DiagramDetailLayout, MetadataPanel } from '@components/DiagramDetailLayout';
import type { MetadataField } from '@components/DiagramDetailLayout';
import { DecisionInstancesTable } from '@components/DecisionInstancesTable';
import { getDmnResourceDefinition } from '@base/openapi';
import { useDecisionVersionHistory } from '@components/VersionSelector';

interface DmnResourceDefinition {
  key: string;
  version: number;
  dmnResourceDefinitionId: string;
  dmnDefinitionName: string;
  dmnData?: string;
}

/**
 * A decision definition version: its metadata with the version selector,
 * its DMN diagram and its decision instances
 */
export const DecisionDefinitionDetailPage = () => {
  const { dmnResourceDefinitionKey } = useParams<{ dmnResourceDefinitionKey: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation([ns.common, ns.decisions]);

  // State
  const [definition, setDefinition] = useState<DmnResourceDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The version list loads on its own, so the page doesn't wait for it. It is
  // kept across version switches, but requested again when the page opens,
  // for versions deployed meanwhile.
  const versionHistory = useDecisionVersionHistory(definition?.dmnResourceDefinitionId, { staleTime: 0 });

  // Fetch definition
  useEffect(() => {
    if (!dmnResourceDefinitionKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getDmnResourceDefinition(dmnResourceDefinitionKey);
        setDefinition(data as unknown as DmnResourceDefinition);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load decision definition');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [dmnResourceDefinitionKey]);

  // Handlers
  const handleVersionChange = useCallback(
    (key: string) => {
      void navigate(`/decision-definitions/${key}`);
    },
    [navigate]
  );

  const handleEditDefinition = useCallback(() => {
    if (dmnResourceDefinitionKey) {
      void navigate(`/designer/decision/${dmnResourceDefinitionKey}`);
    }
  }, [navigate, dmnResourceDefinitionKey]);

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

  // Metadata actions
  const metadataActions = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<EditIcon />}
      onClick={handleEditDefinition}
      sx={{ justifyContent: 'flex-start' }}
      data-testid="decision-definition-edit-button"
    >
      {t('decisions:actions.editDefinition')}
    </Button>
  );

  // Metadata content using MetadataPanel
  const metadataContent = (
    <MetadataPanel
      entityKey={definition.key}
      name={definition.dmnDefinitionName}
      version={definition.version}
      versionHistory={versionHistory}
      additionalFields={additionalFields}
      onVersionChange={handleVersionChange}
      actions={metadataActions}
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
      syncWithUrl={false}
      autoRefreshInterval={10000}
    />
  );

  return (
    <Box data-testid="decision-definition-detail-page">
      <DiagramDetailLayout
        leftSection={metadataContent}
        leftTitle={t('decisions:detail.metadata')}
        rightSection={diagramContent}
        rightTitle={t('decisions:detail.diagram')}
        bottomSection={instancesContent}
        bottomTitle={t('decisions:detail.instances')}
      />
    </Box>
  );
};
