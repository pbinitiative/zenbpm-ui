import { createContext } from 'react';

export interface IncidentCountContextType {
  unresolvedCount: number;
  refreshCount: () => void;
}

export const IncidentCountContext = createContext<IncidentCountContextType | null>(null);
