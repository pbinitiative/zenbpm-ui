import React, { useCallback, useMemo, useState } from 'react';
import type { AnyProps, DefineModalFn, OpenModalFn, CloseModalFn, ModalsContextValue, ModalComponent } from './ModalsContextBase';
import { ModalsContext } from './ModalsContextBase';

interface ActiveEntry { Component: ModalComponent; props: AnyProps }

export function ModalsProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Map<string, ActiveEntry>>(new Map());

  const defineModal = useCallback<DefineModalFn>(() => {
  }, []);

  const openModal = useCallback<OpenModalFn>((modalId, Component, props) => {
    setActive((prev) => {
      const next = new Map(prev);
      next.set(modalId, { Component: Component as ModalComponent, props: { ...(props ?? {}) } });
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
        const userOnClose = (props.onClose ?? undefined) as (() => void) | undefined;
        const handleClose = () => {
          try { userOnClose?.(); } finally { closeModal(id); }
        };
        return (
          <Component key={id} {...props} onClose={handleClose} open />
        );
      })}
    </ModalsContext.Provider>
  );
}
