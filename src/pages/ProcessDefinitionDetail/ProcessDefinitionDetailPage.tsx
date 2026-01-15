import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
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
import { StartInstanceDialog } from '@components/StartInstanceDialog';
import { ProcessInstancesTable } from '@components/ProcessInstancesTable';
import { useProcessDefinitionData } from './hooks';

export const ProcessDefinitionDetailPage = () => {
  const { processDefinitionKey } = useParams<{ processDefinitionKey: string }>();
  const { t } = useTranslation([ns.common, ns.processes]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    processDefinition,
    versions,
    activityIds,
    loading,
    error,
    elementStatistics,
    selectedActivityId,
    startDialogOpen,
    snackbar,
    additionalFields,
    refreshKey,
    handleVersionChange,
    handleElementClick,
    handleActivityFilterChange,
    handleStartInstance,
    handleStartDialogClose,
    handleInstanceCreated,
    handleEditDefinition,
    handleSnackbarClose,
    navigateToInstance,
  } = useProcessDefinitionData({ processDefinitionKey });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !processDefinition) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || t('common:errors.processDefinitionNotFound')}</Alert>
      </Box>
    );
  }

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
        bgcolor: 'grey.100',
        borderRadius: 1,
      }}
    >
      <Typography color="text.secondary">{t('processes:detail.noDiagram')}</Typography>
    </Box>
  );

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

  const floatingActions = (
    <>
      <Tooltip title={t('processes:actions.startInstance')}>
        <Fab color="primary" onClick={handleStartInstance} size={isMobile ? 'medium' : 'large'}>
          <PlayArrowIcon />
        </Fab>
      </Tooltip>
      <Tooltip title={t('processes:actions.editDefinition')}>
        <Fab color="primary" onClick={handleEditDefinition} size={isMobile ? 'medium' : 'large'}>
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

      <StartInstanceDialog
        open={startDialogOpen}
        onClose={handleStartDialogClose}
        processDefinitionKey={processDefinition.key}
        processName={processDefinition.bpmnProcessName || processDefinition.bpmnProcessId}
        onSuccess={handleInstanceCreated}
      />

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
                onClick={() => snackbar.key && navigateToInstance(snackbar.key)}
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
