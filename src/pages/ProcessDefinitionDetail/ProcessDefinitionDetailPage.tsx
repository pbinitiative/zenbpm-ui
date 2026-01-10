import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Fab,
  Tooltip,
  Link,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import { BpmnDiagram } from '@components/BpmnDiagram';
import { DiagramDetailLayout, MetadataPanel } from '@components/DiagramDetailLayout';
import type { MetadataField, VersionInfo } from '@components/DiagramDetailLayout';
import { StartInstanceDialog } from '@components/StartInstanceDialog';
import { ProcessInstancesTable } from '@components/ProcessInstancesTable';
import {
  getProcessDefinition,
  getProcessDefinitions,
  useGetProcessDefinitionElementStatistics,
} from '@base/openapi';

// Process definition type
interface ProcessDefinition {
  key: number;
  version: number;
  bpmnProcessId: string;
  bpmnData?: string;
  bpmnProcessName?: string;
  bpmnResourceName?: string;
  createdAt?: string;
}

export const ProcessDefinitionDetailPage = () => {
  const { processDefinitionKey } = useParams<{ processDefinitionKey: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [processDefinition, setProcessDefinition] = useState<ProcessDefinition | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; key?: string }>({
    open: false,
    message: '',
  });

  // Fetch element statistics for diagram overlays
  // Note: We pass the key as string but cast to number for TypeScript.
  // The actual URL will use the string value, avoiding JavaScript's number precision loss
  // for large int64 IDs (e.g., 2000000000000000004 would become 2000000000000000000 as Number)
  const { data: elementStatistics } = useGetProcessDefinitionElementStatistics(
    (processDefinitionKey as unknown) as number,
    {
      query: {
        enabled: !!processDefinitionKey && !!processDefinition,
        refetchInterval: 10000, // Refresh every 10 seconds
      },
    }
  );

  // Extract activity IDs from BPMN XML
  const extractActivityIds = (bpmnData: string): string[] => {
    try {
      // Decode base64 if needed
      let xml = bpmnData;
      if (!bpmnData.startsWith('<')) {
        xml = new TextDecoder().decode(
          Uint8Array.from(atob(bpmnData), (c) => c.charCodeAt(0))
        );
      }

      // Parse XML and extract element IDs
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      // Get all BPMN flow nodes (tasks, events, gateways, etc.)
      const ids: string[] = [];
      const selectors = [
        'task', 'serviceTask', 'userTask', 'scriptTask', 'sendTask', 'receiveTask',
        'manualTask', 'businessRuleTask', 'callActivity',
        'startEvent', 'endEvent', 'intermediateThrowEvent', 'intermediateCatchEvent',
        'boundaryEvent',
        'exclusiveGateway', 'parallelGateway', 'inclusiveGateway', 'eventBasedGateway',
        'subProcess', 'transaction',
      ];

      selectors.forEach(selector => {
        // Try with bpmn: prefix and without
        doc.querySelectorAll(`bpmn\\:${selector}, ${selector}`).forEach(el => {
          const id = el.getAttribute('id');
          if (id) ids.push(id);
        });
      });

      return ids.sort();
    } catch {
      return [];
    }
  };

  // Fetch process definition
  useEffect(() => {
    if (!processDefinitionKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch process definition
        // Note: Cast to unknown then number to preserve precision for large int64 keys
        // The URL interpolation works correctly with strings, avoiding JS number precision loss
        const data = await getProcessDefinition((processDefinitionKey as unknown) as number);
        setProcessDefinition(data as ProcessDefinition);

        // Extract activity IDs from BPMN data
        if (data.bpmnData) {
          const ids = extractActivityIds(data.bpmnData);
          setActivityIds(ids);
        }

        // Fetch all versions for this process
        if (data.bpmnProcessId) {
          try {
            const versionsData = await getProcessDefinitions({ bpmnProcessId: data.bpmnProcessId, page: 1, size: 100 });
            const items = (versionsData.items || []) as VersionInfo[];
            items.sort((a, b) => b.version - a.version);
            setVersions(items);
          } catch {
            // Versions fetch is not critical
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load process definition');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [processDefinitionKey, refreshKey]);

  // Handlers
  const handleVersionChange = useCallback(
    (key: string) => {
      // Reset selected activity and navigate to new version
      setSelectedActivityId(undefined);
      navigate(`/process-definitions/${key}`);
    },
    [navigate]
  );

  const handleElementClick = useCallback((elementId: string) => {
    // Just update local state - the table will pick it up via selectedActivityId prop
    setSelectedActivityId(elementId);
  }, []);

  const handleActivityFilterChange = useCallback((activityId: string | undefined) => {
    // Sync diagram highlight with filter - when filter is cleared, unhighlight
    setSelectedActivityId(activityId);
  }, []);

  const handleStartInstance = useCallback(() => {
    setStartDialogOpen(true);
  }, []);

  const handleStartDialogClose = useCallback(() => {
    setStartDialogOpen(false);
  }, []);

  const handleInstanceCreated = useCallback((instanceKey: number) => {
    setSnackbar({
      open: true,
      message: t('processes:messages.instanceCreated'),
      key: String(instanceKey),
    });
    setRefreshKey((k) => k + 1);
  }, [t]);

  const handleEditDefinition = useCallback(() => {
    navigate(`/designer/process/${processDefinitionKey}`);
  }, [navigate, processDefinitionKey]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar({ open: false, message: '' });
  }, []);

  // Build additional metadata fields (must be before early returns to follow rules of hooks)
  const additionalFields = useMemo((): MetadataField[] => {
    if (!processDefinition) return [];

    return [
      {
        label: t('processes:fields.bpmnProcessId'),
        value: processDefinition.bpmnProcessId,
      },
    ];
  }, [processDefinition, t]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !processDefinition) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Process definition not found'}</Alert>
      </Box>
    );
  }

  // Metadata content using MetadataPanel
  const metadataContent = (
    <MetadataPanel
      entityKey={processDefinition.key}
      name={processDefinition.bpmnProcessName}
      version={processDefinition.version}
      versions={versions}
      resourceName={processDefinition.bpmnResourceName}
      additionalFields={additionalFields}
      onVersionChange={handleVersionChange}
    />
  );

  // Diagram content
  const diagramContent = processDefinition.bpmnData ? (
    <BpmnDiagram
      diagramData={processDefinition.bpmnData}
      elementStatistics={elementStatistics}
      onElementClick={handleElementClick}
      selectedElement={selectedActivityId}
    />
  ) : (
    <Box
      sx={{
        height: { xs: 200, sm: 300, md: 400 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        borderRadius: 1,
      }}
    >
      <Typography color="text.secondary">
        {t('processes:detail.noDiagram')}
      </Typography>
    </Box>
  );

  // Bottom section (instances table)
  const instancesContent = (
    <ProcessInstancesTable
      processDefinitionKey={processDefinitionKey}
      activityIds={activityIds}
      refreshKey={refreshKey}
      selectedActivityId={selectedActivityId}
      onActivityFilterChange={handleActivityFilterChange}
      syncWithUrl
    />
  );

  // Floating action buttons
  const floatingActions = (
    <>
      <Tooltip title={t('processes:actions.startInstance')}>
        <Fab
          color="primary"
          onClick={handleStartInstance}
          size={isMobile ? 'medium' : 'large'}
        >
          <PlayArrowIcon />
        </Fab>
      </Tooltip>
      <Tooltip title={t('processes:actions.editDefinition')}>
        <Fab
          color="primary"
          onClick={handleEditDefinition}
          size={isMobile ? 'medium' : 'large'}
        >
          <EditIcon />
        </Fab>
      </Tooltip>
    </>
  );

  return (
    <>
      <DiagramDetailLayout
        leftSection={metadataContent}
        leftTitle={t('processes:detail.metadata')}
        rightSection={diagramContent}
        rightTitle={t('processes:detail.diagram')}
        bottomSection={instancesContent}
        bottomTitle={t('processes:detail.instances')}
        floatingActions={floatingActions}
      />

      {/* Start Instance Dialog */}
      <StartInstanceDialog
        open={startDialogOpen}
        onClose={handleStartDialogClose}
        processDefinitionKey={processDefinition.key}
        processName={processDefinition.bpmnProcessName || processDefinition.bpmnProcessId}
        onSuccess={handleInstanceCreated}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={
          <Box>
            {snackbar.message}
            {snackbar.key && (
              <Link
                component="button"
                sx={{ ml: 1, color: 'inherit', textDecoration: 'underline' }}
                onClick={() => navigate(`/process-instances/${snackbar.key}`)}
              >
                {t('processes:actions.viewInstance')}
              </Link>
            )}
          </Box>
        }
      />
    </>
  );
};
