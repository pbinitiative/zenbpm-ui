// OpenAPI schemas extracted for validation
// These are derived from /Users/marcel/work/pbi/git/zenbpm/openapi/api.yaml

export const schemas = {
  // Page metadata
  PageMetadata: {
    type: 'object',
    required: ['page', 'size', 'count', 'totalCount'],
    properties: {
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
  },

  PartitionedPageMetadata: {
    type: 'object',
    required: ['page', 'size', 'count', 'totalCount'],
    properties: {
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
  },

  // Process Definition schemas
  ProcessDefinitionSimple: {
    type: 'object',
    required: ['key', 'version', 'bpmnProcessId'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' },
      version: { type: 'integer' },
      bpmnProcessId: { type: 'string' },
      name: { type: 'string' },
      bpmnResourceName: { type: 'string' },
    },
  },

  ProcessDefinitionDetail: {
    type: 'object',
    required: ['key', 'version', 'bpmnProcessId', 'bpmnData'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' },
      version: { type: 'integer' },
      bpmnProcessId: { type: 'string' },
      name: { type: 'string' },
      bpmnResourceName: { type: 'string' },
      bpmnData: { type: 'string' },
    },
  },

  ProcessDefinitionsPage: {
    type: 'object',
    required: ['items', 'page', 'size', 'count', 'totalCount'],
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/$defs/ProcessDefinitionSimple' },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
    $defs: {
      ProcessDefinitionSimple: {
        type: 'object',
        required: ['key', 'version', 'bpmnProcessId'],
        properties: {
          key: { type: 'string', pattern: '^\\d{15,25}$' },
          version: { type: 'integer' },
          bpmnProcessId: { type: 'string' },
          name: { type: 'string' },
          bpmnResourceName: { type: 'string' },
        },
      },
    },
  },

  // Element Statistics (map of elementId to counts)
  ElementStatistics: {
    type: 'object',
    additionalProperties: {
      type: 'object',
      required: ['activeCount', 'incidentCount'],
      properties: {
        activeCount: { type: 'integer' },
        incidentCount: { type: 'integer' },
      },
    },
  },

  // Process Definition Statistics
  ProcessDefinitionStatistics: {
    type: 'object',
    required: ['key', 'version', 'bpmnProcessId', 'instanceCounts', 'incidentCounts'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' }, // String to avoid JS number precision loss
      version: { type: 'integer' },
      bpmnProcessId: { type: 'string' },
      name: { type: 'string' },
      bpmnResourceName: { type: 'string' },
      instanceCounts: {
        type: 'object',
        required: ['total', 'active', 'completed', 'terminated', 'failed'],
        properties: {
          total: { type: 'integer' },
          active: { type: 'integer' },
          completed: { type: 'integer' },
          terminated: { type: 'integer' },
          failed: { type: 'integer' },
        },
      },
      incidentCounts: {
        type: 'object',
        required: ['total', 'unresolved'],
        properties: {
          total: { type: 'integer' },
          unresolved: { type: 'integer' },
        },
      },
    },
  },

  // Process Definition Statistics Page - paginated response with statistics for each definition
  // Note: Keys can be strings (after json-bigint parsing) or numbers
  ProcessDefinitionStatisticsPage: {
    type: 'object',
    required: ['items', 'page', 'size', 'count', 'totalCount'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['key', 'version', 'bpmnProcessId', 'instanceCounts', 'incidentCounts'],
          properties: {
            key: { type: ['number', 'string'] },
            version: { type: 'number' },
            bpmnProcessId: { type: 'string' },
            name: { type: 'string' },
            bpmnResourceName: { type: 'string' },
            instanceCounts: {
              type: 'object',
              required: ['total', 'active', 'completed', 'terminated', 'failed'],
              properties: {
                total: { type: 'number' },
                active: { type: 'number' },
                completed: { type: 'number' },
                terminated: { type: 'number' },
                failed: { type: 'number' },
              },
            },
            incidentCounts: {
              type: 'object',
              required: ['total', 'unresolved'],
              properties: {
                total: { type: 'number' },
                unresolved: { type: 'number' },
              },
            },
          },
        },
      },
      page: { type: 'number' },
      size: { type: 'number' },
      count: { type: 'number' },
      totalCount: { type: 'number' },
    },
  },

  // Process Instance schemas
  ElementInstance: {
    type: 'object',
    required: ['elementInstanceKey', 'createdAt', 'state', 'elementId'],
    properties: {
      elementInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
      createdAt: { type: 'string', format: 'date-time' },
      state: { type: 'string' },
      elementId: { type: 'string' },
    },
  },

  ProcessInstance: {
    type: 'object',
    required: ['key', 'processDefinitionKey', 'createdAt', 'state', 'variables', 'activeElementInstances'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' },
      processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
      bpmnProcessId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      state: { type: 'string', enum: ['active', 'completed', 'terminated', 'failed'] },
      parentProcessInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
      variables: { type: 'object' },
      activeElementInstances: {
        type: 'array',
        items: { $ref: '#/$defs/ElementInstance' },
      },
    },
    $defs: {
      ElementInstance: {
        type: 'object',
        required: ['elementInstanceKey', 'createdAt', 'state', 'elementId'],
        properties: {
          elementInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
          createdAt: { type: 'string', format: 'date-time' },
          state: { type: 'string' },
          elementId: { type: 'string' },
        },
      },
    },
  },

  ProcessInstancePage: {
    type: 'object',
    required: ['partitions', 'page', 'size', 'count', 'totalCount'],
    properties: {
      partitions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['partition', 'items'],
          properties: {
            partition: { type: 'integer' },
            count: { type: 'integer' },
            items: {
              type: 'array',
              items: { $ref: '#/$defs/ProcessInstance' },
            },
          },
        },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
    $defs: {
      ProcessInstance: {
        type: 'object',
        required: ['key', 'processDefinitionKey', 'createdAt', 'state', 'variables', 'activeElementInstances'],
        properties: {
          key: { type: 'string', pattern: '^\\d{15,25}$' },
          processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
          bpmnProcessId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          state: { type: 'string', enum: ['active', 'completed', 'terminated', 'failed'] },
          variables: { type: 'object' },
          activeElementInstances: {
            type: 'array',
            items: { $ref: '#/$defs/ElementInstance' },
          },
        },
      },
      ElementInstance: {
        type: 'object',
        required: ['elementInstanceKey', 'createdAt', 'state', 'elementId'],
        properties: {
          elementInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
          createdAt: { type: 'string', format: 'date-time' },
          state: { type: 'string' },
          elementId: { type: 'string' },
        },
      },
    },
  },

  // Job schemas
  Job: {
    type: 'object',
    required: ['key', 'elementId', 'type', 'processInstanceKey', 'state', 'createdAt', 'variables'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' },
      elementId: { type: 'string' },
      elementName: { type: 'string' },
      type: { type: 'string' },
      processInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
      processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
      state: { type: 'string', enum: ['active', 'completed', 'terminated', 'failed'] },
      createdAt: { type: 'string', format: 'date-time' },
      completedAt: { type: 'string', format: 'date-time' },
      variables: { type: 'object' },
    },
  },

  JobPage: {
    type: 'object',
    required: ['items', 'page', 'size', 'count', 'totalCount'],
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/$defs/Job' },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
    $defs: {
      Job: {
        type: 'object',
        required: ['key', 'elementId', 'type', 'processInstanceKey', 'state', 'createdAt', 'variables'],
        properties: {
          key: { type: 'string', pattern: '^\\d{15,25}$' },
          elementId: { type: 'string' },
          elementName: { type: 'string' },
          type: { type: 'string' },
          processInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
          processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
          state: { type: 'string', enum: ['active', 'completed', 'terminated', 'failed'] },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
          variables: { type: 'object' },
        },
      },
    },
  },

  JobPartitionPage: {
    type: 'object',
    required: ['partitions', 'page', 'size', 'count', 'totalCount'],
    properties: {
      partitions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['partition', 'items'],
          properties: {
            partition: { type: 'integer' },
            count: { type: 'integer' },
            items: {
              type: 'array',
              items: { $ref: '#/$defs/Job' },
            },
          },
        },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
    $defs: {
      Job: {
        type: 'object',
        required: ['key', 'elementId', 'type', 'processInstanceKey', 'state', 'createdAt', 'variables'],
        properties: {
          key: { type: 'string', pattern: '^\\d{15,25}$' },
          elementId: { type: 'string' },
          elementName: { type: 'string' },
          type: { type: 'string' },
          processInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
          processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
          state: { type: 'string', enum: ['active', 'completed', 'terminated', 'failed'] },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
          variables: { type: 'object' },
        },
      },
    },
  },

  // Incident schemas
  Incident: {
    type: 'object',
    required: ['key', 'elementInstanceKey', 'elementId', 'processInstanceKey', 'message', 'createdAt', 'executionToken'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' },
      elementInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
      elementId: { type: 'string' },
      processInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
      processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
      message: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      resolvedAt: { type: 'string', format: 'date-time' },
      executionToken: { type: 'string' },
    },
  },

  IncidentPage: {
    type: 'object',
    required: ['items', 'page', 'size', 'count', 'totalCount'],
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/$defs/Incident' },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
    $defs: {
      Incident: {
        type: 'object',
        required: ['key', 'elementInstanceKey', 'elementId', 'processInstanceKey', 'message', 'createdAt', 'executionToken'],
        properties: {
          key: { type: 'string', pattern: '^\\d{15,25}$' },
          elementInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
          elementId: { type: 'string' },
          processInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
          processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
          message: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          resolvedAt: { type: 'string', format: 'date-time' },
          executionToken: { type: 'string' },
        },
      },
    },
  },

  // Global Incidents Partition Page - partitioned response for global incidents list
  IncidentPartitionPage: {
    type: 'object',
    required: ['partitions', 'page', 'size', 'count', 'totalCount'],
    properties: {
      partitions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['partition', 'items'],
          properties: {
            partition: { type: 'integer' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['key', 'elementInstanceKey', 'elementId', 'processInstanceKey', 'message', 'createdAt', 'executionToken'],
                properties: {
                  key: { type: 'string', pattern: '^\\d{15,25}$' },
                  elementInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
                  elementId: { type: 'string' },
                  processInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
                  processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
                  bpmnProcessId: { type: 'string' },
                  errorType: { type: 'string' },
                  message: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  resolvedAt: { type: 'string', format: 'date-time' },
                  executionToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
  },

  // History schemas
  FlowElementHistory: {
    type: 'object',
    required: ['key', 'processInstanceKey', 'createdAt', 'elementId'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' },
      processInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
      createdAt: { type: 'string', format: 'date-time' },
      elementId: { type: 'string' },
      elementType: { type: 'string' },
      state: { type: 'string' },
      completedAt: { type: 'string', format: 'date-time' },
    },
  },

  FlowElementHistoryPage: {
    type: 'object',
    required: ['items', 'page', 'size', 'count', 'totalCount'],
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/$defs/FlowElementHistory' },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
    $defs: {
      FlowElementHistory: {
        type: 'object',
        required: ['key', 'processInstanceKey', 'createdAt', 'elementId'],
        properties: {
          key: { type: 'string', pattern: '^\\d{15,25}$' },
          processInstanceKey: { type: 'string', pattern: '^\\d{15,25}$' },
          createdAt: { type: 'string', format: 'date-time' },
          elementId: { type: 'string' },
          elementType: { type: 'string' },
          state: { type: 'string' },
          completedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  // Decision Definition schemas
  DecisionDefinitionSimple: {
    type: 'object',
    required: ['key', 'version', 'decisionDefinitionId'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' },
      version: { type: 'integer' },
      decisionDefinitionId: { type: 'string' },
      name: { type: 'string' },
    },
  },

  DecisionDefinitionDetail: {
    type: 'object',
    required: ['key', 'version', 'decisionDefinitionId', 'dmnData'],
    properties: {
      key: { type: 'string', pattern: '^\\d{15,25}$' },
      version: { type: 'integer' },
      decisionDefinitionId: { type: 'string' },
      name: { type: 'string' },
      dmnData: { type: 'string' },
    },
  },

  DecisionDefinitionsPage: {
    type: 'object',
    required: ['items', 'page', 'size', 'count', 'totalCount'],
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/$defs/DecisionDefinitionSimple' },
      },
      page: { type: 'integer' },
      size: { type: 'integer' },
      count: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
    $defs: {
      DecisionDefinitionSimple: {
        type: 'object',
        required: ['key', 'version', 'decisionDefinitionId'],
        properties: {
          key: { type: 'string', pattern: '^\\d{15,25}$' },
          version: { type: 'integer' },
          decisionDefinitionId: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  },

  // Partition counts schema (for count endpoints)
  PartitionCounts: {
    type: 'object',
    required: ['partitions', 'totalCount'],
    properties: {
      partitions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['partition', 'count'],
          properties: {
            partition: { type: 'integer' },
            count: { type: 'integer' },
          },
        },
      },
      totalCount: { type: 'integer' },
    },
  },

  // Error schema
  Error: {
    type: 'object',
    required: ['code', 'message'],
    properties: {
      code: { type: 'string' },
      message: { type: 'string' },
    },
  },

  // Request schemas
  CreateProcessInstanceRequest: {
    type: 'object',
    required: ['processDefinitionKey'],
    properties: {
      processDefinitionKey: { type: 'string', pattern: '^\\d{15,25}$' },
      variables: { type: 'object' },
      historyTimeToLive: { type: 'string' },
    },
  },

  CompleteJobRequest: {
    type: 'object',
    required: ['jobKey'],
    properties: {
      jobKey: { type: 'string', pattern: '^\\d{15,25}$' },
      variables: { type: 'object' },
    },
  },

  PublishMessageRequest: {
    type: 'object',
    required: ['correlationKey', 'messageName'],
    properties: {
      correlationKey: { type: 'string', pattern: '^\\d{15,25}$' },
      messageName: { type: 'string' },
      variables: { type: 'object' },
    },
  },

  EvaluateDecisionRequest: {
    type: 'object',
    required: ['bindingType'],
    properties: {
      bindingType: { type: 'string', enum: ['latest', 'deployment', 'versionTag'] },
      decisionDefinitionId: { type: 'string' },
      versionTag: { type: 'string' },
      variables: { type: 'object' },
    },
  },
} as const;

// Map endpoints to their request/response schemas
export const endpointSchemas: Record<string, { request?: string; response?: string }> = {
  // Process Definitions
  'GET /v1/process-definitions': { response: 'ProcessDefinitionsPage' },
  'GET /v1/process-definitions/statistics': { response: 'ProcessDefinitionStatisticsPage' },
  'GET /v1/process-definitions/:key': { response: 'ProcessDefinitionDetail' },
  'GET /v1/process-definitions/:key/statistics': { response: 'ElementStatistics' },
  'POST /v1/process-definitions': { response: 'ProcessDefinitionSimple' },

  // Process Instances
  'GET /v1/process-instances': { response: 'ProcessInstancePage' },
  'GET /v1/process-instances/:key': { response: 'ProcessInstance' },
  'POST /v1/process-instances': { request: 'CreateProcessInstanceRequest', response: 'ProcessInstance' },
  'GET /v1/process-instances/:key/jobs': { response: 'JobPage' },
  'GET /v1/process-instances/:key/incidents': { response: 'IncidentPage' },
  'GET /v1/process-instances/:key/history': { response: 'FlowElementHistoryPage' },

  // Jobs
  'GET /v1/jobs': { response: 'JobPartitionPage' },
  'POST /v1/jobs': { request: 'CompleteJobRequest' },

  // Incidents
  'GET /v1/incidents': { response: 'IncidentPartitionPage' },
  'POST /v1/incidents/:key/resolve': {},

  // Decision Definitions
  'GET /v1/decision-definitions': { response: 'DecisionDefinitionsPage' },
  'GET /v1/decision-definitions/:key': { response: 'DecisionDefinitionDetail' },
  'POST /v1/decision-definitions': { response: 'DecisionDefinitionSimple' },
  'POST /v1/decisions/:id/evaluate': { request: 'EvaluateDecisionRequest' },

  // Messages
  'POST /v1/messages': { request: 'PublishMessageRequest' },
};
