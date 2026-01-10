import { useState, useEffect, useCallback } from 'react';
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
} from '@base/openapi';

interface UseInstanceDataResult {
  processInstance: ProcessInstance | null;
  processDefinition: ProcessDefinition | null;
  jobs: Job[];
  history: FlowElementHistory[];
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  refetchJobs: () => Promise<void>;
  refetchIncidents: () => Promise<void>;
  refetchVariables: () => Promise<void>;
}

export const useInstanceData = (processInstanceKey: string | undefined): UseInstanceDataResult => {
  const [processInstance, setProcessInstance] = useState<ProcessInstance | null>(null);
  const [processDefinition, setProcessDefinition] = useState<ProcessDefinition | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [history, setHistory] = useState<FlowElementHistory[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs for the process instance
  const fetchJobs = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getProcessInstanceJobs((processInstanceKey as unknown) as number, { page: 1, size: 100 });
      setJobs((data.items || []) as Job[]);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  }, [processInstanceKey]);

  // Fetch incidents for the process instance
  const fetchIncidents = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getIncidents((processInstanceKey as unknown) as number, { page: 1, size: 100 });
      setIncidents((data.items || []) as Incident[]);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    }
  }, [processInstanceKey]);

  // Fetch process instance (which includes variables)
  const fetchVariables = useCallback(async () => {
    if (!processInstanceKey) return;
    try {
      const data = await getProcessInstance((processInstanceKey as unknown) as number);
      setProcessInstance(data as unknown as ProcessInstance);
    } catch (err) {
      console.error('Failed to fetch process instance:', err);
    }
  }, [processInstanceKey]);

  // Initial data fetch
  useEffect(() => {
    if (!processInstanceKey) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch process instance
        // Cast to unknown then number to preserve precision for large int64 keys
        const instanceData = await getProcessInstance((processInstanceKey as unknown) as number);
        setProcessInstance(instanceData as unknown as ProcessInstance);

        // Fetch process definition for BPMN diagram
        try {
          const definitionData = await getProcessDefinition(instanceData.processDefinitionKey);
          setProcessDefinition(definitionData as unknown as ProcessDefinition);
        } catch {
          // Process definition fetch failure is not critical
        }

        // Fetch jobs
        try {
          const jobsData = await getProcessInstanceJobs((processInstanceKey as unknown) as number, { page: 1, size: 100 });
          setJobs((jobsData.items || []) as Job[]);
        } catch {
          // Jobs fetch failure is not critical
        }

        // Fetch history
        try {
          const historyData = await getHistory((processInstanceKey as unknown) as number, { page: 1, size: 100 });
          setHistory((historyData.items || []) as FlowElementHistory[]);
        } catch {
          // History fetch failure is not critical
        }

        // Fetch incidents
        try {
          const incidentsData = await getIncidents((processInstanceKey as unknown) as number, { page: 1, size: 100 });
          setIncidents((incidentsData.items || []) as Incident[]);
        } catch {
          // Incidents fetch failure is not critical
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load process instance');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [processInstanceKey]);

  return {
    processInstance,
    processDefinition,
    jobs,
    history,
    incidents,
    loading,
    error,
    refetchJobs: fetchJobs,
    refetchIncidents: fetchIncidents,
    refetchVariables: fetchVariables,
  };
};
