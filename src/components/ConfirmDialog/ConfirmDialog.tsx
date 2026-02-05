import type { FC } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import {ns} from "@base/i18n";
import {useTranslation} from "react-i18next";
// BaseDialog was removed; use MUI Dialog directly

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'inherit' | 'secondary' | 'success' | 'info' | 'warning';
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  confirmColor = 'primary',
  maxWidth = 'xs',
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation([ns.common]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{cancelText || t('common:no')}</Button>
        <Button onClick={onConfirm} variant="contained" color={confirmColor}>
          {confirmText || t('common:yes')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
