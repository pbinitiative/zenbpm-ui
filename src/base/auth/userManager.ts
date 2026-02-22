import { UserManager, type UserManagerSettings } from 'oidc-client-ts';

let instance: UserManager | null = null;

export const isAuthEnabled = (): boolean => {
  return import.meta.env.VITE_AUTH_ENABLED === 'true';
};

export const getUserManager = (): UserManager => {
  if (!isAuthEnabled()) {
    throw new Error('Auth is not enabled. Check VITE_AUTH_ENABLED environment variable.');
  }

  if (!instance) {
    const settings: UserManagerSettings = {
      authority: import.meta.env.VITE_OIDC_ISSUER ?? '',
      client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? '',
      redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI ?? `${window.location.origin}/auth/callback`,
      post_logout_redirect_uri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI ?? window.location.origin,
      scope: import.meta.env.VITE_OIDC_SCOPE ?? 'openid profile email',
      response_type: 'code',
      automaticSilentRenew: true,
    };

    instance = new UserManager(settings);
  }

  return instance;
};
