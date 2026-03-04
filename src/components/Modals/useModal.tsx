import type { ComponentType } from 'react';
import { useCallback } from 'react';
import { useModalsContext } from '@components/Modals/useModalsContext';
import type { ModalBaseProps } from './ModalsContextBase';

export const useModal = <T extends ModalBaseProps>(modalId: string, ModalComponent: ComponentType<T>) => {
  const { openModal: ctxOpen, closeModal: ctxClose } = useModalsContext();

  return {
    openModal: useCallback(
      (modalProps: Omit<T, keyof ModalBaseProps>) => ctxOpen<T>(modalId, ModalComponent, modalProps),
      [modalId, ctxOpen, ModalComponent]
    ),
    closeModal: () => ctxClose(modalId),
  } as const;
};
