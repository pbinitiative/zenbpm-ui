// Re-export generated API hooks and types
// This file provides a clean interface to the generated API

// Schemas (types)
export * from './generated-api/schemas';

// API hooks by domain
export * from './generated-api/process-instance/process-instance';
export * from './generated-api/process-definition/process-definition';
export * from './generated-api/incident/incident';
export * from './generated-api/job/job';
export * from './generated-api/decision-definition/decision-definition';
export * from './generated-api/message/message';
export * from './generated-api/migration/migration';
export * from './generated-api/dmn-resource-definition/dmn-resource-definition';
export * from './generated-api/decision-instance/decision-instance';

// Axios instance for custom requests
export { AXIOS_INSTANCE, customInstance } from './axios-instance';
