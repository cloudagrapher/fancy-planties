'use client';

import { Component, type ReactNode } from 'react';

interface AdminErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface AdminErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<AdminErrorFallbackProps>;
  onError?: (error: Error, errorInfo: string) => void;
}

interface AdminErrorFallbackProps {
  error: Error;
  errorInfo: string;
  resetError: () => void;
}

export default class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorInfoString = errorInfo.componentStack || 'No component stack available';
    
    this.setState({
      errorInfo: errorInfoString,
    });

    console.error('Admin Error Boundary caught an error:', error);

    if (this.props.onError) {
      this.props.onError(error, errorInfoString);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultAdminErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo || ''}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultAdminErrorFallback({ error, errorInfo, resetError }: AdminErrorFallbackProps) {
  const isAuthError = error.message.includes('Unauthorized') || 
                     error.message.includes('Curator privileges') ||
                     error.message.includes('Authentication');

  const isDatabaseError = error.message.includes('database') ||
                         error.message.includes('connection') ||
                         error.message.includes('query');

  const isNetworkError = error.message.includes('fetch') ||
                        error.message.includes('network') ||
                        error.message.includes('timeout');

  const icon = isAuthError ? '🔒' : isDatabaseError ? '💾' : isNetworkError ? '🌐' : '⚠️';

  const title = isAuthError ? 'Access Denied' : 
    isDatabaseError ? 'Database Error' :
    isNetworkError ? 'Connection Error' :
    'Something went wrong';

  const message = isAuthError ? 
    'You don\'t have permission to access this admin feature. Please contact an administrator if you believe this is an error.' :
    isDatabaseError ?
    'There was a problem connecting to the database. Please try again in a few moments.' :
    isNetworkError ?
    'Unable to connect to the server. Please check your internet connection and try again.' :
    'An unexpected error occurred in the admin panel. Our team has been notified.';

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8 bg-neutral-50 rounded-lg m-4">
      <div className="max-w-lg text-center bg-white p-8 rounded-xl shadow-md border border-neutral-200">
        <span className="text-5xl mb-4 block">{icon}</span>
        
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">{title}</h2>
        
        <p className="text-neutral-600 mb-6 leading-relaxed">{message}</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button 
            onClick={resetError}
            className="btn btn--primary"
          >
            Try Again
          </button>
          
          <button 
            onClick={() => window.location.href = '/admin'}
            className="btn btn--ghost"
          >
            Return to Admin Dashboard
          </button>
          
          {!isAuthError && (
            <button 
              onClick={() => window.location.reload()}
              className="btn btn--ghost"
            >
              Refresh Page
            </button>
          )}
        </div>

        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-700">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600 font-mono overflow-auto">
            <p><strong>Error:</strong> {error.message}</p>
            <p><strong>Type:</strong> {error.name}</p>
            {errorInfo && (
              <div className="mt-2">
                <p><strong>Component Stack:</strong></p>
                <pre className="whitespace-pre-wrap break-words mt-1 text-[11px] max-h-48 overflow-auto">
                  {errorInfo}
                </pre>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

// Specialized error boundaries for different admin sections
export function AdminUserErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <AdminErrorBoundary>
      {children}
    </AdminErrorBoundary>
  );
}

export function AdminPlantErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <AdminErrorBoundary>
      {children}
    </AdminErrorBoundary>
  );
}

export function AdminAuditErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <AdminErrorBoundary>
      {children}
    </AdminErrorBoundary>
  );
}
