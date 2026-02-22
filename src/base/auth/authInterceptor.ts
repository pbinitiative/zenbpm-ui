import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getUserManager, isAuthEnabled } from './userManager';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _authRetry?: boolean;
  }
}

export const setupAuthInterceptor = (axiosInstance: AxiosInstance): void => {
  if (!isAuthEnabled()) {
    return;
  }

  const userManager = getUserManager();

  // Request interceptor: attach Bearer token
  axiosInstance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const user = await userManager.getUser();
    if (user?.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }
    return config;
  });

  // Response interceptor: handle 401 with token refresh + single retry
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && originalRequest && !originalRequest._authRetry) {
        originalRequest._authRetry = true;

        try {
          const user = await userManager.signinSilent();
          if (user?.access_token) {
            originalRequest.headers.Authorization = `Bearer ${user.access_token}`;
            return await axiosInstance(originalRequest);
          }
        } catch {
          // Silent renew failed, redirect to login
          await userManager.signinRedirect({
            state: { returnUrl: window.location.pathname + window.location.search },
          });
        }
      }

      return Promise.reject(error);
    },
  );
};
