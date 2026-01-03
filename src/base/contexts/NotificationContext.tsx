import { useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert, CircularProgress } from '@mui/material';
import type { AlertColor } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { NotificationContext } from './notificationContextDef';

export type { NotificationContextType } from './notificationContextDef';
export { NotificationContext } from './notificationContextDef';

type NotificationType = 'alert' | 'loading';

interface Notification {
  id: number;
  message: string;
  severity: AlertColor;
  type: NotificationType;
  isComplete?: boolean;
}

let notificationId = 0;

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const showNotification = useCallback((message: string, severity: AlertColor = 'info') => {
    const id = ++notificationId;
    setNotifications((prev) => [...prev, { id, message, severity, type: 'alert' }]);
  }, []);

  const showSuccess = useCallback((message: string) => showNotification(message, 'success'), [showNotification]);
  const showError = useCallback((message: string) => showNotification(message, 'error'), [showNotification]);
  const showWarning = useCallback((message: string) => showNotification(message, 'warning'), [showNotification]);
  const showInfo = useCallback((message: string) => showNotification(message, 'info'), [showNotification]);

  const showLoading = useCallback((message: string): number => {
    const id = ++notificationId;
    setNotifications((prev) => [...prev, { id, message, severity: 'info', type: 'loading' }]);
    return id;
  }, []);

  const dismissLoading = useCallback((id: number) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const completeLoading = useCallback((id: number, successMessage?: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, isComplete: true, message: successMessage || n.message, severity: 'success' as AlertColor }
          : n
      )
    );
    // Auto-dismiss after showing success
    const timeout = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      timeoutsRef.current.delete(id);
    }, 2000);
    timeoutsRef.current.set(id, timeout);
  }, []);

  const handleClose = useCallback((id: number) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ showNotification, showSuccess, showError, showWarning, showInfo, showLoading, completeLoading, dismissLoading }}
    >
      {children}
      {notifications.map((notification, index) => {
        // Get the appropriate icon based on notification type and severity
        const getIcon = () => {
          if (notification.type === 'loading') {
            if (notification.isComplete) {
              return <CheckCircleIcon fontSize="inherit" sx={{ color: 'success.main' }} />;
            }
            return <CircularProgress size={20} sx={{ color: 'primary.main' }} />;
          }
          // Standard alert icons with colors
          switch (notification.severity) {
            case 'success':
              return <CheckCircleIcon fontSize="inherit" sx={{ color: 'success.main' }} />;
            case 'error':
              return <ErrorIcon fontSize="inherit" sx={{ color: 'error.main' }} />;
            case 'warning':
              return <WarningIcon fontSize="inherit" sx={{ color: 'warning.main' }} />;
            case 'info':
            default:
              return <InfoIcon fontSize="inherit" sx={{ color: 'info.main' }} />;
          }
        };

        return (
          <Snackbar
            key={notification.id}
            open
            autoHideDuration={notification.type === 'loading' && !notification.isComplete ? null : 4000}
            onClose={() => handleClose(notification.id)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            sx={{
              bottom: { xs: 24 + index * 60, sm: 24 + index * 60 },
            }}
          >
            <Alert
              onClose={() => handleClose(notification.id)}
              severity={notification.severity}
              variant="outlined"
              icon={getIcon()}
              sx={{
                width: '100%',
                minWidth: 300,
                bgcolor: 'background.paper',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '& .MuiAlert-message': {
                  color: 'text.primary',
                },
                '& .MuiAlert-action': {
                  color: 'text.secondary',
                },
              }}
            >
              {notification.message}
            </Alert>
          </Snackbar>
        );
      })}
    </NotificationContext.Provider>
  );
};

