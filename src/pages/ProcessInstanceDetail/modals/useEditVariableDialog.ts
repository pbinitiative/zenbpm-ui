import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { EditVariableDialog, type EditVariableDialogProps } from './EditVariableDialog';

const EDIT_VARIABLE_DIALOG_ID = 'edit-variable-dialog';

export function useEditVariableDialog() {
  const { openModal, closeModal } = useModal<EditVariableDialogProps>(
    EDIT_VARIABLE_DIALOG_ID,
    EditVariableDialog
  );

  const openEditVariableDialog = useCallback(
    (props: Omit<EditVariableDialogProps, 'open' | 'onClose'>) => {
      openModal({
        ...props,
        onSave: async (name: string, value: unknown, instanceKey: string) => {
          void (props.onSave as (name: string, value: unknown, instanceKey: string) => Promise<void>)?.(name, value, instanceKey);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openEditVariableDialog, closeEditVariableDialog: closeModal };
}
