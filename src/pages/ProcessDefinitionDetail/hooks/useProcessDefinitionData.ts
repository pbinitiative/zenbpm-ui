import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import type { MetadataField, VersionInfo } from '@components/DiagramDetailLayout';
import { transformStatisticsToElementStatistics } from '@components/BpmnDiagram';
import type { ElementStatistics } from '@components/BpmnDiagram';
import {
  getProcessDefinition,
  getProcessDefinitions,
  useGetProcessDefinitionElementStatistics,
} from '@base/openapi';
import { useStartInstanceDialog } from '@components/StartInstanceDialog';
import type { ProcessDefinition, SnackbarState } from '../types';
import { extractActivityIds } from '../utils';


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
  snackbar: SnackbarState;
  additionalFields: MetadataField[];
  refreshKey: number;
  handleVersionChange: (key: string) => void;
  handleElementClick: (elementId: string) => void;
  handleActivityFilterChange: (activityId: string | undefined) => void;
  handleClearAllFilters: () => void;
  handleStartInstance: () => void;
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
  const { openStartInstance } = useStartInstanceDialog();

  // Ref that always points at the latest searchParams. We can't rely on the
  // closure of useCallback because the table re-emits the same callback
  // identity across renders until its dependency (`searchParams`) changes;
  // if the next filter change fires before React re-renders with the new
  // searchParams, we'd build the new URL from a stale value and drop other
  // filter params (e.g. state=active) on the floor.
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  // State
  const [processDefinition, setProcessDefinition] = useState<ProcessDefinition | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    () => transformStatisticsToElementStatistics(rawElementStatistics),
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
    // Read the latest searchParams via a ref to avoid a race where the
    // callback is invoked before React has re-rendered with the new
    // searchParams and would otherwise overwrite other filter params.
    const newParams = new URLSearchParams(searchParamsRef.current);
    if (activityId) {
      newParams.set('activityId', activityId);
    } else {
      newParams.delete('activityId');
    }
    setSearchParams(newParams, { replace: true });
  }, [setSearchParams]);

  const handleClearAllFilters = useCallback(() => {
    // Clear All: remove every URL param. The debounced URL-sync effect in
    // useTableState would otherwise re-hydrate filters from the leftover URL
    // params (e.g. state) and unmount the Clear All button before Playwright
    // can click it.
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

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

  const handleStartInstance = useCallback(() => {
    if (!processDefinition) return;
    openStartInstance({
      processDefinitionKey: processDefinition.key,
      processName: processDefinition.bpmnProcessName || processDefinition.bpmnProcessId,
      onSuccess: handleInstanceCreated,
    });
  }, [processDefinition, openStartInstance, handleInstanceCreated]);

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
    snackbar,
    additionalFields,
    refreshKey,
    handleVersionChange,
    handleElementClick,
    handleActivityFilterChange,
    handleClearAllFilters,
    handleStartInstance,
    handleInstanceCreated,
    handleEditDefinition,
    handleSnackbarClose,
    navigateToInstance,
  };
}
