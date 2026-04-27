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
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import { JsonEditor } from '@components/JsonEditor';
import { SearchableSelect } from '@components/SearchableSelect';
import {
  createProcessInstance,
  getProcessDefinition,
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

export const StartInstanceDialog = ({
  open,
  onClose,
  processDefinitionKey: propProcessDefinitionKey,
  onSuccess,
}: StartInstanceDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processes]);
  const [variables, setVariables] = useState('{}');
  const [businessKey, setBusinessKey] = useState<string | null>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Selected process definition (latest version, from search)
  const [selectedDefinition, setSelectedDefinition] = useState<ProcessDefinitionSimple | null>(
    null,
  );

  const fetchProcessDefinitions = useCallback(
    (search: string) =>
      getProcessDefinitions({ search: search || undefined, onlyLatest: true, size: 50 }).then(
        (data) => data.items || [],
      ),
    [],
  );

  // All versions for the selected bpmnProcessId
  const [allVersions, setAllVersions] = useState<ProcessDefinitionSimple[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Selected version key
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  // Sorted versions (descending)
  const versionOptions = useMemo(
    () => [...allVersions].sort((a, b) => b.version - a.version),
    [allVersions],
  );

  // Actual process definition key used for starting the instance
  const processDefinitionKey = selectedVersion;

  // Fetch all versions when a process definition is selected
  useEffect(() => {
    if (!selectedDefinition) {
      setAllVersions([]);
      setSelectedVersion('');
      return;
    }

    const loadVersions = async () => {
      setLoadingVersions(true);
      try {
        const data = await getProcessDefinitions({
          bpmnProcessId: selectedDefinition.bpmnProcessId,
          size: 100,
        });
        setAllVersions(data.items || []);
      } catch (err) {
        console.error('Failed to load process versions:', err);
        setAllVersions([]);
      } finally {
        setLoadingVersions(false);
      }
    };

    void loadVersions();
  }, [selectedDefinition]);

  // Auto-select the latest version when versions are loaded
  useEffect(() => {
    if (versionOptions.length > 0 && !selectedVersion) {
      setSelectedVersion(versionOptions[0].key);
    }
  }, [versionOptions, selectedVersion]);

  // Pre-select when processDefinitionKey prop is provided
  useEffect(() => {
    if (!open || !propProcessDefinitionKey) return;

    const preselect = async () => {
      try {
        const def = await getProcessDefinition(propProcessDefinitionKey);
        setSelectedDefinition(def as ProcessDefinitionSimple);
        setSelectedVersion(propProcessDefinitionKey);
      } catch (err) {
        console.error('Failed to pre-select process definition:', err);
      }
    };

    void preselect();
  }, [open, propProcessDefinitionKey]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setVariables('{}');
      setBusinessKey(null);
      setError(null);
      setLoading(false);
      if (!propProcessDefinitionKey) {
        setSelectedDefinition(null);
        setAllVersions([]);
        setSelectedVersion('');
      }
    }
  }, [open, propProcessDefinitionKey]);

  // Validate JSON
  const validateJson = useCallback((json: string): boolean => {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }, []);

  const isValidJson = validateJson(variables);

  const handleVariablesChange = useCallback((value: string) => {
    setVariables(value);
    setError(null);
  }, []);

  // Handle process selection — reset version so auto-select triggers
  const handleDefinitionChange = useCallback((value: ProcessDefinitionSimple | null) => {
    setSelectedDefinition(value);
    setSelectedVersion('');
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
        ...(businessKey ? { businessKey } : {}),
      });
      onSuccess?.(data.key);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('processes:errors.createFailed'));
    } finally {
      setLoading(false);
    }
  }, [isValidJson, processDefinitionKey, variables, businessKey, onSuccess, onClose, t]);

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
            {/* Process search selector */}
            <Box sx={{ flex: 1 }}>
              <SearchableSelect<ProcessDefinitionSimple>
                value={selectedDefinition}
                onChange={handleDefinitionChange}
                disabled={!!propProcessDefinitionKey}
                fetchOptions={fetchProcessDefinitions}
                getOptionLabel={(opt) => opt.bpmnProcessName || opt.bpmnProcessId}
                getOptionSubtitle={(opt) =>
                  opt.bpmnProcessName && opt.bpmnProcessName !== opt.bpmnProcessId
                    ? opt.bpmnProcessId
                    : undefined
                }
                getOptionKey={(opt) => opt.key}
                label={t('processes:dialogs.startInstance.selectProcess')}
              />
            </Box>

            {/* Version selector */}
            <FormControl
              sx={{ minWidth: 120 }}
              size="small"
              disabled={!selectedDefinition || loadingVersions}
            >
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

          {/* Business key */}
          <TextField
            label={t('processes:fields.businessKey')}
            value={businessKey ?? ''}
            onChange={(e) => setBusinessKey(e.target.value || null)}
            size="small"
            fullWidth
            sx={{ mt: 2 }}
          />
        </Box>

        {/* Variables editor */}
        <JsonEditor
          label={t('processes:dialogs.startInstance.variables')}
          value={variables}
          onChange={handleVariablesChange}
          error={!isValidJson && variables !== ''}
          errorMessage={t('processes:errors.invalidJson')}
          height={180}
        />
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
