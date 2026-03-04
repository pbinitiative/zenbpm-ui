import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { InputOutputDialog, type InputOutputDialogProps } from './InputOutputDialog';

const INPUT_OUTPUT_DIALOG_ID = 'input-output-dialog';

export function useInputOutputDialog() {
  const { openModal, closeModal } = useModal<InputOutputDialogProps>(
    INPUT_OUTPUT_DIALOG_ID,
    InputOutputDialog
  );

  const openInputOutputDialog = useCallback(
    (props: Omit<InputOutputDialogProps, 'open' | 'onClose'>) => {
      openModal({ ...props });
    },
    [openModal]
  );

  return { openInputOutputDialog, closeInputOutputDialog: closeModal };
}
