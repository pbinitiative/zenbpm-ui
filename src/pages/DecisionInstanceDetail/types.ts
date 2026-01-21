import type { EvaluatedDecision } from '@base/openapi';

export interface DmnResourceDefinition {
  key: string;
  version: number;
  dmnResourceDefinitionId: string;
  dmnDefinitionName: string;
  dmnData?: string;
}

export interface EvaluatedDecisionExtended extends EvaluatedDecision {
  inputs?: Array<{ inputId?: string; inputName?: string; inputValue?: unknown }>;
  outputs?: Array<{ outputId?: string; outputName?: string; outputValue?: unknown }>;
  matchedRules?: Array<{
    ruleId?: string;
    ruleIndex?: number;
    evaluatedOutputs?: Array<{ outputId?: string; outputName?: string; outputValue?: unknown }>;
  }>;
}

export interface OverlayDialogData {
  decisionId: string;
  inputs: Array<{ name: string; value: unknown }>;
  outputs: Array<{ name: string; value: unknown }>;
}
