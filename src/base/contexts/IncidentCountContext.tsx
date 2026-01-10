import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { IncidentCountContext } from './incidentCountContextDef';
import { getGlobalIncidents } from '@base/openapi';

export type { IncidentCountContextType } from './incidentCountContextDef';
export { IncidentCountContext } from './incidentCountContextDef';

const POLL_INTERVAL = 60000; // 1 minute

interface IncidentCountProviderProps {
  children: ReactNode;
}

export const IncidentCountProvider = ({ children }: IncidentCountProviderProps) => {
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const isMountedRef = useRef(true);

  const fetchIncidentCount = useCallback(async () => {
    try {
      const data = await getGlobalIncidents({ state: 'unresolved', size: 1 });
      if (isMountedRef.current) {
        setUnresolvedCount(data.totalCount ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch incident count:', error);
    }
  }, []);

  // Initial fetch and periodic polling combined
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch - async callback sets state after data arrives
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Async fetch with setState in callback is valid pattern
    fetchIncidentCount();

    // Periodic polling
    const intervalId = setInterval(fetchIncidentCount, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchIncidentCount]);

  const refreshCount = useCallback(() => {
    fetchIncidentCount();
  }, [fetchIncidentCount]);

  return (
    <IncidentCountContext.Provider value={{ unresolvedCount, refreshCount }}>
      {children}
    </IncidentCountContext.Provider>
  );
};
