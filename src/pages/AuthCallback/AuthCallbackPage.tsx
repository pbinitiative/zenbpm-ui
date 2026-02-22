import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { ns } from '@base/i18n';
import { isAuthEnabled } from '@base/auth';
import { getUserManager } from '@base/auth/userManager';

interface OidcState {
  returnUrl?: string;
}

export const AuthCallbackPage = () => {
  const { t } = useTranslation([ns.auth]);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthEnabled()) {
      void navigate('/', { replace: true });
      return;
    }

    const processCallback = async () => {
      try {
        const userManager = getUserManager();
        const user = await userManager.signinRedirectCallback();
        const state = user.state as OidcState | undefined;
        const returnUrl = state?.returnUrl ?? '/';
        void navigate(returnUrl, { replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    };

    void processCallback();
  }, [navigate]);

  const handleRetry = () => {
    if (!isAuthEnabled()) {
      return;
    }
    void getUserManager().signinRedirect();
  };

  if (error) {
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
        <Typography variant="h6" color="error">
          {t('auth:callback.error')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
        <Button variant="contained" onClick={handleRetry}>
          {t('auth:callback.retry')}
        </Button>
      </Box>
    );
  }

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
        {t('auth:callback.processing')}
      </Typography>
    </Box>
  );
};
