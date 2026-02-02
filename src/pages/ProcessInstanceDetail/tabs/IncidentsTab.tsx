import { useState, useCallback } from 'react';
import { IncidentsTable } from '@components/IncidentsTable';

interface IncidentsTabProps {
  processInstanceKey: string;
  onRefetch?: () => Promise<void>;
  onShowNotification?: (message: string, severity: 'success' | 'error') => void;
}

export const IncidentsTab = ({
  processInstanceKey,
  onRefetch,
  onShowNotification,
}: IncidentsTabProps) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleIncidentResolved = useCallback(async () => {
    setRefreshKey((k) => k + 1);
    await onRefetch?.();
  }, [onRefetch]);

  return (
    <IncidentsTable
      processInstanceKey={processInstanceKey}
      refreshKey={refreshKey}
      onIncidentResolved={handleIncidentResolved}
      onShowNotification={onShowNotification}
    />
  );
};
