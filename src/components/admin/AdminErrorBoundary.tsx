'use client';

import { Component, ReactNode } from 'react';

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

    // Log error for monitoring
    console.error('Admin Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfoString);

    // Call custom error handler if provided
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

  return (
    <div className="admin-error-boundary">
      <div className="error-container">
        <div className="error-icon">
          {isAuthError ? '🔒' : isDatabaseError ? '💾' : isNetworkError ? '🌐' : '⚠️'}
        </div>
        
        <h2 className="error-title">
          {isAuthError ? 'Access Denied' : 
           isDatabaseError ? 'Database Error' :
           isNetworkError ? 'Connection Error' :
           'Something went wrong'}
        </h2>
        
        <p className="error-message">
          {isAuthError ? 
            'You don\'t have permission to access this admin feature. Please contact an administrator if you believe this is an error.' :
           isDatabaseError ?
            'There was a problem connecting to the database. Please try again in a few moments.' :
           isNetworkError ?
            'Unable to connect to the server. Please check your internet connection and try again.' :
            'An unexpected error occurred in the admin panel. Our team has been notified.'}
        </p>

        <div className="error-actions">
          <button 
            onClick={resetError}
            className="retry-button primary"
          >
            Try Again
          </button>
          
          <button 
            onClick={() => window.location.href = '/admin'}
            className="home-button secondary"
          >
            Return to Admin Dashboard
          </button>
          
          {!isAuthError && (
            <button 
              onClick={() => window.location.reload()}
              className="refresh-button secondary"
            >
              Refresh Page
            </button>
          )}
        </div>

        <details className="error-details">
          <summary>Technical Details</summary>
          <div className="error-technical">
            <p><strong>Error:</strong> {error.message}</p>
            <p><strong>Type:</strong> {error.name}</p>
            {errorInfo && (
              <div>
                <p><strong>Component Stack:</strong></p>
                <pre className="error-stack">{errorInfo}</pre>
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
    <AdminErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="admin-error-boundary user-management-error">
          <div className="error-container">
            <div className="error-icon">👥</div>
            <h2>User Management Error</h2>
            <p>There was a problem loading the user management interface.</p>
            <div className="error-actions">
              <button onClick={resetError} className="retry-button primary">
                Try Again
              </button>
              <button 
                onClick={() => window.location.href = '/admin'}
                className="home-button secondary"
              >
                Return to Dashboard
              </button>
            </div>
            <details className="error-details">
              <summary>Error Details</summary>
              <p>{error.message}</p>
            </details>
          </div>
        </div>
      )}
    >
      {children}
    </AdminErrorBoundary>
  );
}

export function AdminPlantErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <AdminErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="admin-error-boundary plant-management-error">
          <div className="error-container">
            <div className="error-icon">🌱</div>
            <h2>Plant Management Error</h2>
            <p>There was a problem loading the plant management interface.</p>
            <div className="error-actions">
              <button onClick={resetError} className="retry-button primary">
                Try Again
              </button>
              <button 
                onClick={() => window.location.href = '/admin/plants'}
                className="home-button secondary"
              >
                Return to Plant Management
              </button>
            </div>
            <details className="error-details">
              <summary>Error Details</summary>
              <p>{error.message}</p>
            </details>
          </div>
        </div>
      )}
    >
      {children}
    </AdminErrorBoundary>
  );
}

export function AdminAuditErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <AdminErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="admin-error-boundary audit-error">
          <div className="error-container">
            <div className="error-icon">📋</div>
            <h2>Audit Log Error</h2>
            <p>There was a problem loading the audit logs.</p>
            <div className="error-actions">
              <button onClick={resetError} className="retry-button primary">
                Try Again
              </button>
              <button 
                onClick={() => window.location.href = '/admin'}
                className="home-button secondary"
              >
                Return to Dashboard
              </button>
            </div>
            <details className="error-details">
              <summary>Error Details</summary>
              <p>{error.message}</p>
            </details>
          </div>
        </div>
      )}
    >
      {children}
    </AdminErrorBoundary>
  );
}