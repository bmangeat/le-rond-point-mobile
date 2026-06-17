import { config } from '@/config';
import { tokenStore } from './tokenStore';
import type { AuthTokens } from '@/types';

/**
 * Zero-dependency HTTP client built on the platform `fetch` (RN/Hermes).
 * Chosen over axios to drop a recurring-CVE dependency and shrink the bundle.
 * Keeps an axios-like surface (`api.get(...).then(r => r.data)`) plus:
 * - attaches the access token on every request,
 * - on 401, refreshes via /auth/refresh (single-flight) and replays once,
 * - on refresh failure, clears tokens and notifies listeners (→ logout).
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: unknown = null,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | null = null;
/** Registered by AuthProvider to force a logout when the session is dead. */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

interface RequestOptions {
  method?: string;
  /** Object → JSON; FormData → sent as-is (boundary set by the runtime). */
  body?: unknown;
  headers?: Record<string, string>;
  /** Internal: skip auth header + refresh handling (used by /auth/refresh). */
  skipAuth?: boolean;
  /** Internal: marks the single replay after a successful refresh. */
  retried?: boolean;
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T }> {
  const headers: Record<string, string> = { ...opts.headers };
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;

  let body: BodyInit | undefined;
  if (opts.body != null) {
    if (isForm) {
      body = opts.body as FormData; // let fetch set multipart boundary
      delete headers['Content-Type'];
    } else {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  if (!opts.skipAuth) {
    const tokens = await tokenStore.get();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(config.apiBaseUrl + path, { method: opts.method ?? 'GET', headers, body });
  } catch {
    throw new ApiError('Impossible de joindre le serveur.', 0, null, 'ERR_NETWORK');
  }

  // Transparent refresh on 401 (once), except on auth routes.
  if (res.status === 401 && !opts.retried && !opts.skipAuth && !path.includes('/auth/')) {
    const fresh = await refreshTokens();
    if (fresh) return request<T>(path, { ...opts, retried: true });
    onUnauthorized?.();
  }

  const data = parseBody(await res.text());
  if (!res.ok) {
    const msg = (data as { message?: string | string[] })?.message;
    throw new ApiError(
      (Array.isArray(msg) ? msg[0] : msg) ?? `Erreur ${res.status}`,
      res.status,
      data,
    );
  }
  return { data: data as T };
}

// --- Single-flight refresh ---
let refreshing: Promise<AuthTokens | null> | null = null;

function refreshTokens(): Promise<AuthTokens | null> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<AuthTokens | null> {
  const tokens = await tokenStore.get();
  if (!tokens?.refreshToken) return null;
  try {
    const { data } = await request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken },
      skipAuth: true,
    });
    await tokenStore.set(data);
    return data;
  } catch {
    await tokenStore.clear();
    return null;
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  // Supports an axios-style `{ data }` body for DELETE (e.g. push unsubscribe).
  delete: <T>(path: string, opts?: RequestOptions & { data?: unknown }) =>
    request<T>(path, { ...opts, method: 'DELETE', body: opts?.data ?? opts?.body }),
};

/** Normalizes an error into a user-facing French message. */
export function apiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof ApiError) {
    if (error.code === 'ERR_NETWORK') return 'Impossible de joindre le serveur.';
    if (error.message) return error.message;
  }
  return fallback;
}
