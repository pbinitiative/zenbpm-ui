// MSW browser worker setup with API strategy support
import { setupWorker } from 'msw/browser';
import { http, passthrough, type RequestHandler } from 'msw';
import { handlers } from './handlers';
import {
  apiStrategyConfig,
  shouldMockRequest,
  isMswEnabled,
  logApiStrategyConfig,
  type ApiStrategyConfig,
} from './apiStrategy';

/**
 * Extract the API path from a handler's info
 */
function getHandlerPath(handler: RequestHandler): string | null {
  // MSW handlers have info.path for http handlers
  const info = handler.info as { path?: string };
  if (typeof info.path === 'string') {
    // Remove the base URL prefix if present (e.g., "/v1/process-definitions" -> "/process-definitions")
    return info.path.replace(/^\/v1/, '');
  }
  return null;
}

/**
 * Create a passthrough handler for paths that should go to the real backend
 */
function createPassthroughHandler(path: string): RequestHandler {
  // Create a handler that matches the path pattern and passes through to the real backend
  return http.all(`/v1${path}`, () => passthrough());
}

/**
 * Filter handlers based on the API strategy configuration
 */
function getFilteredHandlers(config: ApiStrategyConfig): RequestHandler[] {
  switch (config.strategy) {
    case 'mocks':
      // Use all mock handlers
      return handlers;

    case 'live':
      // No handlers needed - all requests go to backend
      return [];

    case 'live-with-exceptions': {
      // Only include handlers for endpoints that should be mocked
      return handlers.filter((handler) => {
        const path = getHandlerPath(handler);
        if (!path) return false;
        return shouldMockRequest(path, config);
      });
    }

    case 'mocks-with-exceptions': {
      // Include all handlers, but add passthrough handlers for live endpoints
      // The passthrough handlers need to be registered BEFORE the mock handlers
      const passthroughHandlers: RequestHandler[] = config.liveEndpoints.map((pattern) =>
        createPassthroughHandler(pattern.replace(/\*\*/g, '*').replace(/\*/g, ':param'))
      );

      // For mocks-with-exceptions, we filter out handlers that match live endpoints
      const filteredMockHandlers = handlers.filter((handler) => {
        const path = getHandlerPath(handler);
        if (!path) return true; // Keep handlers we can't identify
        return shouldMockRequest(path, config);
      });

      return [...passthroughHandlers, ...filteredMockHandlers];
    }

    default:
      return handlers;
  }
}

/**
 * Create the MSW worker with filtered handlers based on API strategy
 */
export function createWorker() {
  const filteredHandlers = getFilteredHandlers(apiStrategyConfig);

  if (import.meta.env.DEV) {
    logApiStrategyConfig(apiStrategyConfig);
    console.log(`[MSW] Registering ${filteredHandlers.length} handlers`);
  }

  return setupWorker(...filteredHandlers);
}

/**
 * Check if MSW should be enabled based on strategy
 */
export function shouldEnableMsw(): boolean {
  return isMswEnabled(apiStrategyConfig);
}

// Create the worker instance (lazy initialization)
let workerInstance: ReturnType<typeof setupWorker> | null = null;

export function getWorker() {
  if (!workerInstance) {
    workerInstance = createWorker();
  }
  return workerInstance;
}

// For backward compatibility
export const worker = createWorker();
