import type { Job } from '../types';

/**
 * The engine marks the job of an execution listener with the listener's event
 * type and leaves the field out for the job of a task, so its presence alone
 * tells the two apart. A listener job cannot throw a BPMN error, and the
 * variables sent with its completion stay on the job.
 */
export const isListenerJob = (job: Pick<Job, 'listenerEventType'>): boolean =>
  job.listenerEventType !== undefined;
