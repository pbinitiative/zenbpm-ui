import { useState, useCallback } from 'react';
import { Box, Snackbar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { PageHeader } from '@components/PageHeader';
import { IncidentsTable } from '@components/IncidentsTable';
import type { FilterValues } from '@components/TableWithFilters';

export const IncidentsPage = () => {
  const { t } = useTranslation([ns.common, ns.incidents]);

  // Table state
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterValues, setFilterValues] = useState<FilterValues>({
    state: 'all',
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilterValues(newFilters);
  }, []);

  // Handle incident resolved
  const handleIncidentResolved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Show notification
  const handleShowNotification = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  return (
    <Box>
      <PageHeader title={t('incidents:title')} />

      <IncidentsTable
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        refreshKey={refreshKey}
        syncWithUrl={true}
        onIncidentResolved={handleIncidentResolved}
        onShowNotification={handleShowNotification}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};
