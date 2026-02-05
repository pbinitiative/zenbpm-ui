import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ModalsProvider } from '@components/Modals';

async function enableMocking() {
  // Only enable mocking in development mode
  if (!import.meta.env.DEV) {
    return Promise.resolve();
  }

  // Check if MSW should be enabled based on API strategy
  const { shouldEnableMsw, worker } = await import('./mocks/browser');

  if (!shouldEnableMsw()) {
    console.log('[MSW] Disabled - using live backend');
    return Promise.resolve();
  }

  // Start the worker with onUnhandledRequest set to bypass
  // This means requests to the real API will pass through if not mocked
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}

void enableMocking().then(() => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ModalsProvider>
        <App />
      </ModalsProvider>
    </StrictMode>
  );
});
