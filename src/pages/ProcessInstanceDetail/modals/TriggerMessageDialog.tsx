import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { JsonEditor } from '@components/JsonEditor';
import type { MessageSubscription } from '@base/openapi';

export interface TriggerMessageDialogProps {
  open: boolean;
  subscription: MessageSubscription;
  onClose: () => void;
  onTrigger: (messageName: string, correlationKey: string, variables: Record<string, unknown>) => Promise<void>;
}

const EXAMPLE_VARIABLES = '{}';

export const TriggerMessageDialog = ({
  open,
  subscription,
  onClose,
  onTrigger,
}: TriggerMessageDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);

  const [correlationKey, setCorrelationKey] = useState('');
  const [variablesText, setVariablesText] = useState(EXAMPLE_VARIABLES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-initialize fields each time the dialog opens with a new subscription
  useEffect(() => {
    if (open) {
      setCorrelationKey(subscription.correlationKey ?? '');
      setVariablesText(EXAMPLE_VARIABLES);
      setIsSubmitting(false);
    }
  }, [open, subscription]);

  const validateJson = useCallback((value: string): boolean => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, []);

  const isValidJson = validateJson(variablesText);

  const handleVariablesChange = useCallback((value: string) => {
    setVariablesText(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValidJson) return;
    setIsSubmitting(true);
    try {
      const variables = JSON.parse(variablesText) as Record<string, unknown>;
      await onTrigger(subscription.messageName, correlationKey, variables);
    } finally {
      setIsSubmitting(false);
    }
  }, [isValidJson, variablesText, onTrigger, subscription.messageName, correlationKey]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6">{t('processInstance:dialogs.triggerMessage.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('processInstance:dialogs.triggerMessage.subtitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField
          label={t('processInstance:dialogs.triggerMessage.messageName')}
          value={subscription.messageName}
          fullWidth
          size="small"
          slotProps={{ input: { readOnly: true } }}
          sx={{ '& .MuiInputBase-input': { bgcolor: 'action.hover' } }}
        />

        <TextField
          label={t('processInstance:dialogs.triggerMessage.correlationKey')}
          value={correlationKey}
          onChange={(e) => setCorrelationKey(e.target.value)}
          fullWidth
          size="small"
        />

        <JsonEditor
          label={t('processInstance:dialogs.triggerMessage.variables')}
          value={variablesText}
          onChange={handleVariablesChange}
          error={!isValidJson && variablesText !== '{}'}
          errorMessage={t('processInstance:dialogs.triggerMessage.invalidJson')}
          height={180}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !isValidJson}
        >
          {t('processInstance:dialogs.triggerMessage.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
