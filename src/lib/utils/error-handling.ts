import { useState } from 'react';

/**
 * Standardized error handling utilities for consistent error states across components
 */

export interface ErrorState {
  message: string;
  code?: string;
  retryable?: boolean;
  details?: any;
}

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

export interface AsyncOperationState {
  loading: LoadingState;
  error: ErrorState | null;
  success: boolean;
}

/**
 * Creates a standardized error state object
 */
export function createErrorState(
  error: unknown,
  defaultMessage = 'An unexpected error occurred',
  retryable = true
): ErrorState {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      retryable,
      details: error
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      retryable
    };
  }

  return {
    message: defaultMessage,
    retryable,
    details: error
  };
}

/**
 * Creates a standardized loading state object
 */
export function createLoadingState(
  isLoading: boolean,
  operation?: string,
  progress?: number
): LoadingState {
  return {
    isLoading,
    operation,
    progress
  };
}

/**
 * Hook for managing async operation state
 */
export function useAsyncOperationState(initialState?: Partial<AsyncOperationState>) {
  const [state, setState] = useState<AsyncOperationState>({
    loading: { isLoading: false },
    error: null,
    success: false,
    ...initialState
  });

  const setLoading = (loading: boolean, operation?: string, progress?: number) => {
    setState(prev => ({
      ...prev,
      loading: createLoadingState(loading, operation, progress),
      error: loading ? null : prev.error, // Clear error when starting new operation
      success: false
    }));
  };

  const setError = (error: unknown, retryable = true) => {
    setState(prev => ({
      ...prev,
      loading: { isLoading: false },
      error: createErrorState(error, undefined, retryable),
      success: false
    }));
  };

  const setSuccess = () => {
    setState(prev => ({
      ...prev,
      loading: { isLoading: false },
      error: null,
      success: true
    }));
  };

  const reset = () => {
    setState({
      loading: { isLoading: false },
      error: null,
      success: false
    });
  };

  return {
    ...state,
    setLoading,
    setError,
    setSuccess,
    reset
  };
}

/**
 * Standardized error display component props
 */
export interface ErrorDisplayProps {
  error: ErrorState;
  onRetry?: () => void;
  className?: string;
  showDetails?: boolean;
}

/**
 * Standardized loading display component props
 */
export interface LoadingDisplayProps {
  loading: LoadingState;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

/**
 * Utility to determine if an operation should be retryable based on error type
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors are usually retryable
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return true;
    }
    
    // Server errors (5xx) are retryable, client errors (4xx) usually aren't
    const statusMatch = error.message.match(/(\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      return status >= 500;
    }
  }
  
  return true; // Default to retryable
}

/**
 * Utility to extract user-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      return 'You are not authorized to perform this action. Please sign in again.';
    }
    
    if (error.message.includes('403') || error.message.includes('forbidden')) {
      return 'You do not have permission to perform this action.';
    }
    
    if (error.message.includes('404') || error.message.includes('not found')) {
      return 'The requested resource was not found.';
    }
    
    if (error.message.includes('500') || error.message.includes('internal server')) {
      return 'A server error occurred. Please try again later.';
    }
    
    // Return the original message if it's user-friendly
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Debounced error handler to prevent error spam
 */
export function createDebouncedErrorHandler(
  handler: (error: ErrorState) => void,
  delay = 1000
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastError: string | null = null;
  
  return (error: unknown) => {
    const errorState = createErrorState(error);
    
    // Don't show the same error multiple times quickly
    if (lastError === errorState.message && timeoutId) {
      return;
    }
    
    lastError = errorState.message;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      handler(errorState);
      timeoutId = null;
      lastError = null;
    }, delay);
  };
}