import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import type { Session } from "next-auth";

type AuthConfig = InternalAxiosRequestConfig & { authRetried?: boolean };
type Dependencies = {
  enabled: () => boolean;
  getSession: () => Promise<Session | null>;
  refreshSession: () => Promise<Session | null>;
  logout: () => Promise<unknown>;
};
const publicAuthPaths = new Set(["/auth/login", "/auth/register", "/auth/google", "/auth/forgot-password", "/auth/verify-otp", "/auth/reset-password", "/auth/verify-signup-otp", "/auth/resend-signup-otp", "/auth/refresh-token"]);

export function installAuthInterceptors(api: AxiosInstance, dependencies: Dependencies) {
  let refreshing: Promise<Session | null> | undefined;
  let loggingOut: Promise<unknown> | undefined;
  const logout = () => loggingOut ||= dependencies.logout();
  const expired = (config: AuthConfig) => new AxiosError("Your session has expired. Please log in again.", "AUTH_SESSION_EXPIRED", config);
  const protectedRequest = (config: AuthConfig) => dependencies.enabled() && !publicAuthPaths.has(config.url?.split("?")[0] || "");

  api.interceptors.request.use(async (config: AuthConfig) => {
    if (protectedRequest(config)) {
      const session = await dependencies.getSession();
      if (!session?.accessToken || session.error) {
        await logout();
        throw expired(config);
      }
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  });
  api.interceptors.response.use(response => response, async (error: AxiosError) => {
    const config = error.config as AuthConfig | undefined;
    if (error.response?.status !== 401 || !config || !protectedRequest(config)) throw error;
    if (config.authRetried) { await logout(); throw expired(config); }
    config.authRetried = true;
    if (!refreshing) {
      refreshing = dependencies.refreshSession().catch(() => null);
      const pending = refreshing;
      void pending.finally(() => { if (refreshing === pending) refreshing = undefined; });
    }
    const session = await refreshing;
    if (!session?.accessToken || session.error) { await logout(); throw expired(config); }
    config.headers.Authorization = `Bearer ${session.accessToken}`;
    return api(config);
  });
}
