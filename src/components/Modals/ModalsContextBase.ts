import React from 'react';

// New: Generic type for modal props, ensuring specific types are preserved
// TProps: The actual props interface for a specific modal component
// TBaseProps: The base props expected by the modal system (e.g., open, onClose)
export interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

// Generic type to represent any props for a modal, merging specific props (T)
// with the base props (ModalBaseProps).
export type AnyModalProps<T = Record<string, unknown>> = T & ModalBaseProps;

// ModalComponent will now directly use the specific props type `T`
export type ModalComponent<T extends ModalBaseProps = ModalBaseProps> = React.ComponentType<T>;

// OpenModalFn now specifies that the `props` parameter explicitly excludes
// 'open' and 'onClose', matching what `useModal` provides.
// It also ensures `T extends ModalBaseProps` so that 'open' and 'onClose' are guaranteed.
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
