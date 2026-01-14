import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import type { Job } from '../types';

interface UpdateRetriesDialogProps {
  open: boolean;
  job: Job;
  onClose: () => void;
  onUpdate: (jobKey: number, retries: number) => Promise<void>;
}

export const UpdateRetriesDialog = ({
  open,
  job,
  onClose,
  onUpdate,
}: UpdateRetriesDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [retries, setRetries] = useState(job.retries ?? 3);
  const [loading, setLoading] = useState(false);

  const handleUpdate = useCallback(async () => {
    setLoading(true);
    try {
      await onUpdate(job.key, retries);
    } finally {
      setLoading(false);
    }
  }, [job.key, onUpdate, retries]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.updateRetries.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('processInstance:dialogs.updateRetries.description')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('processInstance:fields.currentRetries')}
            </Typography>
            <Typography variant="body2">{job.retries ?? '-'}</Typography>
          </Box>

          <TextField
            label={t('processInstance:dialogs.updateRetries.newRetries')}
            type="number"
            value={retries}
            onChange={(e) => setRetries(Math.max(0, parseInt(e.target.value) || 0))}
            inputProps={{ min: 0, max: 100 }}
            fullWidth
            autoFocus
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={handleUpdate}
          variant="contained"
          disabled={loading}
        >
          {t('common:actions.update')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
