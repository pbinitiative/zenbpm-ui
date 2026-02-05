import React, { useCallback, useMemo, useState } from 'react';
import type { DefineModalFn, OpenModalFn, CloseModalFn, ModalsContextValue, ModalComponent, ModalBaseProps } from './ModalsContextBase';
import { ModalsContext } from './ModalsContextBase';

interface ActiveEntry { Component: ModalComponent; props: ModalBaseProps }

export function ModalsProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Map<string, ActiveEntry>>(new Map());

  const defineModal = useCallback<DefineModalFn>(() => {
    // This function is currently not used but is part of the context API
  }, []);

  const openModal = useCallback<OpenModalFn>((modalId, Component, props) => {
    setActive((prev) => {
      const next = new Map(prev);
      // Construct full props including `open: true` and a temporary `onClose` for internal handling.
      // The original `onClose` from `props` (if any) will be called via `handleClose`.
      const fullProps: ModalBaseProps = { ...props, open: true, onClose: () => { /* no-op, handled by provider */ } };
      // Store the component and its props. The component is cast to ModalComponent<ModalBaseProps>
      // because the map must hold a consistent type, and all modal components
      // are guaranteed to extend ModalBaseProps.
      next.set(modalId, { Component: Component as ModalComponent, props: fullProps });
      return next;
    });
  }, []);

  const closeModal = useCallback<CloseModalFn>((modalId) => {
    setActive((prev) => {
      if (!prev.has(modalId)) return prev;
      const next = new Map(prev);
      next.delete(modalId);
      return next;
    });
  }, []);

  const value: ModalsContextValue = useMemo(() => ({ defineModal, openModal, closeModal }), [defineModal, openModal, closeModal]);

  return (
    <ModalsContext.Provider value={value}>
      {children}
      {Array.from(active.entries()).map(([id, entry]) => {
        const { Component, props } = entry;
        
        // When a modal component is added via `openModal`, its original props
        // are stored in `props`. The `onClose` defined there is the user-provided one.
        // We ensure that this user-provided `onClose` is called before closing the modal.
        const userOnClose = props.onClose; // This is the original onClose from the `props` passed to openModal.
                                            // It's part of `ModalBaseProps` which was constructed as `fullProps`.
        const handleClose = () => {
          try { userOnClose?.(); } finally { closeModal(id); }
        };

        // Render the component. `props` here is `ModalBaseProps`.
        // The Component expects props of type `T extends ModalBaseProps`.
        // The spread `...props` here is valid because `props` is `ModalBaseProps`.
        // The `open={true}` and `onClose={handleClose}` explicitly override the
        // `open` and `onClose` that might be present in `props` from `fullProps`.
        // This ensures the modal is always open and controlled by the provider's close logic.
        return (
          <Component key={id} {...props} onClose={handleClose} open={true} />
        );
      })}
    </ModalsContext.Provider>
  );
}
