import { useContext } from 'react';
import { ModalsContext, type ModalsContextValue } from './ModalsContextBase';

export function useModalsContext(): ModalsContextValue {
  const ctx = useContext(ModalsContext);
  if (!ctx) throw new Error('useModalsContext must be used within ModalsProvider');
  return ctx;
}
