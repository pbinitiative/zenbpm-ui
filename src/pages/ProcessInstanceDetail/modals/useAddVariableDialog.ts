import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { AddVariableDialog, type AddVariableDialogProps } from './AddVariableDialog';

const ADD_VARIABLE_DIALOG_ID = 'add-variable-dialog';

export function useAddVariableDialog() {
  const { openModal, closeModal } = useModal<AddVariableDialogProps>(
    ADD_VARIABLE_DIALOG_ID,
    AddVariableDialog
  );

  const openAddVariableDialog = useCallback(
    (props: Omit<AddVariableDialogProps, 'open' | 'onClose'>) => {
      openModal({
        ...props,
        onAdd: async (name, value) => {
          void (props.onAdd as (name: string, value: unknown) => Promise<void>)?.(name, value);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openAddVariableDialog, closeAddVariableDialog: closeModal };
}
