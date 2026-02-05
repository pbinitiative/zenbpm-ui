import React from 'react';

export interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

export type ModalComponent<T extends ModalBaseProps = ModalBaseProps> = React.ComponentType<T>;

export type OpenModalFn = <T extends ModalBaseProps>(
  modalId: string,
  component: ModalComponent<T>,
  props: Omit<T, keyof ModalBaseProps> // Omit 'open' and 'onClose'
) => void;

export type CloseModalFn = (modalId: string) => void;
export type DefineModalFn = (modalId: string, component: ModalComponent) => void;

export interface ModalsContextValue {
  defineModal: DefineModalFn;
  openModal: OpenModalFn;
  closeModal: CloseModalFn;
}

export const ModalsContext = React.createContext<ModalsContextValue | null>(null);
