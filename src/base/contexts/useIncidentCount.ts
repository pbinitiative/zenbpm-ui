import { useContext } from 'react';
import { IncidentCountContext, type IncidentCountContextType } from './IncidentCountContext';

export const useIncidentCount = (): IncidentCountContextType => {
  const context = useContext(IncidentCountContext);
  if (!context) {
    throw new Error('useIncidentCount must be used within an IncidentCountProvider');
  }
  return context;
};
