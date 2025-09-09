'use client';

import type { LoadingDisplayProps } from '@/lib/utils/error-handling';

export default function LoadingSpinner({
  loading,
  className = '',
  size = 'md',
  showProgress = false,
}: LoadingDisplayProps) {
  if (!loading.isLoading) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const containerClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]} ${className}`}>
      <div className="relative">
        <svg
          className={`animate-spin ${sizeClasses[size]} text-primary-600`}
          fill="none"
          viewBox="0 0 24 24"
          role="status"
          aria-label={loading.operation || 'Loading'}
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        
        {/* Progress indicator */}
        {showProgress && loading.progress !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-primary-600">
              {Math.round(loading.progress)}%
            </span>
          </div>
        )}
      </div>
      
      {/* Loading text */}
      {loading.operation && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          <span aria-live="polite">{loading.operation}</span>
          {showProgress && loading.progress !== undefined && (
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${loading.progress}%` }}
              />
            </div>
          )}
        </div>
      )}
      
      <span className="sr-only">
        {loading.operation || 'Loading content, please wait...'}
      </span>
    </div>
  );
}

// Inline loading spinner for buttons
export function InlineLoadingSpinner({ 
  size = 'sm', 
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string; 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}