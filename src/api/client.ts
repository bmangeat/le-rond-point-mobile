import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { config } from '@/config';
import { tokenStore } from './tokenStore';
import type { AuthTokens } from '@/types';

/**
 * Single axios instance for the whole app.
 * - Attaches the access token on every request.
 * - On 401, transparently refreshes via POST /auth/refresh and replays once.
 * - On refresh failure, clears tokens and notifies listeners (→ logout).
 */
export const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
});

let onUnauthorized: (() => void) | null = null;
/** Registered by AuthProvider to force a logout when the session is dead. */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
  const tokens = await tokenStore.get();
  if (tokens?.accessToken) {
    cfg.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  return cfg;
});

// --- 401 refresh handling (single-flight) ---
let refreshing: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  const tokens = await tokenStore.get();
  if (!tokens?.refreshToken) return null;
  try {
    // Bare axios call to avoid the interceptor loop.
    const { data } = await axios.post<AuthTokens>(`${config.apiBaseUrl}/auth/refresh`, {
      refreshToken: tokens.refreshToken,
    });
    await tokenStore.set(data);
    return data;
  } catch {
    await tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      refreshing = refreshing ?? refreshTokens();
      const fresh = await refreshing;
      refreshing = null;

      if (fresh) {
        original.headers.set('Authorization', `Bearer ${fresh.accessToken}`);
        return api(original);
      }
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Normalizes an axios error into a user-facing French message. */
export function apiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message[0] : data.message;
    }
    if (error.code === 'ERR_NETWORK') return 'Impossible de joindre le serveur.';
  }
  return fallback;
}
