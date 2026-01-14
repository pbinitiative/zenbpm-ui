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

interface Variable {
  name: string;
  value: string;
  rawValue: unknown;
}

interface EditVariableDialogProps {
  open: boolean;
  variable: Variable;
  onClose: () => void;
  onSave: (name: string, value: unknown) => Promise<void>;
}

export const EditVariableDialog = ({
  open,
  variable,
  onClose,
  onSave,
}: EditVariableDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [value, setValue] = useState(variable.value);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateValue = useCallback((newValue: string) => {
    if (!newValue.trim()) {
      setJsonError(null);
      return true;
    }
    try {
      JSON.parse(newValue);
      setJsonError(null);
      return true;
    } catch {
      setJsonError(t('common:errors.invalidJson'));
      return false;
    }
  }, [t]);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    validateValue(newValue);
  }, [validateValue]);

  const handleSave = useCallback(async () => {
    if (!validateValue(value)) return;

    setLoading(true);
    try {
      let parsedValue: unknown;
      try {
        parsedValue = value.trim() ? JSON.parse(value) : '';
      } catch {
        parsedValue = value;
      }
      await onSave(variable.name, parsedValue);
    } finally {
      setLoading(false);
    }
  }, [value, variable.name, onSave, validateValue]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.editVariable.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('processInstance:fields.variableName')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {variable.name}
            </Typography>
          </Box>
          <TextField
            label={t('processInstance:dialogs.editVariable.value')}
            value={value}
            onChange={handleValueChange}
            error={!!jsonError}
            helperText={jsonError || t('processInstance:dialogs.editVariable.valueHelp')}
            multiline
            rows={6}
            fullWidth
            autoFocus
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: '"SF Mono", Monaco, monospace',
                fontSize: '0.875rem',
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!!jsonError || loading}
        >
          {t('common:actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
