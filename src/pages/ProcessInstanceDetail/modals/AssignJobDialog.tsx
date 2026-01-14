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
  Chip,
} from '@mui/material';
import type { Job } from '../types';

interface AssignJobDialogProps {
  open: boolean;
  job: Job;
  onClose: () => void;
  onAssign: (jobKey: number, assignee: string) => Promise<void>;
}

export const AssignJobDialog = ({
  open,
  job,
  onClose,
  onAssign,
}: AssignJobDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [assignee, setAssignee] = useState(job.assignee || '');
  const [loading, setLoading] = useState(false);

  const handleAssign = useCallback(async () => {
    if (!assignee.trim()) return;

    setLoading(true);
    try {
      await onAssign(job.key, assignee.trim());
    } finally {
      setLoading(false);
    }
  }, [assignee, job.key, onAssign]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.assignJob.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('processInstance:dialogs.assignJob.description')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('processInstance:fields.elementId')}
            </Typography>
            <Typography variant="body2">{job.elementName || job.elementId}</Typography>
          </Box>

          {job.candidateGroups && job.candidateGroups.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('processInstance:fields.candidateGroups')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {job.candidateGroups.map((group) => (
                  <Chip key={group} label={group} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {job.assignee && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {t('processInstance:fields.currentAssignee')}
              </Typography>
              <Typography variant="body2">{job.assignee}</Typography>
            </Box>
          )}

          <TextField
            label={t('processInstance:dialogs.assignJob.assignee')}
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            fullWidth
            autoFocus
            placeholder={t('processInstance:dialogs.assignJob.placeholder')}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={handleAssign}
          variant="contained"
          disabled={!assignee.trim() || loading}
        >
          {t('processInstance:actions.assign')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
