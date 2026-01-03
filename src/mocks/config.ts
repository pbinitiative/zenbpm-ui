// Mock configuration - adjust these values to test loading states
import { apiStrategyConfig } from './apiStrategy';

export const mockConfig: { delay: number | 'real' } = {
  /**
   * Delay in milliseconds before mock responses are returned.
   * Configured via VITE_MOCK_DELAY environment variable.
   * Set to 0 for instant responses, or higher values (e.g., 1000-2000) to test loading states.
   *
   * You can also use 'real' for realistic network latency simulation.
   */
  delay: apiStrategyConfig.mockDelay,
};

/**
 * Helper to get the current delay value.
 * Can be called at runtime to get the configured delay.
 */
export const getDelay = (): number | 'real' => mockConfig.delay;

/**
 * Set the mock delay at runtime.
 * Useful for testing different loading scenarios.
 *
 * @example
 * // In browser console:
 * window.__setMockDelay(2000); // 2 second delay
 * window.__setMockDelay(0);    // instant
 * window.__setMockDelay('real'); // realistic latency
 */
export const setMockDelay = (delay: number | 'real'): void => {
  mockConfig.delay = delay;
  console.log(`Mock delay set to: ${delay}${typeof delay === 'number' ? 'ms' : ''}`);
};

// Expose to window for easy console access during development
if (typeof window !== 'undefined') {
  (window as unknown as { __setMockDelay: typeof setMockDelay }).__setMockDelay = setMockDelay;
  (window as unknown as { __mockConfig: typeof mockConfig }).__mockConfig = mockConfig;
}
