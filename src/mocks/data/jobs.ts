// Mock data for jobs (user tasks and service tasks)
// Jobs are now primarily defined in individual process files and aggregated here

import * as simpleTask from './bpmn/simple-task';
import * as showcaseProcess from './bpmn/showcase-process';
import * as simpleUserTask from './bpmn/simple-user-task';
import * as simpleBusinessRuleTaskExternal from './bpmn/simple-business-rule-task-external';
import * as userTasksWithAssignments from './bpmn/user-tasks-with-assignments';

export interface MockJob {
  key: string;
  elementId: string;
  elementName?: string;
  type: string;
  processInstanceKey: string;
  processDefinitionKey: string;
  state: 'active' | 'activatable' | 'activated' | 'completed' | 'failed' | 'canceled';
  createdAt: string;
  completedAt?: string;
  variables: Record<string, unknown>;
  assignee?: string;
  candidateGroups?: string[];
  candidateUsers?: string[];
  dueDate?: string;
  followUpDate?: string;
  retries?: number;
  errorMessage?: string;
}

// Helper to generate dates
const hoursAgo = (hours: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

const hoursFromNow = (hours: number): string => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
};

// Legacy jobs for backward compatibility (with existing process instance keys that don't have history yet)
const legacyJobs: MockJob[] = [
  // Note: Loan Application job 4097302399374458881 for processInstanceKey 2097302399374458881
  // is now defined in showcase-process.ts (that instance uses showcase-process definition)
  {
    key: '5000000000000000011',
    elementId: 'Task_Approval',
    elementName: 'Final Approval',
    type: 'user-task',
    processInstanceKey: '3100000000000000021',
    processDefinitionKey: '1997302399374458880',
    state: 'active',
    createdAt: hoursAgo(3),
    variables: {
      formKey: 'loan-approval-form',
      customerId: 'CUST-002',
      customerName: 'Jane Doe',
      loanAmount: 25000,
      creditScore: 750,
      recommendation: 'approve',
    },
    candidateGroups: ['loan-managers'],
    dueDate: hoursFromNow(48),
  },
  {
    key: '5000000000000000012',
    elementId: 'Task_CreditCheck',
    elementName: 'Credit Check',
    type: 'service-task',
    processInstanceKey: '3100000000000000022',
    processDefinitionKey: '1997302399374458880',
    state: 'completed',
    createdAt: hoursAgo(26),
    completedAt: hoursAgo(25),
    variables: {
      creditScore: 820,
      creditReport: 'excellent',
    },
  },

  // User Task Assignment jobs
  {
    key: '5000000000000000002',
    elementId: 'Task_Manager',
    elementName: 'Manager Review',
    type: 'user-task',
    processInstanceKey: '3100000000000000002',
    processDefinitionKey: '1997302353098702848',
    state: 'active',
    createdAt: hoursAgo(3),
    variables: {
      employeeId: 'EMP-001',
      employeeName: 'Sarah Johnson',
      requestType: 'vacation',
    },
    candidateGroups: ['managers'],
    candidateUsers: ['manager.smith'],
    dueDate: hoursFromNow(72),
  },
  {
    key: '5000000000000000003',
    elementId: 'Task_HR',
    elementName: 'HR Verification',
    type: 'user-task',
    processInstanceKey: '3100000000000000003',
    processDefinitionKey: '1997302353098702848',
    state: 'active',
    createdAt: hoursAgo(6),
    variables: {
      employeeId: 'EMP-002',
      employeeName: 'Mike Davis',
      requestType: 'equipment',
      itemRequested: 'Laptop',
    },
    assignee: 'hr.admin',
    candidateGroups: ['hr-team'],
    dueDate: hoursFromNow(24),
  },

  // Customer Onboarding jobs
  {
    key: '5000000000000000001',
    elementId: 'Task_1',
    elementName: 'Process Task',
    type: 'service-task',
    processInstanceKey: '3100000000000000001',
    processDefinitionKey: '1997302186542891008',
    state: 'failed',
    createdAt: hoursAgo(1),
    variables: {
      customerId: 'NEW-001',
      customerName: 'Tech Corp Inc.',
    },
    retries: 0,
    errorMessage: 'Failed to connect to external CRM system: Connection timeout after 30s. The remote server at crm.example.com:443 is not responding.',
  },

  // Order Processing jobs
  {
    key: '5000000000000000004',
    elementId: 'Task_1',
    elementName: 'Process Task',
    type: 'service-task',
    processInstanceKey: '3100000000000000004',
    processDefinitionKey: '1997302376817491968',
    state: 'active',
    createdAt: hoursAgo(4),
    variables: {
      orderId: 'ORD-2024-001',
      orderTotal: 299.99,
    },
  },
];

// Aggregate jobs from process files
export const jobs: MockJob[] = [
  ...legacyJobs,
  ...(simpleTask.jobs as MockJob[]),
  ...(showcaseProcess.jobs as MockJob[]),
  ...(simpleUserTask.jobs as MockJob[]),
  ...(simpleBusinessRuleTaskExternal.jobs as MockJob[]),
  ...(userTasksWithAssignments.jobs as MockJob[]),
];

// Helper to get user tasks only
export const getUserTasks = (): MockJob[] => {
  return jobs.filter((j) => j.type === 'user-task');
};

// Helper to get active user tasks
export const getActiveUserTasks = (): MockJob[] => {
  return jobs.filter((j) => j.type === 'user-task' && j.state === 'active');
};

// Helper to get jobs by process instance key
export const getJobsByProcessInstanceKey = (processInstanceKey: string): MockJob[] => {
  return jobs.filter((j) => j.processInstanceKey === processInstanceKey);
};

// Helper to find job by key
export const findJobByKey = (key: string): MockJob | undefined => {
  return jobs.find((j) => j.key === key);
};

// Helper to get jobs by state
export const getJobsByState = (state: MockJob['state']): MockJob[] => {
  return jobs.filter((j) => j.state === state);
};

// Helper to get jobs by type
export const getJobsByType = (type: string): MockJob[] => {
  return jobs.filter((j) => j.type === type);
};
