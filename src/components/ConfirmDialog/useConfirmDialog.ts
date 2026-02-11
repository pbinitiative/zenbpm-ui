import { useCallback, useRef, useEffect } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import type { ConfirmDialogProps } from './ConfirmDialog';
import { useModal } from '@components/Modals/useModal';

const CONFIRM_DIALOG_ID = 'global-confirm-dialog';

export type OpenConfirmOptions = Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'>;

export function useConfirmDialog() {
  const {openModal, closeModal} = useModal<ConfirmDialogProps>(CONFIRM_DIALOG_ID, ConfirmDialog);

  const openModalRef = useRef(openModal);
  const closeModalRef = useRef(closeModal);

  useEffect(() => {
    openModalRef.current = openModal;
    closeModalRef.current = closeModal;
  }, [openModal, closeModal]);

  const openConfirm = useCallback((opts: OpenConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      openModalRef.current({
        ...opts,
        onClose: () => {
          resolve(false);
          closeModalRef.current();
        },
        onConfirm: () => {
          resolve(true);
          closeModalRef.current();
        },
      });
    });
  }, []); // Empty array = stable function reference

  return {openConfirm} as const;
}