import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { AssignJobDialog, type AssignJobDialogProps } from './AssignJobDialog';

const ASSIGN_JOB_DIALOG_ID = 'assign-job-dialog';

export function useAssignJobDialog() {
  const { openModal, closeModal } = useModal<AssignJobDialogProps>(
    ASSIGN_JOB_DIALOG_ID,
    AssignJobDialog
  );

  const openAssignJobDialog = useCallback(
    (props: Omit<AssignJobDialogProps, 'open' | 'onClose'>) => {
      openModal({
        ...props,
        onAssign: async (jobKey: string, assignee: string) => {
          void (props.onAssign as (jobKey: string, assignee: string) => Promise<void>)?.(jobKey, assignee);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openAssignJobDialog, closeAssignJobDialog: closeModal };
}
