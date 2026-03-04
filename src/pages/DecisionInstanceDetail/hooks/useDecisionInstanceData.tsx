import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { getDecisionInstance, getDmnResourceDefinition } from '@base/openapi';
import type { DecisionInstanceDetail } from '@base/openapi';
import type { DecisionOverlay } from '@components/DmnViewer';
import type { MetadataField, DefinitionInfo } from '@components/DiagramDetailLayout';
import { useInputOutputDialog } from '../components/useInputOutputDialog';
import { useOutputDialog } from '../components/useOutputDialog';
import type { DmnResourceDefinition, EvaluatedDecisionExtended } from '../types';
import { Box } from '@mui/material';

interface UseDecisionInstanceDataResult {
  instance: DecisionInstanceDetail | null;
  definition: DmnResourceDefinition | null;
  loading: boolean;
  error: string | null;
  diagramOverlays: DecisionOverlay[];
  additionalFields: MetadataField[];
  definitionInfo: DefinitionInfo | undefined;
  handleOverlayClick: (
    decisionId: string,
    inputs: Array<{ name: string; value: unknown }>,
    outputs: Array<{ name: string; value: unknown }>
  ) => void;
  getDecisionName: (decisionId: string) => string;
}

export function useDecisionInstanceData(decisionInstanceKey: string | undefined): UseDecisionInstanceDataResult {
  const { t } = useTranslation([ns.common, ns.decisions]);
  const { openInputOutputDialog } = useInputOutputDialog();
  const { openOutputDialog } = useOutputDialog();

  // State
  const [instance, setInstance] = useState<DecisionInstanceDetail | null>(null);
  const [definition, setDefinition] = useState<DmnResourceDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch instance and DMN data
  useEffect(() => {
    if (!decisionInstanceKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getDecisionInstance(decisionInstanceKey);
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

    void fetchData();
  }, [decisionInstanceKey]);

  // Find decision name for dialog title
  const getDecisionName = useCallback(
    (decisionId: string) => {
      const decision = instance?.evaluatedDecisions?.find((d) => d.decisionId === decisionId);
      return decision?.decisionName || decisionId;
    },
    [instance]
  );

  // Handle overlay click to show modal
  const handleOverlayClick = useCallback(
    (decisionId: string, inputs: Array<{ name: string; value: unknown }>, outputs: Array<{ name: string; value: unknown }>) => {
      openInputOutputDialog({ data: { decisionId, inputs, outputs }, getDecisionName });
    },
    [openInputOutputDialog, getDecisionName]
  );

  // Create overlays for the DMN diagram with input/output data
  const diagramOverlays = useMemo((): DecisionOverlay[] => {
    if (!instance?.evaluatedDecisions) return [];
    return instance.evaluatedDecisions.map((d) => {
      const extended = d as EvaluatedDecisionExtended;
      return {
        decisionId: d.decisionId || '',
        evaluated: true,
        hasMatchedRules: (d.matchedRules && d.matchedRules.length > 0) || false,
        inputs:
          extended.inputs?.map((i) => ({
            name: i.inputName || i.inputId || 'input',
            value: i.inputValue,
          })) || [],
        outputs: (() => {
          // Use direct outputs if available (e.g. Literal Expression decisions)
          if (extended.outputs && extended.outputs.length > 0) {
            return extended.outputs.map((o) => ({
              name: o.outputName || o.outputId || 'output',
              value: o.outputValue,
            }));
          }
          // Fall back to outputs from matched rules (Decision Tables)
          if (extended.matchedRules && extended.matchedRules.length > 0) {
            return extended.matchedRules.flatMap((rule) =>
              (rule.evaluatedOutputs || []).map((o) => ({
                name: o.outputName || o.outputId || 'output',
                value: o.outputValue,
              })),
            );
          }
          return [];
        })(),
        matchedRuleIndices:
          extended.matchedRules
            ?.map((r) => r.ruleIndex)
            .filter((idx): idx is number => idx !== undefined)
            .map((idx) => idx - 1) || [],
      };
    });
  }, [instance]);

  // Build additional metadata fields for main section
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
            onClick={() => openOutputDialog({ output: instance.decisionOutput })}
            component="code"
            sx={{
              display: 'block',
              px: 1,
              py: 0.5,
              bgcolor: 'success.light',
              color: 'success.dark',
              borderRadius: 1,
              fontSize: '0.75rem',
              fontFamily: 'monospace',
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
  }, [instance, t, openOutputDialog]);

  // Build definition info
  const definitionInfo = useMemo((): DefinitionInfo | undefined => {
    if (!instance?.dmnResourceDefinitionKey) return undefined;

    return {
      key: instance.dmnResourceDefinitionKey,
      type: 'decision',
    };
  }, [instance?.dmnResourceDefinitionKey]);

  return {
    instance,
    definition,
    loading,
    error,
    diagramOverlays,
    additionalFields,
    definitionInfo,
    handleOverlayClick,
    getDecisionName,
  };
}
