import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Link,
  Snackbar,
  Button,
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

  const metadataActions = (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PlayArrowIcon />}
        onClick={handleStartInstance}
        sx={{ justifyContent: 'flex-start' }}
        data-testid="process-definition-start-instance-button"
      >
        {t('processes:actions.startInstance')}
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<EditIcon />}
        onClick={handleEditDefinition}
        sx={{ justifyContent: 'flex-start' }}
        data-testid="process-definition-edit-button"
      >
        {t('processes:actions.editDefinition')}
      </Button>
    </>
  );

  const metadataContent = (
    <MetadataPanel
      entityKey={processDefinition.key}
      name={processDefinition.bpmnProcessName}
      version={processDefinition.version}
      versions={versions}
      resourceName={processDefinition.bpmnResourceName}
      additionalFields={additionalFields}
      onVersionChange={handleVersionChange}
      actions={metadataActions}
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
      syncWithUrl
      selectedActivityId={selectedActivityId}
      onActivityFilterChange={handleActivityFilterChange}
    />
  );

  return (
    <Box data-testid="process-definition-detail-page">
      <DiagramDetailLayout
        leftSection={metadataContent}
        leftTitle={t('processes:detail.metadata')}
        rightSection={diagramContent}
        rightTitle={t('processes:detail.diagram')}
        bottomSection={instancesContent}
        bottomTitle={t('processes:detail.instances')}
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
    </Box>
  );
};
