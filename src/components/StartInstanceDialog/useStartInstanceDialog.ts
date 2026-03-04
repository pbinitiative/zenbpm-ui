import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { StartInstanceDialog, type StartInstanceDialogProps } from './StartInstanceDialog';

const START_INSTANCE_DIALOG_ID = 'start-instance-dialog';

export function useStartInstanceDialog() {
  const { openModal, closeModal } = useModal<StartInstanceDialogProps>(
    START_INSTANCE_DIALOG_ID,
    StartInstanceDialog
  );

  const openStartInstance = useCallback(
    (props: Omit<StartInstanceDialogProps, 'open' | 'onClose'>) => {
      openModal({
        ...props,
        onSuccess: (instanceKey) => {
          props.onSuccess?.(instanceKey);
          closeModal();
        },
      });
    },
    [openModal, closeModal]
  );

  return { openStartInstance, closeStartInstance: closeModal };
}
