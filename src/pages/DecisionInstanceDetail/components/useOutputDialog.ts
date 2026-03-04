import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { OutputDialog, type OutputDialogProps } from './OutputDialog';

const OUTPUT_DIALOG_ID = 'output-dialog';

export function useOutputDialog() {
  const { openModal, closeModal } = useModal<OutputDialogProps>(
    OUTPUT_DIALOG_ID,
    OutputDialog
  );

  const openOutputDialog = useCallback(
    (props: Omit<OutputDialogProps, 'open' | 'onClose'>) => {
      openModal({ ...props });
    },
    [openModal]
  );

  return { openOutputDialog, closeOutputDialog: closeModal };
}
