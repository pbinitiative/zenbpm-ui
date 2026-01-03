// Index file for all process data
// Exports definitions, instances, and incidents from per-process files

import type { MockProcessDefinition, MockProcessInstance, MockIncident } from '../types';

// Import all process data files
import * as callActivitySimple from './call-activity-simple';
import * as callActivityWithBoundarySimple from './call-activity-with-boundary-simple';
import * as callActivityWithMultipleBoundary from './call-activity-with-multiple-boundary';
import * as callActivityWithMultipleBoundaryUserTaskEnd from './call-activity-with-multiple-boundary-user-task-end';
import * as exclusiveGatewayMultipleTasks from './exclusive-gateway-multiple-tasks';
import * as exclusiveGatewayMultipleTasksNoDefault from './exclusive-gateway-multiple-tasks-no-default';
import * as exclusiveGatewayWithCondition from './exclusive-gateway-with-condition';
import * as exclusiveGatewayWithConditionAndDefault from './exclusive-gateway-with-condition-and-default';
import * as forkControlledExclusiveJoin from './fork-controlled-exclusive-join';
import * as forkControlledParallelJoin from './fork-controlled-parallel-join';
import * as forkUncontrolledJoin from './fork-uncontrolled-join';
import * as forkedFlow from './forked-flow';
import * as inclusiveGatewayMultipleTasks from './inclusive-gateway-multiple-tasks';
import * as inclusiveGatewayWithCondition from './inclusive-gateway-with-condition';
import * as inclusiveGatewayWithConditionAndDefault from './inclusive-gateway-with-condition-and-default';
import * as longTaskChain from './long-task-chain';
import * as messageEventBasedGateway from './message-EventBasedGateway';
import * as messageBoundaryEventInterrupting from './message-boundary-event-interrupting';
import * as messageBoundaryEventNoninterrupting from './message-boundary-event-noninterrupting';
import * as messageIntermediateCatchEvent from './message-intermediate-catch-event';
import * as messageIntermediateCatchEventAndParallelTasks from './message-intermediate-catch-event-and-parallel-tasks';
import * as messageIntermediateInvalidTimerEvent from './message-intermediate-invalid-timer-event';
import * as messageIntermediateTimerEvent from './message-intermediate-timer-event';
import * as messageMultipleIntermediateCatchEvents from './message-multiple-intermediate-catch-events';
import * as messageMultipleIntermediateCatchEventsExclusive from './message-multiple-intermediate-catch-events-exclusive';
import * as messageMultipleIntermediateCatchEventsMerged from './message-multiple-intermediate-catch-events-merged';
import * as messageMultipleIntermediateCatchEventsParallel from './message-multiple-intermediate-catch-events-parallel';
import * as parallelGatewayFlow from './parallel-gateway-flow';
import * as serviceTaskInputOutput from './service-task-input-output';
import * as serviceTaskInvalidInput from './service-task-invalid-input';
import * as serviceTaskInvalidOutput from './service-task-invalid-output';
import * as showcaseProcess from './showcase-process';
import * as simpleBusinessRuleTaskExternal from './simple-business-rule-task-external';
import * as simpleBusinessRuleTaskLocal from './simple-business-rule-task-local';
import * as simpleCountLoop from './simple-count-loop';
import * as simpleCountLoopWithMessage from './simple-count-loop-with-message';
import * as simpleIntermediateMessageCatchEvent from './simple-intermediate-message-catch-event';
import * as simpleIntermediateMessageCatchEventBroken from './simple-intermediate-message-catch-event-broken';
import * as simpleLinkEventBroken from './simple-link-event-broken';
import * as simpleLinkEventOutputVariables from './simple-link-event-output-variables';
import * as simpleLinkEvents from './simple-link-events';
import * as simpleTask from './simple-task';
import * as simpleTaskWithType from './simple-task-with-type';
import * as simpleUserTask from './simple-user-task';
import * as simpleTaskNoOutputMapping from './simple_task-no_output_mapping';
import * as simpleTaskWithOutputMapping from './simple_task-with_output_mapping';
import * as simpleTaskModifiedTaskId from './simple_task_modified_taskId';
import * as simpleTaskV2 from './simple_task_v2';
import * as timerBoundaryEventInterrupting from './timer-boundary-event-interrupting';
import * as userTasksWithAssignments from './user-tasks-with-assignments';

// Version 2 and 3 imports
import * as showcaseProcessV2 from './showcase-process_v2';
import * as showcaseProcessV3 from './showcase-process_v3';
import * as simpleUserTaskV2 from './simple-user-task_v2';
import * as longTaskChainV2 from './long-task-chain_v2';

// Export individual process modules for direct access
export {
  callActivitySimple,
  callActivityWithBoundarySimple,
  callActivityWithMultipleBoundary,
  callActivityWithMultipleBoundaryUserTaskEnd,
  exclusiveGatewayMultipleTasks,
  exclusiveGatewayMultipleTasksNoDefault,
  exclusiveGatewayWithCondition,
  exclusiveGatewayWithConditionAndDefault,
  forkControlledExclusiveJoin,
  forkControlledParallelJoin,
  forkUncontrolledJoin,
  forkedFlow,
  inclusiveGatewayMultipleTasks,
  inclusiveGatewayWithCondition,
  inclusiveGatewayWithConditionAndDefault,
  longTaskChain,
  messageEventBasedGateway,
  messageBoundaryEventInterrupting,
  messageBoundaryEventNoninterrupting,
  messageIntermediateCatchEvent,
  messageIntermediateCatchEventAndParallelTasks,
  messageIntermediateInvalidTimerEvent,
  messageIntermediateTimerEvent,
  messageMultipleIntermediateCatchEvents,
  messageMultipleIntermediateCatchEventsExclusive,
  messageMultipleIntermediateCatchEventsMerged,
  messageMultipleIntermediateCatchEventsParallel,
  parallelGatewayFlow,
  serviceTaskInputOutput,
  serviceTaskInvalidInput,
  serviceTaskInvalidOutput,
  showcaseProcess,
  simpleBusinessRuleTaskExternal,
  simpleBusinessRuleTaskLocal,
  simpleCountLoop,
  simpleCountLoopWithMessage,
  simpleIntermediateMessageCatchEvent,
  simpleIntermediateMessageCatchEventBroken,
  simpleLinkEventBroken,
  simpleLinkEventOutputVariables,
  simpleLinkEvents,
  simpleTask,
  simpleTaskWithType,
  simpleUserTask,
  simpleTaskNoOutputMapping,
  simpleTaskWithOutputMapping,
  simpleTaskModifiedTaskId,
  simpleTaskV2,
  timerBoundaryEventInterrupting,
  userTasksWithAssignments,
  // Version 2 and 3 exports
  showcaseProcessV2,
  showcaseProcessV3,
  simpleUserTaskV2,
  longTaskChainV2,
};

// Aggregate all definitions
export const allDefinitions: MockProcessDefinition[] = [
  callActivitySimple.definition,
  callActivityWithBoundarySimple.definition,
  callActivityWithMultipleBoundary.definition,
  callActivityWithMultipleBoundaryUserTaskEnd.definition,
  exclusiveGatewayMultipleTasks.definition,
  exclusiveGatewayMultipleTasksNoDefault.definition,
  exclusiveGatewayWithCondition.definition,
  exclusiveGatewayWithConditionAndDefault.definition,
  forkControlledExclusiveJoin.definition,
  forkControlledParallelJoin.definition,
  forkUncontrolledJoin.definition,
  forkedFlow.definition,
  inclusiveGatewayMultipleTasks.definition,
  inclusiveGatewayWithCondition.definition,
  inclusiveGatewayWithConditionAndDefault.definition,
  longTaskChain.definition,
  messageEventBasedGateway.definition,
  messageBoundaryEventInterrupting.definition,
  messageBoundaryEventNoninterrupting.definition,
  messageIntermediateCatchEvent.definition,
  messageIntermediateCatchEventAndParallelTasks.definition,
  messageIntermediateInvalidTimerEvent.definition,
  messageIntermediateTimerEvent.definition,
  messageMultipleIntermediateCatchEvents.definition,
  messageMultipleIntermediateCatchEventsExclusive.definition,
  messageMultipleIntermediateCatchEventsMerged.definition,
  messageMultipleIntermediateCatchEventsParallel.definition,
  parallelGatewayFlow.definition,
  serviceTaskInputOutput.definition,
  serviceTaskInvalidInput.definition,
  serviceTaskInvalidOutput.definition,
  showcaseProcess.definition,
  simpleBusinessRuleTaskExternal.definition,
  simpleBusinessRuleTaskLocal.definition,
  simpleCountLoop.definition,
  simpleCountLoopWithMessage.definition,
  simpleIntermediateMessageCatchEvent.definition,
  simpleIntermediateMessageCatchEventBroken.definition,
  simpleLinkEventBroken.definition,
  simpleLinkEventOutputVariables.definition,
  simpleLinkEvents.definition,
  simpleTask.definition,
  simpleTaskWithType.definition,
  simpleUserTask.definition,
  simpleTaskNoOutputMapping.definition,
  simpleTaskWithOutputMapping.definition,
  simpleTaskModifiedTaskId.definition,
  simpleTaskV2.definition,
  timerBoundaryEventInterrupting.definition,
  userTasksWithAssignments.definition,
  // Version 2 and 3 definitions
  showcaseProcessV2.definition,
  showcaseProcessV3.definition,
  simpleUserTaskV2.definition,
  longTaskChainV2.definition,
];

// Aggregate all instances
export const allInstances: MockProcessInstance[] = [
  ...callActivitySimple.instances,
  ...callActivityWithBoundarySimple.instances,
  ...callActivityWithMultipleBoundary.instances,
  ...callActivityWithMultipleBoundaryUserTaskEnd.instances,
  ...exclusiveGatewayMultipleTasks.instances,
  ...exclusiveGatewayMultipleTasksNoDefault.instances,
  ...exclusiveGatewayWithCondition.instances,
  ...exclusiveGatewayWithConditionAndDefault.instances,
  ...forkControlledExclusiveJoin.instances,
  ...forkControlledParallelJoin.instances,
  ...forkUncontrolledJoin.instances,
  ...forkedFlow.instances,
  ...inclusiveGatewayMultipleTasks.instances,
  ...inclusiveGatewayWithCondition.instances,
  ...inclusiveGatewayWithConditionAndDefault.instances,
  ...longTaskChain.instances,
  ...messageEventBasedGateway.instances,
  ...messageBoundaryEventInterrupting.instances,
  ...messageBoundaryEventNoninterrupting.instances,
  ...messageIntermediateCatchEvent.instances,
  ...messageIntermediateCatchEventAndParallelTasks.instances,
  ...messageIntermediateInvalidTimerEvent.instances,
  ...messageIntermediateTimerEvent.instances,
  ...messageMultipleIntermediateCatchEvents.instances,
  ...messageMultipleIntermediateCatchEventsExclusive.instances,
  ...messageMultipleIntermediateCatchEventsMerged.instances,
  ...messageMultipleIntermediateCatchEventsParallel.instances,
  ...parallelGatewayFlow.instances,
  ...serviceTaskInputOutput.instances,
  ...serviceTaskInvalidInput.instances,
  ...serviceTaskInvalidOutput.instances,
  ...showcaseProcess.instances,
  ...simpleBusinessRuleTaskExternal.instances,
  ...simpleBusinessRuleTaskLocal.instances,
  ...simpleCountLoop.instances,
  ...simpleCountLoopWithMessage.instances,
  ...simpleIntermediateMessageCatchEvent.instances,
  ...simpleIntermediateMessageCatchEventBroken.instances,
  ...simpleLinkEventBroken.instances,
  ...simpleLinkEventOutputVariables.instances,
  ...simpleLinkEvents.instances,
  ...simpleTask.instances,
  ...simpleTaskWithType.instances,
  ...simpleUserTask.instances,
  ...simpleTaskNoOutputMapping.instances,
  ...simpleTaskWithOutputMapping.instances,
  ...simpleTaskModifiedTaskId.instances,
  ...simpleTaskV2.instances,
  ...timerBoundaryEventInterrupting.instances,
  ...userTasksWithAssignments.instances,
  // Version 2 and 3 instances
  ...showcaseProcessV2.instances,
  ...showcaseProcessV3.instances,
  ...simpleUserTaskV2.instances,
  ...longTaskChainV2.instances,
];

// Aggregate all incidents
export const allIncidents: MockIncident[] = [
  ...callActivitySimple.incidents,
  ...callActivityWithBoundarySimple.incidents,
  ...callActivityWithMultipleBoundary.incidents,
  ...callActivityWithMultipleBoundaryUserTaskEnd.incidents,
  ...exclusiveGatewayMultipleTasks.incidents,
  ...exclusiveGatewayMultipleTasksNoDefault.incidents,
  ...exclusiveGatewayWithCondition.incidents,
  ...exclusiveGatewayWithConditionAndDefault.incidents,
  ...forkControlledExclusiveJoin.incidents,
  ...forkControlledParallelJoin.incidents,
  ...forkUncontrolledJoin.incidents,
  ...forkedFlow.incidents,
  ...inclusiveGatewayMultipleTasks.incidents,
  ...inclusiveGatewayWithCondition.incidents,
  ...inclusiveGatewayWithConditionAndDefault.incidents,
  ...longTaskChain.incidents,
  ...messageEventBasedGateway.incidents,
  ...messageBoundaryEventInterrupting.incidents,
  ...messageBoundaryEventNoninterrupting.incidents,
  ...messageIntermediateCatchEvent.incidents,
  ...messageIntermediateCatchEventAndParallelTasks.incidents,
  ...messageIntermediateInvalidTimerEvent.incidents,
  ...messageIntermediateTimerEvent.incidents,
  ...messageMultipleIntermediateCatchEvents.incidents,
  ...messageMultipleIntermediateCatchEventsExclusive.incidents,
  ...messageMultipleIntermediateCatchEventsMerged.incidents,
  ...messageMultipleIntermediateCatchEventsParallel.incidents,
  ...parallelGatewayFlow.incidents,
  ...serviceTaskInputOutput.incidents,
  ...serviceTaskInvalidOutput.incidents,
  ...serviceTaskInvalidInput.incidents,
  ...showcaseProcess.incidents,
  ...simpleBusinessRuleTaskExternal.incidents,
  ...simpleBusinessRuleTaskLocal.incidents,
  ...simpleCountLoop.incidents,
  ...simpleCountLoopWithMessage.incidents,
  ...simpleIntermediateMessageCatchEvent.incidents,
  ...simpleIntermediateMessageCatchEventBroken.incidents,
  ...simpleLinkEventBroken.incidents,
  ...simpleLinkEventOutputVariables.incidents,
  ...simpleLinkEvents.incidents,
  ...simpleTask.incidents,
  ...simpleTaskWithType.incidents,
  ...simpleUserTask.incidents,
  ...simpleTaskNoOutputMapping.incidents,
  ...simpleTaskWithOutputMapping.incidents,
  ...simpleTaskModifiedTaskId.incidents,
  ...simpleTaskV2.incidents,
  ...timerBoundaryEventInterrupting.incidents,
  ...userTasksWithAssignments.incidents,
  // Version 2 and 3 incidents
  ...showcaseProcessV2.incidents,
  ...showcaseProcessV3.incidents,
  ...simpleUserTaskV2.incidents,
  ...longTaskChainV2.incidents,
];
