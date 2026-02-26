import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ProcessInstance,
  ProcessDefinition,
  Job,
  FlowElementHistory,
  Incident,
} from '../types';
import {
  getProcessInstance,
  getProcessDefinition,
  getProcessInstanceJobs,
  getHistory,
  getIncidents,
  getChildProcessInstances,
} from '@base/openapi';

// States that indicate the process instance is finished and doesn't need periodic refresh
const TERMINAL_STATES = ['completed', 'terminated', 'canceled'];

// Refresh interval in milliseconds (5 seconds)
const AUTO_REFRESH_INTERVAL = 5000;

interface UseInstanceDataResult {
  processInstance: ProcessInstance | null;
  processDefinition: ProcessDefinition | null;
  jobs: Job[];
  history: FlowElementHistory[];
  incidents: Incident[];
  childProcesses: ProcessInstance[];
  loading: boolean;
  error: string | null;
  refetchJobs: () => Promise<void>;
  refetchIncidents: () => Promise<void>;
  refetchVariables: () => Promise<void>;
  refetchHistory: () => Promise<void>;
  refetchChildProcesses: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

export const useInstanceData = (processInstanceKey: string | undefined): UseInstanceDataResult => {
  const [processInstance, setProcessInstance] = useState<ProcessInstance | null>(null);
  const [processDefinition, setProcessDefinition] = useState<ProcessDefinition | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<FlowElementHistory[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [childProcesses, setChildProcesses] = useState<ProcessInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs for the process instance
  const fetchJobs = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getProcessInstanceJobs(processInstanceKey, { page: 1, size: 100 });
      setJobs((data.items || []) as Job[]);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  }, [processInstanceKey]);

  // Fetch incidents for the process instance
  const fetchIncidents = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getIncidents(processInstanceKey, { page: 1, size: 100 });
      setIncidents((data.items || []) as Incident[]);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  }, [processInstanceKey]);

  // Fetch process instance (which includes variables and active elements)
  const fetchProcessInstance = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getProcessInstance(processInstanceKey);
      setProcessInstance(data as unknown as ProcessInstance);
    } catch (err) {
      console.error('Failed to fetch process instance:', err);
    }
  }, [processInstanceKey]);

  // Fetch history for the process instance
  const fetchHistory = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getHistory(processInstanceKey, { page: 1, size: 100 });
      setHistory((data.items || []) as FlowElementHistory[]);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, [processInstanceKey]);

  // Fetch child processes for the process instance
  const fetchChildProcesses = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getChildProcessInstances(processInstanceKey, { page: 1, size: 100 });
      // Flatten partitions into a single list of process instances
      const instances = (data.partitions || []).flatMap(p => p.items || []);
      setChildProcesses(instances as ProcessInstance[]);
    } catch (err) {
      console.error('Failed to fetch child processes:', err);
    }
  }, [processInstanceKey]);

  // Fetch all data (useful after actions that can affect multiple things)
  const fetchAll = useCallback(async () => {
    if (!processInstanceKey) return;
    await Promise.all([
      fetchProcessInstance(),
      fetchJobs(),
      fetchHistory(),
      fetchIncidents(),
      fetchChildProcesses(),
    ]);
  }, [processInstanceKey, fetchProcessInstance, fetchJobs, fetchHistory, fetchIncidents, fetchChildProcesses]);

  // Initial data fetch
  useEffect(() => {
    if (!processInstanceKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch process instance
        // Cast to unknown then number to preserve precision for large int64 keys
        const instanceData = await getProcessInstance(processInstanceKey);
        setProcessInstance(instanceData as unknown as ProcessInstance);

        // Fetch process definition for BPMN diagram
        try {
          const definitionData = await getProcessDefinition(instanceData.processDefinitionKey);
          setProcessDefinition(definitionData as unknown as ProcessDefinition);
        } catch {
          // Process definition fetch failure is not critical
        }

        // Fetch jobs, history, incidents, child processes in parallel
        try {
          const [jobsData, historyData, incidentsData, childProcessesData] = await Promise.all([
            getProcessInstanceJobs(processInstanceKey, { page: 1, size: 100 }).catch(() => ({ items: [] })),
            getHistory(processInstanceKey, { page: 1, size: 100 }).catch(() => ({ items: [] })),
            getIncidents(processInstanceKey, { page: 1, size: 100 }).catch(() => ({ items: [] })),
            getChildProcessInstances(processInstanceKey, { page: 1, size: 100 }).catch(() => ({ partitions: [] })),
          ]);

          setJobs((jobsData.items || []) as Job[]);
          setHistory((historyData.items || []) as FlowElementHistory[]);
          setIncidents((incidentsData.items || []) as Incident[]);
          
          const instances = (childProcessesData.partitions || []).flatMap(p => p.items || []);
          setChildProcesses(instances as ProcessInstance[]);
        } catch {
          // Individual fetch failures are handled by .catch above
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load process instance');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [processInstanceKey]);

  // Track if auto-refresh should be active
  const isActiveInstance = processInstance && !TERMINAL_STATES.includes(processInstance.state);
  const fetchAllRef = useRef(fetchAll);
  fetchAllRef.current = fetchAll;

  // Periodic auto-refresh for active instances
  useEffect(() => {
    if (!processInstanceKey || loading || !isActiveInstance) return;

    const intervalId = setInterval(() => {
      void fetchAllRef.current();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [processInstanceKey, loading, isActiveInstance]);

  return {
    processInstance,
    processDefinition,
    jobs,
    history,
    incidents,
    childProcesses,
    loading,
    error,
    refetchJobs: fetchJobs,
    refetchIncidents: fetchIncidents,
    refetchVariables: fetchProcessInstance,
    refetchHistory: fetchHistory,
    refetchChildProcesses: fetchChildProcesses,
    refetchAll: fetchAll,
  };
};
