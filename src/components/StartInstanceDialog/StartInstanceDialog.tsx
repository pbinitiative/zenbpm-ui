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
  Box,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import CloseIcon from '@mui/icons-material/Close';
import { createProcessInstance } from '@base/openapi';

export interface StartInstanceDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Process definition key */
  processDefinitionKey: number;
  /** Process name for display */
  processName?: string;
  /** Callback when instance is created successfully */
  onSuccess?: (instanceKey: number) => void;
}

export const StartInstanceDialog = ({
  open,
  onClose,
  processDefinitionKey,
  processName,
  onSuccess,
}: StartInstanceDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processes]);
  const [variables, setVariables] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setVariables('{}');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  // Validate JSON
  const validateJson = useCallback((json: string): boolean => {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Check if current JSON is valid
  const isValidJson = validateJson(variables);

  // Format JSON
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(variables);
      setVariables(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError(t('processes:errors.invalidJson'));
    }
  }, [variables, t]);

  // Handle variables change
  const handleVariablesChange = useCallback((value: string) => {
    setVariables(value);
    setError(null);
  }, []);

  // Create instance
  const handleCreate = useCallback(async () => {
    if (!isValidJson) {
      setError(t('processes:errors.invalidJson'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await createProcessInstance({
        processDefinitionKey,
        variables: JSON.parse(variables),
      });
      onSuccess?.(data.key);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('processes:errors.createFailed'));
    } finally {
      setLoading(false);
    }
  }, [isValidJson, processDefinitionKey, variables, onSuccess, onClose, t]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '12px' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box>
          <Box component="span" sx={{ fontWeight: 600 }}>
            {t('processes:dialogs.startInstance.title')}
          </Box>
          {processName && (
            <Box
              component="span"
              sx={{
                ml: 1,
                color: 'text.secondary',
                fontWeight: 400,
                fontSize: '0.875rem',
              }}
            >
              - {processName}
            </Box>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Box
              component="label"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'text.primary',
              }}
            >
              {t('processes:dialogs.startInstance.variables')}
            </Box>
            <Tooltip title={t('processes:dialogs.startInstance.formatJson')}>
              <IconButton size="small" onClick={handleFormat}>
                <FormatAlignLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <TextField
            multiline
            rows={10}
            fullWidth
            value={variables}
            onChange={(e) => handleVariablesChange(e.target.value)}
            error={!isValidJson && variables !== ''}
            placeholder="{}"
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                fontSize: '0.875rem',
              },
            }}
          />
          {!isValidJson && variables !== '' && (
            <Box
              sx={{
                mt: 0.5,
                fontSize: '0.75rem',
                color: 'error.main',
              }}
            >
              {t('processes:errors.invalidJson')}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2,
        }}
      >
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!isValidJson || loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading
            ? t('processes:dialogs.startInstance.starting')
            : t('processes:dialogs.startInstance.start')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
