import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DmnViewer, type DecisionOverlay } from '@components/DmnViewer';
import { DiagramDetailLayout, MetadataPanel } from '@components/DiagramDetailLayout';
import type { MetadataField, DefinitionInfo } from '@components/DiagramDetailLayout';
import { getDecisionInstance, getDmnResourceDefinition } from '@base/openapi';
import type { DecisionInstanceDetail, EvaluatedDecision } from '@base/openapi';

interface DmnResourceDefinition {
  key: number;
  version: number;
  dmnResourceDefinitionId: string;
  name?: string;
  resourceName?: string;
  dmnData?: string;
}

interface EvaluatedDecisionExtended extends EvaluatedDecision {
  inputs?: Array<{ inputId?: string; inputName?: string; inputValue?: unknown }>;
  outputs?: Array<{ outputId?: string; outputName?: string; outputValue?: unknown }>;
  matchedRules?: Array<{ ruleId?: string; ruleIndex?: number; evaluatedOutputs?: Array<{ outputId?: string; outputName?: string; outputValue?: unknown }> }>;
}

interface OverlayDialogData {
  decisionId: string;
  inputs: Array<{ name: string; value: unknown }>;
  outputs: Array<{ name: string; value: unknown }>;
}

export const DecisionInstanceDetailPage = () => {
  const { decisionInstanceKey } = useParams<{ decisionInstanceKey: string }>();
  const { t } = useTranslation([ns.common, ns.decisions]);

  // State
  const [instance, setInstance] = useState<DecisionInstanceDetail | null>(null);
  const [definition, setDefinition] = useState<DmnResourceDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogData, setDialogData] = useState<OverlayDialogData | null>(null);
  const [showOutputDialog, setShowOutputDialog] = useState(false);

  // Fetch instance and DMN data
  useEffect(() => {
    if (!decisionInstanceKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getDecisionInstance(decisionInstanceKey as unknown as number);
        setInstance(data);

        // Fetch DMN definition to get diagram and definition details
        if (data.dmnResourceDefinitionKey) {
          try {
            const dmnDef = await getDmnResourceDefinition(data.dmnResourceDefinitionKey);
            setDefinition(dmnDef);
          } catch {
            // DMN fetch is not critical
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load decision instance');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [decisionInstanceKey]);

  // Handle overlay click to show modal
  const handleOverlayClick = useCallback((decisionId: string, inputs: Array<{ name: string; value: unknown }>, outputs: Array<{ name: string; value: unknown }>) => {
    setDialogData({ decisionId, inputs, outputs });
  }, []);

  // Create overlays for the DMN diagram with input/output data
  const diagramOverlays = useMemo((): DecisionOverlay[] => {
    if (!instance?.evaluatedDecisions) return [];
    return instance.evaluatedDecisions.map((d) => {
      const extended = d as EvaluatedDecisionExtended;
      return {
        decisionId: d.decisionId || '',
        evaluated: true,
        hasMatchedRules: (d.matchedRules && d.matchedRules.length > 0) || false,
        inputs: extended.inputs?.map(i => ({
          name: i.inputName || i.inputId || 'input',
          value: i.inputValue,
        })) || [],
        outputs: extended.outputs?.map(o => ({
          name: o.outputName || o.outputId || 'output',
          value: o.outputValue,
        })) || [],
        matchedRuleIndices: extended.matchedRules
          ?.map(r => r.ruleIndex)
          .filter((idx): idx is number => idx !== undefined) || [],
      };
    });
  }, [instance]);

  // Build additional metadata fields for main section (must be before early returns to follow rules of hooks)
  const additionalFields = useMemo((): MetadataField[] => {
    if (!instance) return [];

    const fields: MetadataField[] = [];

    // Evaluated At
    if (instance.evaluatedAt) {
      fields.push({
        label: t('decisions:fields.evaluatedAt'),
        value: new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(instance.evaluatedAt)),
      });
    }

    // Output
    if (instance.decisionOutput) {
      fields.push({
        label: t('decisions:fields.output'),
        value: (
          <Box
            onClick={() => setShowOutputDialog(true)}
            component="code"
            sx={{
              display: 'block',
              px: 1,
              py: 0.5,
              bgcolor: 'success.light',
              color: 'success.dark',
              borderRadius: 1,
              fontSize: '0.75rem',
              fontFamily: '"SF Mono", Monaco, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 },
            }}
          >
            {JSON.stringify(instance.decisionOutput)}
          </Box>
        ),
      });
    }

    return fields;
  }, [instance, t, setShowOutputDialog]);

  // Build definition info (just key and type for the link)
  const definitionInfo = useMemo((): DefinitionInfo | undefined => {
    if (!instance?.dmnResourceDefinitionKey) return undefined;

    return {
      key: instance.dmnResourceDefinitionKey,
      type: 'decision',
    };
  }, [instance?.dmnResourceDefinitionKey]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || !instance) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || t('common:errors.decisionInstanceNotFound')}</Alert>
      </Box>
    );
  }

  // Find decision name for dialog title
  const getDecisionName = (decisionId: string) => {
    const decision = instance.evaluatedDecisions?.find(d => d.decisionId === decisionId);
    return decision?.decisionName || decisionId;
  };

  // Metadata content using MetadataPanel
  const metadataContent = (
    <MetadataPanel
      entityKey={instance.key ?? ''}
      definitionInfo={definitionInfo}
      name={definition?.name}
      version={definition?.version}
      resourceName={definition?.resourceName}
      processInstanceKey={instance.processInstanceKey}
      additionalFields={additionalFields}
      keyLabel={t('decisions:fields.key')}
    />
  );

  // Diagram content
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
      <Typography color="text.secondary">
        {t('decisions:detail.noDiagram')}
      </Typography>
    </Box>
  );

  return (
    <>
      <DiagramDetailLayout
        leftSection={metadataContent}
        leftTitle={t('decisions:detail.metadata')}
        rightSection={diagramContent}
        rightTitle={t('decisions:detail.diagram')}
      />

      {/* Output Dialog */}
      <Dialog
        open={showOutputDialog}
        onClose={() => setShowOutputDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            {t('decisions:instance.finalOutput')}
          </Typography>
          <IconButton onClick={() => setShowOutputDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box
            component="pre"
            sx={{
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: '"SF Mono", Monaco, monospace',
              m: 0,
            }}
          >
            {JSON.stringify(instance.decisionOutput, null, 2)}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Input/Output Dialog */}
      <Dialog
        open={dialogData !== null}
        onClose={() => setDialogData(null)}
        maxWidth="md"
        fullWidth
      >
        {dialogData && (
          <>
            <DialogTitle sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
            }}>
              <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                {getDecisionName(dialogData.decisionId)}
              </Typography>
              <IconButton onClick={() => setDialogData(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                {/* Inputs */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{
                    p: 2,
                    bgcolor: 'info.light',
                    borderRadius: 2,
                    height: '100%',
                  }}>
                    <Typography variant="subtitle2" sx={{
                      fontWeight: 600,
                      color: 'info.dark',
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}>
                      <Box sx={{ width: 12, height: 12, bgcolor: 'info.main', borderRadius: '2px' }} />
                      {t('decisions:instance.inputs')}
                    </Typography>
                    {dialogData.inputs.length > 0 ? (
                      <Box
                        component="pre"
                        sx={{
                          p: 1.5,
                          bgcolor: 'white',
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.8rem',
                          fontFamily: '"SF Mono", Monaco, monospace',
                          m: 0,
                          maxHeight: 300,
                        }}
                      >
                        {JSON.stringify(
                          dialogData.inputs.reduce((acc, item) => {
                            acc[item.name] = item.value;
                            return acc;
                          }, {} as Record<string, unknown>),
                          null,
                          2
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{t('decisions:instance.noInputs')}</Typography>
                    )}
                  </Box>
                </Grid>
                {/* Outputs */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{
                    p: 2,
                    bgcolor: 'success.light',
                    borderRadius: 2,
                    height: '100%',
                  }}>
                    <Typography variant="subtitle2" sx={{
                      fontWeight: 600,
                      color: 'success.dark',
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}>
                      <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '2px' }} />
                      {t('decisions:instance.outputs')}
                    </Typography>
                    {dialogData.outputs.length > 0 ? (
                      <Box
                        component="pre"
                        sx={{
                          p: 1.5,
                          bgcolor: 'white',
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.8rem',
                          fontFamily: '"SF Mono", Monaco, monospace',
                          m: 0,
                          maxHeight: 300,
                        }}
                      >
                        {JSON.stringify(
                          dialogData.outputs.reduce((acc, item) => {
                            acc[item.name] = item.value;
                            return acc;
                          }, {} as Record<string, unknown>),
                          null,
                          2
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{t('decisions:instance.noOutputs')}</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
};
