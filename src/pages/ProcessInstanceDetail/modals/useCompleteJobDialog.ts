import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { CompleteJobDialog, type CompleteJobDialogProps } from './CompleteJobDialog';

const COMPLETE_JOB_DIALOG_ID = 'complete-job-dialog';

export function useCompleteJobDialog() {
  const { openModal, closeModal } = useModal<CompleteJobDialogProps>(
    COMPLETE_JOB_DIALOG_ID,
    CompleteJobDialog
  );

  const openCompleteJobDialog = useCallback(
    (props: Omit<CompleteJobDialogProps, 'open' | 'onClose'>) => {
      openModal({
        ...props,
        onComplete: async (jobKey: string, variables: Record<string, unknown>) => {
          void (props.onComplete as (jobKey: string, variables: Record<string, unknown>) => Promise<void>)?.(jobKey, variables);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openCompleteJobDialog, closeCompleteJobDialog: closeModal };
}
