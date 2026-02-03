import type { ComponentType } from 'react';
import { useCallback } from 'react';
import { useModalsContext } from '@components/Modals/useModalsContext';
import type { AnyProps } from './ModalsContextBase';

export interface GenericModalProps {
  onClose: () => void;
  open: boolean;
}

export const useModal = <T extends AnyProps>(modalId: string, ModalComponent: ComponentType<T>) => {
  const { openModal: ctxOpen, closeModal: ctxClose } = useModalsContext();

  return {
    openModal: useCallback(
      (modalProps?: Omit<T, 'open' | 'onClose'>) => ctxOpen<T>(modalId, ModalComponent as ComponentType<T>, modalProps as T | undefined),
      [modalId, ctxOpen, ModalComponent]
    ),
    closeModal: () => ctxClose(modalId),
  } as const;
};
