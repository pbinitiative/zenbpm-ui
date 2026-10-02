import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { JobFailuresDialog, type JobFailuresDialogProps } from './JobFailuresDialog';

const JOB_FAILURES_DIALOG_ID = 'job-failures-dialog';

export function useJobFailuresDialog() {
  const { openModal, closeModal } = useModal<JobFailuresDialogProps>(
    JOB_FAILURES_DIALOG_ID,
    JobFailuresDialog
  );

  const openJobFailuresDialog = useCallback(
    (props: Omit<JobFailuresDialogProps, 'open' | 'onClose'>) => {
      openModal(props);
    },
    [openModal]
  );

  return { openJobFailuresDialog, closeJobFailuresDialog: closeModal };
}
