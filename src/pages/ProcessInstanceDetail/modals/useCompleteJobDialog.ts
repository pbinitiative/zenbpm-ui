import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { CompleteJobDialog, type CompleteJobDialogProps } from './CompleteJobDialog';
import { CompleteFormJobDialog, type CompleteFormJobDialogProps } from './CompleteFormJobDialog';
import type { Job } from '../types';

const COMPLETE_JOB_DIALOG_ID = 'complete-job-dialog';
const COMPLETE_FORM_JOB_DIALOG_ID = 'complete-form-job-dialog';

interface OpenCompleteJobDialogProps {
  job: Job;
  onComplete: (jobKey: string, variables: Record<string, unknown>) => Promise<void>;
}

export function useCompleteJobDialog() {
  const { openModal: openJobModal, closeModal: closeJobModal } = useModal<CompleteJobDialogProps>(
    COMPLETE_JOB_DIALOG_ID,
    CompleteJobDialog
  );

  const { openModal: openFormJobModal, closeModal: closeFormJobModal } = useModal<CompleteFormJobDialogProps>(
    COMPLETE_FORM_JOB_DIALOG_ID,
    CompleteFormJobDialog
  );

  const openCompleteJobDialog = useCallback(
    (props: OpenCompleteJobDialogProps) => {
      const isUserTaskWithForm =
        props.job.type === 'user-task-type' && !!props.job.variables?.ZEN_FORM;

      if (isUserTaskWithForm) {
        openFormJobModal({
          job: props.job,
          onComplete: async (jobKey: string, variables: Record<string, unknown>) => {
            await props.onComplete(jobKey, variables);
            closeFormJobModal();
          },
        });
      } else {
        openJobModal({
          job: props.job,
          onComplete: async (jobKey: string, variables: Record<string, unknown>) => {
            await props.onComplete(jobKey, variables);
            closeJobModal();
          },
        });
      }
    },
    [openJobModal, closeJobModal, openFormJobModal, closeFormJobModal]
  );

  return { openCompleteJobDialog };
}
