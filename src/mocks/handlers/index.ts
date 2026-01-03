// Combine all MSW handlers
import { processDefinitionHandlers } from './processDefinitions';
import { processInstanceHandlers } from './processInstances';
import { jobHandlers } from './jobs';
import { incidentHandlers } from './incidents';
import { decisionDefinitionHandlers } from './decisionDefinitions';
import { decisionInstanceHandlers } from './decisionInstances';
import { messageHandlers } from './messages';
import { clusterHandlers } from './cluster';

export const handlers = [
  ...processDefinitionHandlers,
  ...processInstanceHandlers,
  ...jobHandlers,
  ...incidentHandlers,
  ...decisionDefinitionHandlers,
  ...decisionInstanceHandlers,
  ...messageHandlers,
  ...clusterHandlers,
];
