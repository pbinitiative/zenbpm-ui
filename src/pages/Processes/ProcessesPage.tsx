import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Snackbar, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/Upload';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { PageHeader } from '@components/PageHeader';
import { SubTabs, type SubTab } from '@components/SubTabs';
import { ProcessDefinitionsTab } from './tabs/ProcessDefinitionsTab';
import { ProcessInstancesTab } from './tabs/ProcessInstancesTab';
import { createProcessDefinition } from '@base/openapi';

type TabValue = 'definitions' | 'instances';

const validTabs: TabValue[] = ['definitions', 'instances'];

export const ProcessesPage = () => {
  const { t } = useTranslation();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Determine active tab from URL, default to 'definitions'
  const activeTab: TabValue = validTabs.includes(tab as TabValue) ? (tab as TabValue) : 'definitions';

  // Redirect to default tab if no tab specified or invalid tab
  useEffect(() => {
    if (!tab || !validTabs.includes(tab as TabValue)) {
      navigate('/processes/definitions', { replace: true });
    }
  }, [tab, navigate]);

  const tabs: SubTab[] = [
    { value: 'definitions', label: t('processes:definitions.tabLabel') },
    { value: 'instances', label: t('processes:instances.tabLabel') },
  ];

  const handleTabChange = useCallback(
    (value: string) => {
      // Clear query params when switching tabs (each tab has its own filters)
      navigate(`/processes/${value}`);
    },
    [navigate]
  );

  // Action handlers
  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Pass the file as a Blob for multipart/form-data upload
      await createProcessDefinition({ resource: file });
      setSnackbar({
        open: true,
        message: t('processes:messages.uploadSuccess'),
        severity: 'success',
      });
      // Refresh the list
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('processes:messages.uploadFailed');
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  }, [t]);

  const handleDesignProcess = useCallback(() => {
    navigate('/designer/process');
  }, [navigate]);

  const handleStartInstance = useCallback(() => {
    // TODO: Open start instance modal
    console.log('Start instance clicked');
  }, []);

  // Actions displayed next to tabs
  const actions = (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<RefreshIcon />}
        onClick={handleRefresh}
        data-testid="refresh-button"
      >
        {t('common:actions.refresh')}
      </Button>
      <Button
        variant="contained"
        color="secondary"
        size="small"
        startIcon={<UploadIcon />}
        onClick={handleUpload}
        disabled={uploading}
        data-testid="upload-button"
      >
        {t('processes:actions.upload')}
      </Button>
      <Button
        variant="contained"
        color="secondary"
        size="small"
        startIcon={<EditNoteIcon />}
        onClick={handleDesignProcess}
        data-testid="design-button"
      >
        {t('processes:actions.design')}
      </Button>
      <Button
        variant="contained"
        color="secondary"
        size="small"
        startIcon={<PlayArrowIcon />}
        onClick={handleStartInstance}
        data-testid="start-instance-button"
      >
        {t('processes:actions.startInstance')}
      </Button>
    </>
  );

  return (
    <Box>
      {/* Hidden file input for upload */}
      <Box
        component="input"
        ref={fileInputRef}
        type="file"
        accept=".bpmn,.xml"
        onChange={handleFileUpload}
        sx={{ display: 'none' }}
      />

      <PageHeader title={t('processes:title')} />

      <SubTabs
        tabs={tabs}
        value={activeTab}
        onChange={handleTabChange}
        actions={actions}
      />

      {activeTab === 'definitions' && <ProcessDefinitionsTab refreshKey={refreshKey} />}
      {activeTab === 'instances' && <ProcessInstancesTab refreshKey={refreshKey} />}

      {/* Snackbar for upload feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
