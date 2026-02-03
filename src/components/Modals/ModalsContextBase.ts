import React from 'react';

export interface AnyProps {
  // Allow arbitrary props but recognize optional onClose provided by consumers
  [key: string]: unknown;
  onClose?: () => void;
}

export type ModalComponent<T extends AnyProps = AnyProps> = React.ComponentType<T>;
export type OpenModalFn = <T extends AnyProps>(modalId: string, component: ModalComponent<T>, props?: T) => void;
export type CloseModalFn = (modalId: string) => void;
export type DefineModalFn = (modalId: string, component: ModalComponent) => void;

export interface ModalsContextValue {
  defineModal: DefineModalFn;
  openModal: OpenModalFn;
  closeModal: CloseModalFn;
}

export const ModalsContext = React.createContext<ModalsContextValue | null>(null);
