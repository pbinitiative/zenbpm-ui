import { useContext } from 'react';
import { NotificationContext, type NotificationContextType } from './NotificationContext';

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
