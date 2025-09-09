'use client';

import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import type { ErrorDisplayProps } from '@/lib/utils/error-handling';

export default function ErrorDisplay({
  error,
  onRetry,
  className = '',
  showDetails = false,
}: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Error
          </h3>
          
          <div className="mt-2 text-sm text-red-700">
            <p role="alert" aria-live="polite">
              {error.message}
            </p>
            
            {showDetails && error.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                  Show technical details
                </summary>
                <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-auto">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
          
          {error.retryable && onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline error display for forms
export function InlineErrorDisplay({ 
  error, 
  className = '' 
}: { 
  error: string | null; 
  className?: string; 
}) {
  if (!error) return null;

  return (
    <div className={`flex items-center mt-1 text-sm text-red-600 ${className}`} role="alert">
      <X className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}

// Toast-style error notification
export function ErrorToast({
  error,
  onDismiss,
  className = '',
}: {
  error: string;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 rounded-md"
          >
            <span className="sr-only">Dismiss</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}