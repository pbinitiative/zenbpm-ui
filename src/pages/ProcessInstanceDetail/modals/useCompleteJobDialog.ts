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
      // Form completion is independent of BPMN element type and job type — a
      // truthy `inputVariables.ZEN_FORM` is the sole signal that the dialog
      // should be the form-based variant.
      const hasZenForm = !!props.job.inputVariables?.ZEN_FORM;

      if (hasZenForm) {
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
