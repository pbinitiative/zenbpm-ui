/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Backend API Strategy
   * - mocks: All endpoints are mocked
   * - live: All endpoints call real backend
   * - live-with-exceptions: Live backend, specified endpoints are mocked
   * - mocks-with-exceptions: Mocked, specified endpoints call real backend
   */
  readonly VITE_API_STRATEGY: 'mocks' | 'live' | 'live-with-exceptions' | 'mocks-with-exceptions';

  /**
   * Backend API base URL
   */
  readonly VITE_API_BASE_URL: string;

  /**
   * Mock response delay in milliseconds or 'real' for realistic latency
   */
  readonly VITE_MOCK_DELAY?: string;

  /**
   * Comma-separated patterns for endpoints to MOCK (used with live-with-exceptions)
   * Example: "/process-definitions/**,/incidents"
   */
  readonly VITE_MOCK_ENDPOINTS?: string;

  /**
   * Comma-separated patterns for endpoints to call LIVE (used with mocks-with-exceptions)
   * Example: "/jobs/**,/messages"
   */
  readonly VITE_LIVE_ENDPOINTS?: string;

  /** Enable OIDC authentication ('true' to enable) */
  readonly VITE_AUTH_ENABLED?: string;

  /** OIDC Issuer URL (e.g., https://keycloak.example.com/realms/myrealm) */
  readonly VITE_OIDC_ISSUER?: string;

  /** OIDC Client ID */
  readonly VITE_OIDC_CLIENT_ID?: string;

  /** OIDC Redirect URI after login */
  readonly VITE_OIDC_REDIRECT_URI?: string;

  /** OIDC Redirect URI after logout */
  readonly VITE_OIDC_POST_LOGOUT_REDIRECT_URI?: string;

  /** OIDC Scopes (default: 'openid profile email') */
  readonly VITE_OIDC_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
