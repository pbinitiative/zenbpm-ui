import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  ProcessInstance,
  ProcessDefinition,
  Job,
  FlowElementHistory,
  Incident,
} from '../types';
import type { DecisionInstanceSummary } from '@base/openapi';
import {
  getProcessInstance,
  getProcessDefinition,
  getProcessInstanceJobs,
  getHistory,
  getIncidents,
  getChildProcessInstances,
  getProcessInstanceElementStatistics,
  useGetProcessInstanceElementStatistics,
  getDecisionInstances,
} from '@base/openapi';
import { transformStatisticsToElementStatistics } from '@components/BpmnDiagram';
import type { ElementStatistics } from '@components/BpmnDiagram';

// States that indicate the process instance is finished and doesn't need periodic refresh
export const TERMINAL_STATES = ['completed', 'terminated'];

// Refresh interval in milliseconds (5 seconds)
const AUTO_REFRESH_INTERVAL = 5000;

interface UseInstanceDataResult {
  processInstance: ProcessInstance | null;
  processDefinition: ProcessDefinition | null;
  jobs: Job[];
  history: FlowElementHistory[];
  incidents: Incident[];
  childProcesses: ProcessInstance[];
  childProcessesTotalCount: number | undefined;
  childProcessJobs: Record<string, Job[]>;
  childProcessIncidents: Record<string, Incident[]>;
  grandchildProcesses: Record<string, ProcessInstance[]>;
  childProcessHistory: FlowElementHistory[];
  decisionInstances: DecisionInstanceSummary[];
  childProcessDecisionInstances: Record<string, DecisionInstanceSummary[]>;
  elementStatistics: ElementStatistics | undefined;
  loading: boolean;
  error: string | null;
  refetchJobs: () => Promise<void>;
  refetchIncidents: () => Promise<void>;
  refetchVariables: () => Promise<void>;
  refetchHistory: () => Promise<void>;
  refetchChildProcesses: () => Promise<void>;
  refetchDecisionInstances: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

export const useInstanceData = (processInstanceKey: string | undefined): UseInstanceDataResult => {
  const [processInstance, setProcessInstance] = useState<ProcessInstance | null>(null);
  const [processDefinition, setProcessDefinition] = useState<ProcessDefinition | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<FlowElementHistory[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [childProcesses, setChildProcesses] = useState<ProcessInstance[]>([]);
  const [childProcessesTotalCount, setChildProcessesTotalCount] = useState<number>();
  const [childProcessJobs, setChildProcessJobs] = useState<Record<string, Job[]>>({});
  const [childProcessIncidents, setChildProcessIncidents] = useState<Record<string, Incident[]>>({});
  const [grandchildProcesses, setGrandchildProcesses] = useState<Record<string, ProcessInstance[]>>({});
  const [childProcessHistory, setChildProcessHistory] = useState<FlowElementHistory[]>([]);
  const [subprocessElementStatistics, setSubprocessElementStatistics] = useState<ElementStatistics | undefined>(undefined);
  const [decisionInstances, setDecisionInstances] = useState<DecisionInstanceSummary[]>([]);
  const [childProcessDecisionInstances, setChildProcessDecisionInstances] = useState<Record<string, DecisionInstanceSummary[]>>({});
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
      const data = await getHistory(processInstanceKey, { page: 1, size: -1 });
      setHistory((data.items || []) as FlowElementHistory[]);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, [processInstanceKey]);

  // Fetch decision instances for the root process instance
  const fetchDecisionInstances = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getDecisionInstances({ processInstanceKey, size: 100 });
      const items = (data.partitions || []).flatMap((p) => p.items || []);
      setDecisionInstances(items);
    } catch (err) {
      console.error('Failed to fetch decision instances:', err);
    }
  }, [processInstanceKey]);

  // Fetch child processes, their jobs, and grandchild process instances
  const fetchChildProcesses = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getChildProcessInstances(processInstanceKey, { page: 1, size: 100 });
      // Flatten partitions into a single list of process instances
      const instances = (data.partitions || []).flatMap(p => p.items || []);
      setChildProcesses(instances as ProcessInstance[]);
      setChildProcessesTotalCount((data as { totalCount?: number }).totalCount);

      // Fetch jobs, grandchild processes, history, incidents, and decision instances for each child in parallel
      const [jobResults, grandchildResults, historyResults, incidentResults, decisionResults] = await Promise.all([
        Promise.all(
          instances.map(async (child) => {
            try {
              const jobData = await getProcessInstanceJobs(child.key, { page: 1, size: 100 });
              return [child.key, (jobData.items || []) as Job[]] as const;
            } catch {
              return [child.key, [] as Job[]] as const;
            }
          })
        ),
        Promise.all(
          instances.map(async (child) => {
            try {
              const grandchildData = await getChildProcessInstances(child.key, { page: 1, size: 100 });
              const grandchildren = (grandchildData.partitions || []).flatMap(p => p.items || []);
              return [child.key, grandchildren as ProcessInstance[]] as const;
            } catch {
              return [child.key, [] as ProcessInstance[]] as const;
            }
          })
        ),
        Promise.all(
          instances.map(async (child) => {
            try {
              const historyData = await getHistory(child.key, { page: 1, size: -1 });
              return (historyData.items || []) as FlowElementHistory[];
            } catch {
              return [] as FlowElementHistory[];
            }
          })
        ),
        Promise.all(
          instances.map(async (child) => {
            try {
              const incidentData = await getIncidents(child.key, { page: 1, size: 100 });
              return [child.key, (incidentData.items || []) as Incident[]] as const;
            } catch {
              return [child.key, [] as Incident[]] as const;
            }
          })
        ),
        Promise.all(
          instances.map(async (child) => {
            try {
              const decisionData = await getDecisionInstances({ processInstanceKey: child.key, size: 100 });
              const items = (decisionData.partitions || []).flatMap((p) => p.items || []);
              return [child.key, items] as const;
            } catch {
              return [child.key, [] as DecisionInstanceSummary[]] as const;
            }
          })
        ),
      ]);

      setGrandchildProcesses(Object.fromEntries(grandchildResults));

      // Collect all subprocess-typed grandchildren for the next fetch round
      const subprocessGrandchildren = grandchildResults.flatMap(([, grandchildren]) =>
        (grandchildren as ProcessInstance[]).filter((gc) => gc.processType === 'subprocess')
      );

      // Fetch jobs, incidents, decisions, and history for subprocess-grandchildren in parallel
      const [
        grandchildSubprocessJobResults,
        grandchildSubprocessIncidentResults,
        grandchildSubprocessDecisionResults,
        grandchildSubprocessHistoryResults,
      ] = await Promise.all([
        Promise.all(
          subprocessGrandchildren.map(async (gc) => {
            try {
              const jobData = await getProcessInstanceJobs(gc.key, { page: 1, size: 100 });
              return [gc.key, (jobData.items || []) as Job[]] as const;
            } catch {
              return [gc.key, [] as Job[]] as const;
            }
          })
        ),
        // Fetch incidents for subprocess-grandchildren
        Promise.all(
          subprocessGrandchildren.map(async (gc) => {
            try {
              const incidentData = await getIncidents(gc.key, { page: 1, size: 100 });
              return [gc.key, (incidentData.items || []) as Incident[]] as const;
            } catch {
              return [gc.key, [] as Incident[]] as const;
            }
          })
        ),
        // Fetch decision instances for subprocess-grandchildren
        Promise.all(
          subprocessGrandchildren.map(async (gc) => {
            try {
              const decisionData = await getDecisionInstances({ processInstanceKey: gc.key, size: 100 });
              const items = (decisionData.partitions || []).flatMap((p) => p.items || []);
              return [gc.key, items] as const;
            } catch {
              return [gc.key, [] as DecisionInstanceSummary[]] as const;
            }
          })
        ),
        // Fetch history for subprocess-grandchildren
        Promise.all(
          subprocessGrandchildren.map(async (gc) => {
            try {
              const historyData = await getHistory(gc.key, { page: 1, size: -1 });
              return (historyData.items || []) as FlowElementHistory[];
            } catch {
              return [] as FlowElementHistory[];
            }
          })
        ),
      ]);

      setChildProcessHistory([...historyResults.flat(), ...grandchildSubprocessHistoryResults.flat()]);

      // Merge direct-child jobs and subprocess-grandchild jobs into a single map
      setChildProcessJobs(Object.fromEntries([...jobResults, ...grandchildSubprocessJobResults]));

      // Merge direct-child incidents and subprocess-grandchild incidents into a single map
      setChildProcessIncidents(Object.fromEntries([...incidentResults, ...grandchildSubprocessIncidentResults]));

      // Merge direct-child decisions and subprocess-grandchild decisions into a single map
      setChildProcessDecisionInstances(Object.fromEntries([...decisionResults, ...grandchildSubprocessDecisionResults]));

      // Fetch element statistics for subprocess-type children and grandchildren
      // These are embedded subprocesses whose elements appear in the parent BPMN diagram
      const subprocessInstances = [
        ...instances.filter((child) => child.processType === 'subprocess'),
        ...subprocessGrandchildren,
      ];

      if (subprocessInstances.length > 0) {
        const subprocessStatResults = await Promise.all(
          subprocessInstances.map(async (sp) => {
            try {
              const statsData = await getProcessInstanceElementStatistics(sp.key);
              return transformStatisticsToElementStatistics(statsData);
            } catch {
              return undefined;
            }
          })
        );

        // Merge all subprocess element statistics into a single map, summing counts per elementId
        const merged: ElementStatistics = {};
        for (const stats of subprocessStatResults) {
          if (!stats) continue;
          for (const [elementId, counts] of Object.entries(stats)) {
            if (!merged[elementId]) {
              merged[elementId] = { activeCount: 0, incidentCount: 0 };
            }
            merged[elementId].activeCount += counts.activeCount;
            merged[elementId].incidentCount += counts.incidentCount;
          }
        }
        setSubprocessElementStatistics(Object.keys(merged).length > 0 ? merged : undefined);
      } else {
        setSubprocessElementStatistics(undefined);
      }
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
      fetchDecisionInstances(),
    ]);
  }, [processInstanceKey, fetchProcessInstance, fetchJobs, fetchHistory, fetchIncidents, fetchChildProcesses, fetchDecisionInstances]);

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

        // Fetch jobs, history, incidents, child processes (with their sub-data), and decision instances in parallel
        await Promise.all([
          getProcessInstanceJobs(processInstanceKey, { page: 1, size: 100 })
            .then((d) => setJobs((d.items || []) as Job[]))
            .catch(() => {}),
          getHistory(processInstanceKey, { page: 1, size: -1 })
            .then((d) => setHistory((d.items || []) as FlowElementHistory[]))
            .catch(() => {}),
          getIncidents(processInstanceKey, { page: 1, size: 100 })
            .then((d) => setIncidents((d.items || []) as Incident[]))
            .catch(() => {}),
          fetchChildProcesses(),
          fetchDecisionInstances(),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load process instance');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [processInstanceKey, fetchChildProcesses, fetchDecisionInstances]);

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

  // Fetch element statistics for the BPMN diagram overlays
  const { data: rawElementStatistics } = useGetProcessInstanceElementStatistics(
    processInstanceKey ?? '',
    {
      query: {
        enabled: !!processInstanceKey && !!processDefinition,
        refetchInterval: AUTO_REFRESH_INTERVAL,
      },
    }
  );

  const elementStatistics = useMemo(
    () => {
      const base = transformStatisticsToElementStatistics(rawElementStatistics);
      if (!subprocessElementStatistics) return base;
      if (!base) return subprocessElementStatistics;
      // Merge subprocess statistics into the base stats, summing counts per elementId
      const merged: ElementStatistics = { ...base };
      for (const [elementId, counts] of Object.entries(subprocessElementStatistics)) {
        if (!merged[elementId]) {
          merged[elementId] = { activeCount: 0, incidentCount: 0 };
        }
        merged[elementId] = {
          activeCount: merged[elementId].activeCount + counts.activeCount,
          incidentCount: merged[elementId].incidentCount + counts.incidentCount,
        };
      }
      return merged;
    },
    [rawElementStatistics, subprocessElementStatistics]
  );

  return {
    processInstance,
    processDefinition,
    jobs,
    history,
    incidents,
    childProcesses,
    childProcessesTotalCount,
    childProcessJobs,
    childProcessIncidents,
    grandchildProcesses,
    childProcessHistory,
    decisionInstances,
    childProcessDecisionInstances,
    elementStatistics,
    loading,
    error,
    refetchJobs: fetchJobs,
    refetchIncidents: fetchIncidents,
    refetchVariables: fetchProcessInstance,
    refetchHistory: fetchHistory,
    refetchChildProcesses: fetchChildProcesses,
    refetchDecisionInstances: fetchDecisionInstances,
    refetchAll: fetchAll,
  };
};
