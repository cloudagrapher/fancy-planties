'use client';

import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Extract an HTTP status code from an error object when available.
 * Works with plain Error objects that have a `status` property attached
 * (e.g. from apiFetch wrappers) as well as native fetch Response-like errors.
 */
function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status;
  }
  return undefined;
}

/**
 * Redirect to the sign-in page, preserving the current path so the user
 * can be sent back after re-authenticating.
 */
function redirectToSignIn() {
  const currentPath = window.location.pathname + window.location.search;
  const signInUrl = currentPath && currentPath !== '/'
    ? `/auth/signin?redirect=${encodeURIComponent(currentPath)}`
    : '/auth/signin';
  window.location.href = signInUrl;
}

export default function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
        retry: (failureCount, error) => {
          // Don't retry on auth errors — redirect to sign-in instead
          const status = getErrorStatus(error);
          if (status === 401) {
            redirectToSignIn();
            return false;
          }
          // Don't retry on 403 (forbidden / email verification required)
          if (status === 403) return false;
          // Don't retry on 404 (not found)
          if (status === 404) return false;
          // Retry transient errors up to 2 times
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: (failureCount, error) => {
          const status = getErrorStatus(error);
          // Never retry auth or client errors for mutations
          if (status && status >= 400 && status < 500) {
            if (status === 401) redirectToSignIn();
            return false;
          }
          // Retry server errors once
          return failureCount < 1;
        },
      },
    },
  }));

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
}