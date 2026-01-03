// MSW handlers for decision instances endpoints
import { http, HttpResponse } from 'msw';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

// Mock decision instances matching DecisionInstanceSummary schema
// Using realistic data based on sport.dmn and can-autoliquidate-rule.dmn test cases
interface MockDecisionInstance {
  key: string;
  dmnResourceDefinitionKey: string;
  dmnResourceDefinitionId: string;
  processInstanceKey?: string;
  flowElementInstanceKey?: string;
  evaluatedAt: string;
  inputCount?: number;
  outputCount?: number;
  // Full evaluation data for detail view
  evaluatedDecisions: Array<{
    decisionId: string;
    decisionName: string;
    decisionType: string;
    evaluationOrder: number;
    inputs: Array<{ inputId: string; inputName: string; inputValue: unknown }>;
    outputs: Array<{ outputId: string; outputName: string; outputValue: unknown }>;
    matchedRules: Array<{ ruleId: string; ruleIndex: number }>;
  }>;
  decisionOutput: Record<string, unknown>;
}

const decisionInstances: MockDecisionInstance[] = [
  // Sport decision instances - based on sport.results.yml test cases
  {
    key: '4100000000000000001',
    dmnResourceDefinitionKey: '4000000000000000001',
    dmnResourceDefinitionId: 'drd_sports',
    processInstanceKey: '3100000000000000020',
    evaluatedAt: '2024-01-15T10:30:00Z',
    inputCount: 2,
    outputCount: 1,
    evaluatedDecisions: [
      {
        decisionId: 'location',
        decisionName: 'Location',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 1,
        inputs: [{ inputId: 'InputClause_0jms81j', inputName: 'weather', inputValue: 'bad' }],
        outputs: [{ outputId: 'OutputClause_0bsor1g', outputName: 'location', outputValue: 'indoor' }],
        matchedRules: [{ ruleId: 'DecisionRule_165n4nx', ruleIndex: 1 }],
      },
      {
        decisionId: 'sport',
        decisionName: 'Sport',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 2,
        inputs: [
          { inputId: 'Input_1', inputName: 'equipment', inputValue: 'racket' },
          { inputId: 'InputClause_1e9jmc5', inputName: 'location', inputValue: 'indoor' },
        ],
        outputs: [{ outputId: 'Output_1', outputName: 'sport', outputValue: 'squash' }],
        matchedRules: [{ ruleId: 'DecisionRule_1nszbio', ruleIndex: 0 }],
      },
    ],
    decisionOutput: { sport: 'squash' },
  },
  {
    key: '4100000000000000002',
    dmnResourceDefinitionKey: '4000000000000000001',
    dmnResourceDefinitionId: 'drd_sports',
    processInstanceKey: '3100000000000000021',
    evaluatedAt: '2024-01-15T11:00:00Z',
    inputCount: 2,
    outputCount: 1,
    evaluatedDecisions: [
      {
        decisionId: 'location',
        decisionName: 'Location',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 1,
        inputs: [{ inputId: 'InputClause_0jms81j', inputName: 'weather', inputValue: 'good' }],
        outputs: [{ outputId: 'OutputClause_0bsor1g', outputName: 'location', outputValue: 'outdoor' }],
        matchedRules: [{ ruleId: 'DecisionRule_13tngwo', ruleIndex: 0 }],
      },
      {
        decisionId: 'sport',
        decisionName: 'Sport',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 2,
        inputs: [
          { inputId: 'Input_1', inputName: 'equipment', inputValue: 'racket' },
          { inputId: 'InputClause_1e9jmc5', inputName: 'location', inputValue: 'outdoor' },
        ],
        outputs: [{ outputId: 'Output_1', outputName: 'sport', outputValue: 'tennis' }],
        matchedRules: [{ ruleId: 'DecisionRule_03lep47', ruleIndex: 1 }],
      },
    ],
    decisionOutput: { sport: 'tennis' },
  },
  {
    key: '4100000000000000003',
    dmnResourceDefinitionKey: '4000000000000000001',
    dmnResourceDefinitionId: 'drd_sports',
    processInstanceKey: '3100000000000000027',
    evaluatedAt: '2024-01-14T09:15:00Z',
    inputCount: 2,
    outputCount: 1,
    evaluatedDecisions: [
      {
        decisionId: 'location',
        decisionName: 'Location',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 1,
        inputs: [{ inputId: 'InputClause_0jms81j', inputName: 'weather', inputValue: 'bad' }],
        outputs: [{ outputId: 'OutputClause_0bsor1g', outputName: 'location', outputValue: 'indoor' }],
        matchedRules: [{ ruleId: 'DecisionRule_165n4nx', ruleIndex: 1 }],
      },
      {
        decisionId: 'sport',
        decisionName: 'Sport',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 2,
        inputs: [
          { inputId: 'Input_1', inputName: 'equipment', inputValue: 'club' },
          { inputId: 'InputClause_1e9jmc5', inputName: 'location', inputValue: 'indoor' },
        ],
        outputs: [{ outputId: 'Output_1', outputName: 'sport', outputValue: 'minigolf' }],
        matchedRules: [{ ruleId: 'DecisionRule_0vthd5c', ruleIndex: 2 }],
      },
    ],
    decisionOutput: { sport: 'minigolf' },
  },
  {
    key: '4100000000000000004',
    dmnResourceDefinitionKey: '4000000000000000001',
    dmnResourceDefinitionId: 'drd_sports',
    processInstanceKey: '3100000000000000028',
    evaluatedAt: '2024-01-13T14:45:00Z',
    inputCount: 2,
    outputCount: 1,
    evaluatedDecisions: [
      {
        decisionId: 'location',
        decisionName: 'Location',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 1,
        inputs: [{ inputId: 'InputClause_0jms81j', inputName: 'weather', inputValue: 'good' }],
        outputs: [{ outputId: 'OutputClause_0bsor1g', outputName: 'location', outputValue: 'outdoor' }],
        matchedRules: [{ ruleId: 'DecisionRule_13tngwo', ruleIndex: 0 }],
      },
      {
        decisionId: 'sport',
        decisionName: 'Sport',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 2,
        inputs: [
          { inputId: 'Input_1', inputName: 'equipment', inputValue: 'club' },
          { inputId: 'InputClause_1e9jmc5', inputName: 'location', inputValue: 'outdoor' },
        ],
        outputs: [{ outputId: 'Output_1', outputName: 'sport', outputValue: 'golf' }],
        matchedRules: [{ ruleId: 'DecisionRule_07alh1e', ruleIndex: 3 }],
      },
    ],
    decisionOutput: { sport: 'golf' },
  },
  // Clothes decision instance - cold weather outdoor
  {
    key: '4100000000000000005',
    dmnResourceDefinitionKey: '4000000000000000001',
    dmnResourceDefinitionId: 'drd_sports',
    processInstanceKey: '3100000000000000031',
    evaluatedAt: '2024-01-12T16:20:00Z',
    inputCount: 2,
    outputCount: 4,
    evaluatedDecisions: [
      {
        decisionId: 'location',
        decisionName: 'Location',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 1,
        inputs: [{ inputId: 'InputClause_0jms81j', inputName: 'weather', inputValue: 'good' }],
        outputs: [{ outputId: 'OutputClause_0bsor1g', outputName: 'location', outputValue: 'outdoor' }],
        matchedRules: [{ ruleId: 'DecisionRule_13tngwo', ruleIndex: 0 }],
      },
      {
        decisionId: 'clothes',
        decisionName: 'Clothes',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 2,
        inputs: [
          { inputId: 'InputClause_04bybxl', inputName: 'location', inputValue: 'outdoor' },
          { inputId: 'InputClause_0u2bd4a', inputName: 'Temperature', inputValue: 'cold' },
        ],
        outputs: [
          { outputId: 'OutputClause_006erms', outputName: 'shoes', outputValue: 'Boots' },
          { outputId: 'OutputClause_1v73xal', outputName: 'top', outputValue: 'Sweater' },
          { outputId: 'OutputClause_1grr946', outputName: 'bottom', outputValue: 'Pants' },
          { outputId: 'OutputClause_077tcf0', outputName: 'hat', outputValue: 'Hat' },
        ],
        matchedRules: [{ ruleId: 'DecisionRule_1kfsnaw', ruleIndex: 1 }],
      },
    ],
    decisionOutput: { shoes: 'Boots', top: 'Sweater', bottom: 'Pants', hat: 'Hat' },
  },
  // Auto Liquidation instances
  {
    key: '4100000000000000006',
    dmnResourceDefinitionKey: '4000000000000000003',
    dmnResourceDefinitionId: 'example_canAutoLiquidate',
    processInstanceKey: '3100000000000000042',
    evaluatedAt: '2024-01-11T08:30:00Z',
    inputCount: 2,
    outputCount: 1,
    evaluatedDecisions: [
      {
        decisionId: 'example_canAutoLiquidateRule',
        decisionName: 'Decision of auto liquidation',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 1,
        inputs: [
          { inputId: 'Input_1', inputName: 'Value', inputValue: 15000 },
          { inputId: 'InputClause_137jnlm', inputName: 'Insurance Type', inputValue: 'MAJ' },
        ],
        outputs: [{ outputId: 'Output_1', outputName: 'canAutoLiquidate', outputValue: true }],
        matchedRules: [{ ruleId: 'DecisionRule_1k1p1ib', ruleIndex: 0 }],
      },
    ],
    decisionOutput: { canAutoLiquidate: true },
  },
  {
    key: '4100000000000000007',
    dmnResourceDefinitionKey: '4000000000000000003',
    dmnResourceDefinitionId: 'example_canAutoLiquidate',
    processInstanceKey: '3100000000000000043',
    evaluatedAt: '2024-01-10T15:45:00Z',
    inputCount: 2,
    outputCount: 1,
    evaluatedDecisions: [
      {
        decisionId: 'example_canAutoLiquidateRule',
        decisionName: 'Decision of auto liquidation',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 1,
        inputs: [
          { inputId: 'Input_1', inputName: 'Value', inputValue: 45000 },
          { inputId: 'InputClause_137jnlm', inputName: 'Insurance Type', inputValue: 'POV-HAV' },
        ],
        outputs: [{ outputId: 'Output_1', outputName: 'canAutoLiquidate', outputValue: true }],
        matchedRules: [{ ruleId: 'DecisionRule_1tnkvk6', ruleIndex: 1 }],
      },
    ],
    decisionOutput: { canAutoLiquidate: true },
  },
  {
    key: '4100000000000000008',
    dmnResourceDefinitionKey: '4000000000000000003',
    dmnResourceDefinitionId: 'example_canAutoLiquidate',
    processInstanceKey: '3100000000000000044',
    evaluatedAt: '2024-01-09T12:00:00Z',
    inputCount: 2,
    outputCount: 1,
    evaluatedDecisions: [
      {
        decisionId: 'example_canAutoLiquidateRule',
        decisionName: 'Decision of auto liquidation',
        decisionType: 'DECISION_TABLE',
        evaluationOrder: 1,
        inputs: [
          { inputId: 'Input_1', inputName: 'Value', inputValue: 75000 },
          { inputId: 'InputClause_137jnlm', inputName: 'Insurance Type', inputValue: 'MAJ' },
        ],
        outputs: [{ outputId: 'Output_1', outputName: 'canAutoLiquidate', outputValue: false }],
        matchedRules: [{ ruleId: 'DecisionRule_0sbgnlq', ruleIndex: 2 }],
      },
    ],
    decisionOutput: { canAutoLiquidate: false },
  },
];

export const decisionInstanceHandlers = [
  // GET /decision-instances - List decision instances (partitioned format)
  http.get(
    `${BASE_URL}/decision-instances`,
    withValidation(({ request }) => {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const dmnResourceDefinitionKey = url.searchParams.get('dmnResourceDefinitionKey');

      // Filter by dmnResourceDefinitionKey if provided
      let filtered = decisionInstances;
      if (dmnResourceDefinitionKey) {
        filtered = decisionInstances.filter(di => di.dmnResourceDefinitionKey === dmnResourceDefinitionKey);
      }

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = filtered.slice(startIndex, endIndex);

      // Map to summary format (without full evaluation data)
      const items = paginatedItems.map(({ key, dmnResourceDefinitionKey, dmnResourceDefinitionId, processInstanceKey, evaluatedAt, inputCount, outputCount }) => ({
        key,
        dmnResourceDefinitionKey,
        dmnResourceDefinitionId,
        processInstanceKey,
        evaluatedAt,
        inputCount,
        outputCount,
      }));

      // Return in partitioned format (single partition for mock)
      return HttpResponse.json({
        partitions: [
          {
            partition: 1,
            count: items.length,
            items,
          },
        ],
        page,
        size,
        count: items.length,
        totalCount: filtered.length,
      });
    })
  ),

  // GET /decision-instances/:decisionInstanceKey - Get single decision instance
  http.get(
    `${BASE_URL}/decision-instances/:decisionInstanceKey`,
    withValidation(({ params }) => {
      const { decisionInstanceKey } = params;
      const instance = decisionInstances.find(
        (di) => di.key === decisionInstanceKey
      );

      if (!instance) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Decision instance with key ${decisionInstanceKey} not found`,
          },
          { status: 404 }
        );
      }

      // Return detailed decision instance with evaluated decisions
      return HttpResponse.json({
        key: instance.key,
        dmnResourceDefinitionKey: instance.dmnResourceDefinitionKey,
        dmnResourceDefinitionId: instance.dmnResourceDefinitionId,
        processInstanceKey: instance.processInstanceKey,
        evaluatedAt: instance.evaluatedAt,
        inputCount: instance.inputCount,
        outputCount: instance.outputCount,
        dmnResourceDefinitionVersion: 1,
        decisionRequirementsKey: instance.dmnResourceDefinitionKey,
        decisionRequirementsId: instance.dmnResourceDefinitionId,
        evaluatedDecisions: instance.evaluatedDecisions,
        decisionOutput: instance.decisionOutput,
      });
    })
  ),
];
