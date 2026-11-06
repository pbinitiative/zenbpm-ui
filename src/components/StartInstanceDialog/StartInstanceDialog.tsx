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
} from '@mui/material';
import { VersionSelector, useProcessVersionHistory } from '@components/VersionSelector';

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
  /**
   * The definition of `processDefinitionKey`, when the caller has it: the
   * dialog then doesn't request it again
   */
  processDefinition?: ProcessDefinitionSimple;
  /** Callback when instance is created successfully */
  onSuccess?: (instanceKey: string) => void;
}

export const StartInstanceDialog = ({
  open,
  onClose,
  processDefinitionKey: propProcessDefinitionKey,
  processDefinition: propProcessDefinition,
  onSuccess,
}: StartInstanceDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processes]);
  const [variables, setVariables] = useState('{}');
  const [businessKey, setBusinessKey] = useState<string | null>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The caller's definition of the pre-selected version, if it passed one
  const presetDefinition =
    propProcessDefinition && String(propProcessDefinition.key) === propProcessDefinitionKey
      ? propProcessDefinition
      : null;

  // Selected process definition (latest version, from search)
  const [selectedDefinition, setSelectedDefinition] = useState<ProcessDefinitionSimple | null>(
    presetDefinition,
  );

  const fetchProcessDefinitions = useCallback(
    (search: string) =>
      getProcessDefinitions({ search: search || undefined, onlyLatest: true, size: 50 }).then(
        (data) => data.items || [],
      ),
    [],
  );

  // Versions of the selected process, shared with the definition page that
  // opened the dialog, so they aren't requested again
  const versionHistory = useProcessVersionHistory(selectedDefinition?.bpmnProcessId);

  // Selected version key
  const [selectedVersion, setSelectedVersion] = useState<string>(
    presetDefinition ? String(presetDefinition.key) : '',
  );

  // Actual process definition key used for starting the instance
  const processDefinitionKey = selectedVersion;

  // The selected definition shows before the page holding it is loaded
  const selectedOption = useMemo(
    () =>
      selectedDefinition && String(selectedDefinition.key) === selectedVersion
        ? { ...selectedDefinition, key: selectedVersion }
        : undefined,
    [selectedDefinition, selectedVersion],
  );

  // Pre-select when only the processDefinitionKey prop is provided
  const hasPresetDefinition = presetDefinition !== null;
  useEffect(() => {
    if (!open || !propProcessDefinitionKey || hasPresetDefinition) return;

    let active = true;
    const preselect = async () => {
      try {
        const def = await getProcessDefinition(propProcessDefinitionKey);
        if (!active) return;
        setSelectedDefinition(def);
        setSelectedVersion(propProcessDefinitionKey);
      } catch (err) {
        console.error('Failed to pre-select process definition:', err);
      }
    };

    void preselect();
    return () => {
      active = false;
    };
  }, [open, propProcessDefinitionKey, hasPresetDefinition]);

  // Reset the form when the dialog opens again. The modals mount it open,
  // with this initial state; a caller keeping it mounted while closed
  // reopens it by changing `open`.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setVariables('{}');
      setBusinessKey(null);
      setError(null);
      setLoading(false);
      if (!propProcessDefinitionKey) {
        setSelectedDefinition(null);
        setSelectedVersion('');
      }
    }
  }

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

  // The search lists the latest version of each process: select it
  const handleDefinitionChange = useCallback((value: ProcessDefinitionSimple | null) => {
    setSelectedDefinition(value);
    setSelectedVersion(value ? String(value.key) : '');
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
          {/* Side by side, or stacked on a phone, where the process field would be squeezed */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'flex-start' },
            }}
          >
            {/* Process search selector */}
            <Box sx={{ flex: { sm: 1 }, minWidth: 0 }}>
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
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: { sm: '50%' } }}>
              <VersionSelector
                value={selectedVersion}
                onChange={setSelectedVersion}
                options={versionHistory.versions}
                selectedOption={selectedOption}
                latestKey={versionHistory.latestKey}
                hasMore={versionHistory.hasMore}
                loadingMore={versionHistory.loadingMore}
                onLoadMore={versionHistory.loadMore}
                error={versionHistory.error}
                onRetry={versionHistory.retry}
                disabled={!selectedDefinition || versionHistory.loading}
              />
            </Box>
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
