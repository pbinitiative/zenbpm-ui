import { useCallback } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import type { ConfirmDialogProps } from './ConfirmDialog';
import { useModal } from '@components/Modals/useModal';

const CONFIRM_DIALOG_ID = 'global-confirm-dialog';

export type OpenConfirmOptions = Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'>;

export function useConfirmDialog() {
  const { openModal, closeModal } = useModal<ConfirmDialogProps>(CONFIRM_DIALOG_ID, ConfirmDialog);

  const openConfirm = useCallback((opts: OpenConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      openModal({
        ...opts,
        // onClose means cancel here
        onClose: () => {
          resolve(false);
          closeModal();
        },
        onConfirm: () => {
          resolve(true);
          closeModal();
        },
      });
    });
  }, [openModal, closeModal]);

  return { openConfirm } as const;
}
