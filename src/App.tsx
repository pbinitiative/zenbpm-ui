import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@base/theme';
import { router } from '@base/router';
import { NotificationProvider, IncidentCountProvider } from '@base/contexts';
import '@base/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <IncidentCountProvider>
            <RouterProvider router={router} />
          </IncidentCountProvider>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
