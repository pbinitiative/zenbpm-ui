import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Button, Snackbar, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/Upload';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { PageHeader } from '@components/PageHeader';
import { SubTabs, type SubTab } from '@components/SubTabs';
import { DecisionDefinitionsTab } from './tabs/DecisionDefinitionsTab';
import { DecisionInstancesTab } from './tabs/DecisionInstancesTab';
import { createDmnResourceDefinition } from '@base/openapi';

type TabValue = 'definitions' | 'instances';

const validTabs: TabValue[] = ['definitions', 'instances'];

export const DecisionsPage = () => {
  const { t } = useTranslation([ns.common, ns.decisions]);
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
      navigate('/decisions/definitions', { replace: true });
    }
  }, [tab, navigate]);

  const tabs: SubTab[] = [
    { value: 'definitions', label: t('decisions:definitions.tabLabel') },
    { value: 'instances', label: t('decisions:instances.tabLabel') },
  ];

  const handleTabChange = useCallback(
    (value: string) => {
      navigate(`/decisions/${value}`);
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
      const xml = await file.text();
      await createDmnResourceDefinition(xml);
      setSnackbar({
        open: true,
        message: t('decisions:messages.uploadSuccess'),
        severity: 'success',
      });
      // Refresh the list
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('decisions:messages.uploadFailed');
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

  const handleDesignDecision = useCallback(() => {
    navigate('/designer/decision');
  }, [navigate]);

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
        {t('decisions:actions.upload')}
      </Button>
      <Button
        variant="contained"
        color="secondary"
        size="small"
        startIcon={<EditNoteIcon />}
        onClick={handleDesignDecision}
        data-testid="design-button"
      >
        {t('decisions:actions.design')}
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
        accept=".dmn,.xml"
        onChange={handleFileUpload}
        sx={{ display: 'none' }}
      />

      <PageHeader title={t('decisions:title')} />

      <SubTabs
        tabs={tabs}
        value={activeTab}
        onChange={handleTabChange}
        actions={actions}
      />

      {activeTab === 'definitions' && <DecisionDefinitionsTab refreshKey={refreshKey} />}
      {activeTab === 'instances' && <DecisionInstancesTab refreshKey={refreshKey} />}

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
