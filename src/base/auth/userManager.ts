import { UserManager, type UserManagerSettings } from 'oidc-client-ts';

let instance: UserManager | null = null;

/**
 * Read a config value from runtime config (Docker) first, then fall back to Vite env.
 * This allows env vars to be injected at container startup without rebuilding.
 */
function getConfig(key: string): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).__RUNTIME_CONFIG__?.[key] ?? (import.meta.env[key] as string | undefined);
}

export const isAuthEnabled = (): boolean => {
  return getConfig('VITE_AUTH_ENABLED') === 'true';
};

export const getUserManager = (): UserManager => {
  if (!isAuthEnabled()) {
    throw new Error('Auth is not enabled. Check VITE_AUTH_ENABLED environment variable.');
  }

  if (!instance) {
    const settings: UserManagerSettings = {
      authority: getConfig('VITE_OIDC_ISSUER') ?? '',
      client_id: getConfig('VITE_OIDC_CLIENT_ID') ?? '',
      redirect_uri: getConfig('VITE_OIDC_REDIRECT_URI') ?? `${window.location.origin}/auth/callback`,
      post_logout_redirect_uri: getConfig('VITE_OIDC_POST_LOGOUT_REDIRECT_URI') ?? window.location.origin,
      scope: getConfig('VITE_OIDC_SCOPE') ?? 'openid profile email',
      response_type: 'code',
      automaticSilentRenew: true,
    };

    instance = new UserManager(settings);
  }

  return instance;
};
