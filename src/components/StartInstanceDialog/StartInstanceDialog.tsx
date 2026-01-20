import { useState, useCallback, useEffect, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import CloseIcon from '@mui/icons-material/Close';
import {
  createProcessInstance,
  getProcessDefinitions,
  type ProcessDefinitionSimple,
} from '@base/openapi';

export interface StartInstanceDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Process definition key - if provided, pre-selects this process and version */
  processDefinitionKey?: string;
  /** Process name for display (used with processDefinitionKey) */
  processName?: string;
  /** Callback when instance is created successfully */
  onSuccess?: (instanceKey: string) => void;
}

// Unique process option (grouped by bpmnProcessId)
interface ProcessOption {
  bpmnProcessId: string;
  name: string;
}

export const StartInstanceDialog = ({
  open,
  onClose,
  processDefinitionKey: propProcessDefinitionKey,
  onSuccess,
}: StartInstanceDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processes]);
  const [variables, setVariables] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Process selector state
  const [allDefinitions, setAllDefinitions] = useState<ProcessDefinitionSimple[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Get unique process options (by bpmnProcessId)
  const processOptions = useMemo((): ProcessOption[] => {
    const uniqueProcesses = new Map<string, ProcessOption>();
    for (const def of allDefinitions) {
      if (!uniqueProcesses.has(def.bpmnProcessId)) {
        uniqueProcesses.set(def.bpmnProcessId, {
          bpmnProcessId: def.bpmnProcessId,
          name: def.bpmnProcessName || def.bpmnProcessId,
        });
      }
    }
    return Array.from(uniqueProcesses.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allDefinitions]);

  // Get versions for selected process
  const versionOptions = useMemo(() => {
    if (!selectedProcessId) return [];
    return allDefinitions
      .filter((d) => d.bpmnProcessId === selectedProcessId)
      .sort((a, b) => b.version - a.version);
  }, [allDefinitions, selectedProcessId]);

  // Determine actual process key to use
  const processDefinitionKey = selectedVersion;

  // Load all process definitions when dialog opens
  useEffect(() => {
    if (open) {
      const loadProcessDefinitions = async () => {
        setLoadingProcesses(true);
        try {
          // Load all definitions to have all versions available
          const data = await getProcessDefinitions({ size: 500 });
          setAllDefinitions(data.items || []);
        } catch (err) {
          console.error('Failed to load process definitions:', err);
          setError(t('processes:errors.loadDefinitionsFailed'));
        } finally {
          setLoadingProcesses(false);
        }
      };
      void loadProcessDefinitions();
    }
  }, [open, t]);

  // Initialize selection after definitions are loaded
  useEffect(() => {
    if (allDefinitions.length > 0 && !initialized) {
      if (propProcessDefinitionKey) {
        // Find the definition by key and pre-select it
        const def = allDefinitions.find((d) => d.key === propProcessDefinitionKey);
        if (def) {
          setSelectedProcessId(def.bpmnProcessId);
          setSelectedVersion(propProcessDefinitionKey);
        }
      } else if (processOptions.length > 0) {
        // Auto-select first process
        const firstProcess = processOptions[0];
        setSelectedProcessId(firstProcess.bpmnProcessId);
      }
      setInitialized(true);
    }
  }, [allDefinitions, propProcessDefinitionKey, processOptions, initialized]);

  // Auto-select latest version when process is selected (but not during initial load with propProcessDefinitionKey)
  useEffect(() => {
    if (selectedProcessId && versionOptions.length > 0 && !selectedVersion) {
      // Select the latest version (first in sorted list)
      setSelectedVersion(versionOptions[0].key);
    }
  }, [selectedProcessId, versionOptions, selectedVersion]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setVariables('{}');
      setError(null);
      setLoading(false);
      setSelectedProcessId(null);
      setSelectedVersion('');
      setInitialized(false);
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
      const parsed: unknown = JSON.parse(variables);
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
        variables: JSON.parse(variables) as Record<string, unknown>,
      });
      onSuccess?.(data.key);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('processes:errors.createFailed'));
    } finally {
      setLoading(false);
    }
  }, [isValidJson, processDefinitionKey, variables, onSuccess, onClose, t]);

  // Handle process selection from autocomplete
  const handleProcessChange = useCallback((_: unknown, value: ProcessOption | null) => {
    setSelectedProcessId(value?.bpmnProcessId || null);
    setSelectedVersion(''); // Reset version when process changes
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: '12px' } },
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
        <Box component="span" sx={{ fontWeight: 600 }}>
          {t('processes:dialogs.startInstance.title')}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        {/* Process and version selectors */}
        <Box sx={{ mb: 3, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {/* Process name selector (searchable) */}
            <Autocomplete
              options={processOptions}
              getOptionLabel={(option) => option.name}
              value={processOptions.find((p) => p.bpmnProcessId === selectedProcessId) || null}
              onChange={handleProcessChange}
              loading={loadingProcesses}
              disabled={loadingProcesses}
              sx={{ flex: 1 }}
              size="small"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('processes:dialogs.startInstance.selectProcess')}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingProcesses ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.bpmnProcessId}>
                  <Box>
                    <Box>{option.name}</Box>
                    {option.name !== option.bpmnProcessId && (
                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {option.bpmnProcessId}
                      </Box>
                    )}
                  </Box>
                </li>
              )}
            />

            {/* Version selector */}
            <FormControl sx={{ minWidth: 120 }} size="small" disabled={!selectedProcessId}>
              <InputLabel id="version-select-label">
                {t('processes:fields.version')}
              </InputLabel>
              <Select
                labelId="version-select-label"
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                label={t('processes:fields.version')}
              >
                {versionOptions.map((v) => (
                  <MenuItem key={v.key} value={v.key}>
                    v{v.version}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Variables editor */}
        <Box>
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
            rows={6}
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
          disabled={!isValidJson || loading || !processDefinitionKey}
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
