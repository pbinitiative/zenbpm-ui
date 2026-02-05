import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { UpdateRetriesDialog, type UpdateRetriesDialogProps } from './UpdateRetriesDialog';

const UPDATE_RETRIES_DIALOG_ID = 'update-retries-dialog';

export function useUpdateRetriesDialog() {
  const { openModal, closeModal } = useModal<UpdateRetriesDialogProps>(
    UPDATE_RETRIES_DIALOG_ID,
    UpdateRetriesDialog
  );

  const openUpdateRetriesDialog = useCallback(
    (props: Omit<UpdateRetriesDialogProps, 'open' | 'onClose'>) => {
      openModal({
        ...props,
        onUpdate: async (jobKey, retries) => {
          void (props.onUpdate as (jobKey: string, retries: number) => Promise<void>)?.(jobKey, retries);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openUpdateRetriesDialog, closeUpdateRetriesDialog: closeModal };
}
