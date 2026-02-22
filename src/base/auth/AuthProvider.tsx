import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'oidc-client-ts';
import { AuthContext, type AuthContextType, type AuthUser } from './AuthContext';
import { getUserManager, isAuthEnabled } from './userManager';

interface AuthProviderProps {
  children: ReactNode;
}

const STUB_CONTEXT: AuthContextType = {
  isAuthenticated: true,
  isLoading: false,
  isLoggingOut: false,
  user: null,
  accessToken: null,
  login: async () => {},
  logout: async () => {},
};

const toAuthUser = (user: User): AuthUser => {
  const profile = user.profile;
  return {
    sub: profile.sub,
    name: profile.name,
    email: profile.email,
    preferred_username: profile.preferred_username as string | undefined,
    given_name: profile.given_name,
    family_name: profile.family_name,
  };
};

const AuthEnabledProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userManager = useMemo(() => getUserManager(), []);

  useEffect(() => {
    // Load existing session on mount
    void userManager.getUser().then((existingUser) => {
      if (existingUser && !existingUser.expired) {
        setUser(existingUser);
      }
      setIsLoading(false);
    });

    // Subscribe to user events
    const onUserLoaded = (loadedUser: User) => {
      setUser(loadedUser);
      setIsLoading(false);
    };

    const onUserUnloaded = () => {
      setUser(null);
    };

    const onSilentRenewError = () => {
      setUser(null);
    };

    const onAccessTokenExpired = () => {
      setUser(null);
    };

    userManager.events.addUserLoaded(onUserLoaded);
    userManager.events.addUserUnloaded(onUserUnloaded);
    userManager.events.addSilentRenewError(onSilentRenewError);
    userManager.events.addAccessTokenExpired(onAccessTokenExpired);

    return () => {
      userManager.events.removeUserLoaded(onUserLoaded);
      userManager.events.removeUserUnloaded(onUserUnloaded);
      userManager.events.removeSilentRenewError(onSilentRenewError);
      userManager.events.removeAccessTokenExpired(onAccessTokenExpired);
    };
  }, [userManager]);

  const login = useCallback(async () => {
    await userManager.signinRedirect({
      state: { returnUrl: window.location.pathname + window.location.search },
    });
  }, [userManager]);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    await userManager.signoutRedirect();
  }, [userManager]);

  const contextValue: AuthContextType = useMemo(
    () => ({
      isAuthenticated: !!user && !user.expired,
      isLoading,
      isLoggingOut,
      user: user ? toAuthUser(user) : null,
      accessToken: user?.access_token ?? null,
      login,
      logout,
    }),
    [user, isLoading, isLoggingOut, login, logout],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  if (!isAuthEnabled()) {
    return <AuthContext.Provider value={STUB_CONTEXT}>{children}</AuthContext.Provider>;
  }

  return <AuthEnabledProvider>{children}</AuthEnabledProvider>;
};
