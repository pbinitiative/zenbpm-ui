import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { FailJobDialog, type FailJobDialogProps } from './FailJobDialog';
import type { Job } from '../types';

const FAIL_JOB_DIALOG_ID = 'fail-job-dialog';

interface OpenFailJobDialogProps {
  job: Job;
  onFail: (
    jobKey: string,
    errorCode: string | undefined,
    variables: Record<string, unknown> | undefined
  ) => Promise<void>;
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
        onFail: async (
          jobKey: string,
          errorCode: string | undefined,
          variables: Record<string, unknown> | undefined
        ) => {
          await props.onFail(jobKey, errorCode, variables);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openFailJobDialog, closeFailJobDialog: closeModal };
}
