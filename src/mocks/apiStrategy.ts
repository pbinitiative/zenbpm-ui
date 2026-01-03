/**
 * Backend API Strategy Configuration
 *
 * Controls how API requests are handled:
 * - mocks: All endpoints are mocked using MSW
 * - live: All endpoints call the real backend
 * - live-with-exceptions: Live backend, but specified endpoints are mocked
 * - mocks-with-exceptions: Mocked, but specified endpoints call real backend
 */

export type ApiStrategy = 'mocks' | 'live' | 'live-with-exceptions' | 'mocks-with-exceptions';

export interface ApiStrategyConfig {
  strategy: ApiStrategy;
  apiBaseUrl: string;
  mockDelay: number | 'real';
  mockEndpoints: string[];
  liveEndpoints: string[];
}

/**
 * Parse comma-separated endpoint patterns from environment variable
 */
function parseEndpointPatterns(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);
}

/**
 * Parse mock delay from environment variable
 */
function parseMockDelay(envValue: string | undefined): number | 'real' {
  if (!envValue || envValue === 'real') return 'real';
  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) ? 'real' : parsed;
}

/**
 * Get the API strategy configuration from environment variables
 */
export function getApiStrategyConfig(): ApiStrategyConfig {
  const strategy = (import.meta.env.VITE_API_STRATEGY as ApiStrategy) || 'mocks';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1';
  const mockDelay = parseMockDelay(import.meta.env.VITE_MOCK_DELAY);
  const mockEndpoints = parseEndpointPatterns(import.meta.env.VITE_MOCK_ENDPOINTS);
  const liveEndpoints = parseEndpointPatterns(import.meta.env.VITE_LIVE_ENDPOINTS);

  return {
    strategy,
    apiBaseUrl,
    mockDelay,
    mockEndpoints,
    liveEndpoints,
  };
}

/**
 * Convert a glob-like pattern to a regex
 * Supports:
 *   - "/path" - exact match
 *   - "/path/*" - matches /path/anything (one level)
 *   - "/path/**" - matches /path and all nested paths
 */
function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters except * and **
  const regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Replace ** first (matches any path including slashes)
    .replace(/\*\*/g, '.*')
    // Replace remaining * (matches anything except slashes)
    .replace(/\*/g, '[^/]+');

  // Ensure the pattern matches from the start of the path
  return new RegExp(`^${regexStr}$`);
}

/**
 * Check if a request path matches any of the given patterns
 */
export function matchesPatterns(path: string, patterns: string[]): boolean {
  // Remove query string and hash from path
  const cleanPath = path.split('?')[0].split('#')[0];

  return patterns.some((pattern) => {
    const regex = patternToRegex(pattern);
    return regex.test(cleanPath);
  });
}

/**
 * Determine if a request should be mocked based on the strategy
 */
export function shouldMockRequest(path: string, config: ApiStrategyConfig): boolean {
  switch (config.strategy) {
    case 'mocks':
      // All requests should be mocked
      return true;

    case 'live':
      // No requests should be mocked
      return false;

    case 'live-with-exceptions':
      // Only mock if the path matches the mock endpoints
      return matchesPatterns(path, config.mockEndpoints);

    case 'mocks-with-exceptions':
      // Mock everything EXCEPT the live endpoints
      return !matchesPatterns(path, config.liveEndpoints);

    default:
      // Default to mocking for safety
      return true;
  }
}

/**
 * Check if MSW should be enabled at all
 */
export function isMswEnabled(config: ApiStrategyConfig): boolean {
  // MSW is needed for all strategies except 'live'
  return config.strategy !== 'live';
}

/**
 * Log the current API strategy configuration (for debugging)
 */
export function logApiStrategyConfig(config: ApiStrategyConfig): void {
  console.group('[API Strategy]');
  console.log(`Strategy: ${config.strategy}`);
  console.log(`API Base URL: ${config.apiBaseUrl}`);

  if (config.strategy !== 'live') {
    console.log(`Mock Delay: ${config.mockDelay === 'real' ? 'realistic' : config.mockDelay + 'ms'}`);
  }

  if (config.strategy === 'live-with-exceptions' && config.mockEndpoints.length > 0) {
    console.log('Mocked endpoints:', config.mockEndpoints);
  }

  if (config.strategy === 'mocks-with-exceptions' && config.liveEndpoints.length > 0) {
    console.log('Live endpoints:', config.liveEndpoints);
  }

  console.groupEnd();
}

// Export a singleton config instance
export const apiStrategyConfig = getApiStrategyConfig();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __apiStrategyConfig: ApiStrategyConfig }).__apiStrategyConfig =
    apiStrategyConfig;
}
