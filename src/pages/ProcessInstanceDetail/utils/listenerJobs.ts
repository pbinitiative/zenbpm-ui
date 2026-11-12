import type { Job } from '../types';

/**
 * The engine marks the job of an execution listener with the listener's event
 * type and leaves the field out for an element's own job, so its presence
 * alone tells the two apart: both carry the id, the type and the element
 * instance key of the same element. A listener job cannot throw a BPMN error,
 * nobody is assigned to it, and the variables sent with its completion stay
 * inside its element. A `null` or empty value, which no engine sends, counts
 * as absent, so that it never turns an element's own job into a listener job.
 */
export const isListenerJob = <J extends Pick<Job, 'listenerEventType'>>(
  job: J,
): job is J & { listenerEventType: NonNullable<Job['listenerEventType']> } =>
  !!job.listenerEventType;
