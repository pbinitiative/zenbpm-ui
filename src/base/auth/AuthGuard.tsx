import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { ns } from '@base/i18n';
import { useAuth } from './useAuth';
import { isAuthEnabled } from './userManager';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { t } = useTranslation([ns.auth]);
  const { isAuthenticated, isLoading, isLoggingOut, login } = useAuth();

  useEffect(() => {
    if (!isAuthEnabled()) {
      return;
    }

    if (!isLoading && !isAuthenticated && !isLoggingOut) {
      void login();
    }
  }, [isLoading, isAuthenticated, isLoggingOut, login]);

  if (!isAuthEnabled()) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          {t('auth:loading')}
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Will redirect via the useEffect above
    return null;
  }

  return <>{children}</>;
};
