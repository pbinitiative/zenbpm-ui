import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { TextViewerDialog, type TextViewerDialogProps } from './TextViewerDialog';

const TEXT_VIEWER_ID = 'text-viewer-dialog';

export function useTextViewer() {
  const { openModal, closeModal } = useModal<TextViewerDialogProps>(TEXT_VIEWER_ID, TextViewerDialog);

  const openText = useCallback((props: Omit<TextViewerDialogProps, 'open' | 'onClose'>) => {
    openModal({ ...props });
  }, [openModal]);

  return { openText, closeText: () => closeModal() } as const;
}
