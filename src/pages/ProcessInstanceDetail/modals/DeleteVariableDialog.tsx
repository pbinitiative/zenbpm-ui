import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface DeleteVariableDialogProps {
  open: boolean;
  variableName: string;
  onClose: () => void;
  onDelete: (name: string) => Promise<void>;
}

export const DeleteVariableDialog = ({
  open,
  variableName,
  onClose,
  onDelete,
}: DeleteVariableDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [loading, setLoading] = useState(false);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    try {
      await onDelete(variableName);
    } finally {
      setLoading(false);
    }
  }, [variableName, onDelete]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.deleteVariable.title')}</DialogTitle>
      <DialogContent>
        <Typography>
          {t('processInstance:dialogs.deleteVariable.confirmation', { name: variableName })}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
        >
          {t('common:actions.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
