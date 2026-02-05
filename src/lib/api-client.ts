'use client';

/**
 * CSRF-aware API fetch client.
 *
 * The middleware enforces double-submit-cookie CSRF protection on all
 * authenticated POST / PUT / DELETE / PATCH requests. This wrapper:
 *   1. Lazily fetches a CSRF token from GET /api/csrf on the first mutation.
 *   2. Caches it for subsequent calls.
 *   3. Attaches it as the `x-csrf-token` header (the cookie half is set
 *      automatically by the /api/csrf response).
 *   4. On a CSRF-related 403, refreshes the token and retries once.
 *
 * Usage:
 *   import { apiFetch } from '@/lib/api-client';
 *   const res = await apiFetch('/api/plants', { method: 'POST', body: ... });
 */

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/csrf');
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  const data = await response.json();
  const token: string = data.csrfToken;
  csrfToken = token;
  return token;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  // Deduplicate concurrent requests for the token
  if (!csrfPromise) {
    csrfPromise = fetchCsrfToken().finally(() => {
      csrfPromise = null;
    });
  }
  return csrfPromise;
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/**
 * Drop-in replacement for `fetch()` that automatically handles CSRF tokens
 * for state-changing requests (POST, PUT, DELETE, PATCH).
 *
 * GET / HEAD / OPTIONS requests pass through unchanged.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();

  if (MUTATION_METHODS.has(method)) {
    const token = await getCsrfToken();
    const headers = new Headers(options.headers);
    headers.set('x-csrf-token', token);
    options = { ...options, headers };
  }

  const response = await fetch(url, options);

  // If we got a CSRF-related 403, refresh the token and retry once.
  if (response.status === 403 && MUTATION_METHODS.has(method)) {
    const body = await response.clone().json().catch(() => null);
    if (body?.error && typeof body.error === 'string' && body.error.toLowerCase().includes('csrf')) {
      csrfToken = null; // invalidate cache
      const freshToken = await getCsrfToken();
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('x-csrf-token', freshToken);
      return fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return response;
}

/**
 * Clear the cached CSRF token (e.g. on sign-out so the next session
 * doesn't reuse a stale token).
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}
