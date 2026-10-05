import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { FailJobDialog, type FailJobDialogProps, type FailJobRequest } from './FailJobDialog';
import type { Job } from '../types';

const FAIL_JOB_DIALOG_ID = 'fail-job-dialog';

interface OpenFailJobDialogProps {
  job: Job;
  onFail: (jobKey: string, request: FailJobRequest) => Promise<void>;
}

export function useFailJobDialog() {
  const { openModal, closeModal } = useModal<FailJobDialogProps>(
    FAIL_JOB_DIALOG_ID,
    FailJobDialog
  );

  const openFailJobDialog = useCallback(
    (props: OpenFailJobDialogProps) => {
      openModal({
        job: props.job,
        onFail: async (jobKey: string, request: FailJobRequest) => {
          await props.onFail(jobKey, request);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openFailJobDialog, closeFailJobDialog: closeModal };
}
