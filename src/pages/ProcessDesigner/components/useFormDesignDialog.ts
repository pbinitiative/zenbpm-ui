import { useCallback } from 'react';
import { useModal } from '@components/Modals';
import { FormDesignDialog, type FormDesignDialogProps } from './FormDesignDialog';

const FORM_DESIGNER_DIALOG_ID = 'form-designer-dialog';

export function useFormDesignDialog() {
  const { openModal, closeModal } = useModal<FormDesignDialogProps>(
    FORM_DESIGNER_DIALOG_ID,
    FormDesignDialog
  );

  const openFormDesignerDialog = useCallback(
    (props: Omit<FormDesignDialogProps, 'open' | 'onClose'>) => {
      openModal({ ...props });
    },
    [openModal]
  );

  return { openFormDesignerDialog, closeFormDesignerDialog: closeModal };
}
