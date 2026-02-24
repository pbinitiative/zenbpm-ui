import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import type { MetadataField, VersionInfo } from '@components/DiagramDetailLayout';
import type { ElementStatistics } from '@components/BpmnDiagram';
import {
  type ElementStatisticsPartitions,
  getProcessDefinition,
  getProcessDefinitions,
  useGetProcessDefinitionElementStatistics,
} from '@base/openapi';
import type { ProcessDefinition, SnackbarState } from '../types';
import { extractActivityIds } from '../utils';

function transformProcessDefinitionStatisticsToElementStatistics(
  data: ElementStatisticsPartitions | undefined
): ElementStatistics | undefined {
  if (!data?.partitions) {
    return undefined;
  }
  const result: ElementStatistics = {};
  for (const partition of data.partitions) {
    for (const [key, value] of Object.entries(partition.items)) {
      if (!result[key]) {
        result[key] = {
          activeCount: 0,
          incidentCount: 0
        }
      }
      result[key] = {
        activeCount: result[key].activeCount + value.activeCount,
        incidentCount: result[key].incidentCount + value.incidentCount
      }
    }
  }
  return result;
}

interface UseProcessDefinitionDataOptions {
  processDefinitionKey: string | undefined;
}

interface UseProcessDefinitionDataResult {
  processDefinition: ProcessDefinition | null;
  versions: VersionInfo[];
  activityIds: string[];
  loading: boolean;
  error: string | null;
  elementStatistics: ElementStatistics | undefined;
  selectedActivityId: string | undefined;
  startDialogOpen: boolean;
  snackbar: SnackbarState;
  additionalFields: MetadataField[];
  refreshKey: number;
  handleVersionChange: (key: string) => void;
  handleElementClick: (elementId: string) => void;
  handleActivityFilterChange: (activityId: string | undefined) => void;
  handleStartInstance: () => void;
  handleStartDialogClose: () => void;
  handleInstanceCreated: (instanceKey: string) => void;
  handleEditDefinition: () => void;
  handleSnackbarClose: () => void;
  navigateToInstance: (key: string) => void;
}

export function useProcessDefinitionData({
  processDefinitionKey,
}: UseProcessDefinitionDataOptions): UseProcessDefinitionDataResult {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation([ns.common, ns.processes]);

  // State
  const [processDefinition, setProcessDefinition] = useState<ProcessDefinition | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
  });

  // Get selected activity from URL (for diagram highlight sync)
  const selectedActivityId = searchParams.get('activityId') || undefined;

  // Fetch element statistics for diagram overlays
  const { data: rawElementStatistics } = useGetProcessDefinitionElementStatistics(
    processDefinitionKey ?? "",
    {
      query: {
        enabled: !!processDefinitionKey && !!processDefinition,
        refetchInterval: 10000,
      },
    }
  );

  const elementStatistics = useMemo(
    () => transformProcessDefinitionStatisticsToElementStatistics(rawElementStatistics),
    [rawElementStatistics]
  );

  // Fetch process definition
  useEffect(() => {
    if (!processDefinitionKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getProcessDefinition(processDefinitionKey);
        setProcessDefinition(data as ProcessDefinition);

        if (data.bpmnData) {
          const ids = extractActivityIds(data.bpmnData);
          setActivityIds(ids);
        }

        if (data.bpmnProcessId) {
          try {
            const versionsData = await getProcessDefinitions({
              bpmnProcessId: data.bpmnProcessId,
              page: 1,
              size: 100,
            });
            const items = (versionsData.items || []) as VersionInfo[];
            items.sort((a, b) => b.version - a.version);
            setVersions(items);
          } catch {
            // Versions fetch is not critical
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load process definition');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [processDefinitionKey, refreshKey]);

  // Handlers
  const handleVersionChange = useCallback(
    (key: string) => {
      // Navigate to new version, clearing any activity filter
      void navigate(`/process-definitions/${key}`);
    },
    [navigate]
  );

  const handleElementClick = useCallback((elementId: string) => {
    // Update URL with activityId - this syncs with the filter
    const newParams = new URLSearchParams(searchParams);
    newParams.set('activityId', elementId);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleActivityFilterChange = useCallback((activityId: string | undefined) => {
    // Sync URL with filter changes from the table
    // This is called when the activity filter changes in the table
    const newParams = new URLSearchParams(searchParams);
    if (activityId) {
      newParams.set('activityId', activityId);
    } else {
      newParams.delete('activityId');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleStartInstance = useCallback(() => {
    setStartDialogOpen(true);
  }, []);

  const handleStartDialogClose = useCallback(() => {
    setStartDialogOpen(false);
  }, []);

  const handleInstanceCreated = useCallback(
    (instanceKey: string) => {
      setSnackbar({
        open: true,
        message: t('processes:messages.instanceCreated'),
        key: instanceKey,
      });
      setRefreshKey((k) => k + 1);
    },
    [t]
  );

  const handleEditDefinition = useCallback(() => {
    void navigate(`/designer/process/${processDefinitionKey}`);
  }, [navigate, processDefinitionKey]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar({ open: false, message: '' });
  }, []);

  const navigateToInstance = useCallback(
    (key: string) => {
      void navigate(`/process-instances/${key}`);
    },
    [navigate]
  );

  // Build additional metadata fields
  const additionalFields = useMemo((): MetadataField[] => {
    if (!processDefinition) return [];

    return [
      {
        label: t('processes:fields.bpmnProcessId'),
        value: processDefinition.bpmnProcessId,
      },
    ];
  }, [processDefinition, t]);

  return {
    processDefinition,
    versions,
    activityIds,
    loading,
    error,
    elementStatistics,
    selectedActivityId,
    startDialogOpen,
    snackbar,
    additionalFields,
    refreshKey,
    handleVersionChange,
    handleElementClick,
    handleActivityFilterChange,
    handleStartInstance,
    handleStartDialogClose,
    handleInstanceCreated,
    handleEditDefinition,
    handleSnackbarClose,
    navigateToInstance,
  };
}
