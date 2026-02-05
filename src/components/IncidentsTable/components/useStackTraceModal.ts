import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { StackTraceModal, type StackTraceModalProps } from './StackTraceModal';

const STACK_TRACE_MODAL_ID = 'stack-trace-modal';

export function useStackTraceModal() {
  const { openModal, closeModal } = useModal<StackTraceModalProps>(
    STACK_TRACE_MODAL_ID,
    StackTraceModal
  );

  const openStackTrace = useCallback(
    (props: Omit<StackTraceModalProps, 'open' | 'onClose'>) => {
      openModal({ ...props });
    },
    [openModal]
  );

  return { openStackTrace, closeStackTrace: closeModal };
}
