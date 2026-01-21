import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { DmnViewer } from '@components/DmnViewer';
import { DiagramDetailLayout, MetadataPanel } from '@components/DiagramDetailLayout';
import { useDecisionInstanceData } from './hooks';
import { OutputDialog, InputOutputDialog } from './components';

export const DecisionInstanceDetailPage = () => {
  const { decisionInstanceKey } = useParams<{ decisionInstanceKey: string }>();
  const { t } = useTranslation([ns.common, ns.decisions]);

  const {
    instance,
    definition,
    loading,
    error,
    diagramOverlays,
    additionalFields,
    definitionInfo,
    dialogData,
    showOutputDialog,
    setShowOutputDialog,
    handleOverlayClick,
    closeDialog,
    getDecisionName,
  } = useDecisionInstanceData(decisionInstanceKey);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !instance) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || t('common:errors.decisionInstanceNotFound')}</Alert>
      </Box>
    );
  }

  const metadataContent = (
    <MetadataPanel
      entityKey={instance.key ?? ''}
      definitionInfo={definitionInfo}
      name={definition?.dmnDefinitionName}
      version={definition?.version}
      processInstanceKey={instance.processInstanceKey}
      additionalFields={additionalFields}
      keyLabel={t('decisions:fields.key')}
    />
  );

  const diagramContent = definition?.dmnData ? (
    <DmnViewer
      diagramData={definition.dmnData}
      height={450}
      overlays={diagramOverlays}
      onOverlayClick={handleOverlayClick}
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
      <Typography color="text.secondary">{t('decisions:detail.noDiagram')}</Typography>
    </Box>
  );

  return (
    <Box data-testid="decision-instance-detail-page">
      <DiagramDetailLayout
        leftSection={metadataContent}
        leftTitle={t('decisions:detail.metadata')}
        rightSection={diagramContent}
        rightTitle={t('decisions:detail.diagram')}
      />

      <OutputDialog
        open={showOutputDialog}
        onClose={() => setShowOutputDialog(false)}
        output={instance.decisionOutput}
      />

      <InputOutputDialog data={dialogData} onClose={closeDialog} getDecisionName={getDecisionName} />
    </Box>
  );
};
