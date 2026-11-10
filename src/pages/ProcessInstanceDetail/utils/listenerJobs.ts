import type { Job } from '../types';

/**
 * The engine marks the job of an execution listener with the listener's event
 * type and leaves the field out for the job of a task, so its presence alone
 * tells the two apart. A listener job cannot throw a BPMN error, and the
 * variables sent with its completion stay on the job. A `null` or empty value,
 * which no engine sends, counts as absent, so that it never turns a task's job
 * into a listener job.
 */
export const isListenerJob = <J extends Pick<Job, 'listenerEventType'>>(
  job: J,
): job is J & { listenerEventType: NonNullable<Job['listenerEventType']> } =>
  !!job.listenerEventType;
