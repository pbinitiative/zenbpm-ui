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
} from '@mui/material';

interface AddVariableDialogProps {
  open: boolean;
  existingVariables: string[];
  onClose: () => void;
  onAdd: (name: string, value: unknown) => Promise<void>;
}

export const AddVariableDialog = ({
  open,
  existingVariables,
  onClose,
  onAdd,
}: AddVariableDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateName = useCallback((newName: string) => {
    if (!newName.trim()) {
      setNameError(t('processInstance:dialogs.addVariable.nameRequired'));
      return false;
    }
    if (existingVariables.includes(newName.trim())) {
      setNameError(t('processInstance:dialogs.addVariable.nameExists'));
      return false;
    }
    setNameError(null);
    return true;
  }, [existingVariables, t]);

  const validateValue = useCallback((newValue: string) => {
    if (!newValue.trim()) {
      setJsonError(null);
      return true; // Empty string is valid
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

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    validateName(newName);
  }, [validateName]);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    validateValue(newValue);
  }, [validateValue]);

  const handleAdd = useCallback(async () => {
    if (!validateName(name) || !validateValue(value)) return;

    setLoading(true);
    try {
      // Parse value or use as string if not valid JSON
      let parsedValue: unknown;
      try {
        parsedValue = value.trim() ? JSON.parse(value) : '';
      } catch {
        parsedValue = value;
      }
      await onAdd(name.trim(), parsedValue);
      // Reset form
      setName('');
      setValue('');
    } finally {
      setLoading(false);
    }
  }, [name, value, onAdd, validateName, validateValue]);

  const handleClose = useCallback(() => {
    setName('');
    setValue('');
    setNameError(null);
    setJsonError(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.addVariable.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('processInstance:dialogs.addVariable.name')}
            value={name}
            onChange={handleNameChange}
            error={!!nameError}
            helperText={nameError}
            fullWidth
            autoFocus
          />
          <TextField
            label={t('processInstance:dialogs.addVariable.value')}
            value={value}
            onChange={handleValueChange}
            error={!!jsonError}
            helperText={jsonError || t('processInstance:dialogs.addVariable.valueHelp')}
            multiline
            rows={4}
            fullWidth
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
        <Button onClick={handleClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={!name.trim() || !!nameError || !!jsonError || loading}
        >
          {t('common:actions.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
