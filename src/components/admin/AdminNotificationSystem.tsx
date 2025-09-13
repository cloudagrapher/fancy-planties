'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
  dismissible?: boolean;
  persistent?: boolean;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface AdminNotificationContextType {
  notifications: AdminNotification[];
  addNotification: (notification: Omit<AdminNotification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  showSuccess: (title: string, message: string, actions?: NotificationAction[]) => string;
  showError: (title: string, message: string, actions?: NotificationAction[]) => string;
  showWarning: (title: string, message: string, actions?: NotificationAction[]) => string;
  showInfo: (title: string, message: string, actions?: NotificationAction[]) => string;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | null>(null);

export function useAdminNotifications() {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error('useAdminNotifications must be used within AdminNotificationProvider');
  }
  return context;
}

interface AdminNotificationProviderProps {
  children: ReactNode;
}

export function AdminNotificationProvider({ children }: AdminNotificationProviderProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const addNotification = useCallback((notification: Omit<AdminNotification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: AdminNotification = {
      ...notification,
      id,
      dismissible: notification.dismissible ?? true,
      duration: notification.duration ?? (notification.type === 'error' ? 0 : 5000),
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration (if not persistent)
    if (newNotification.duration && newNotification.duration > 0 && !newNotification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((title: string, message: string, actions?: NotificationAction[]) => {
    return addNotification({ type: 'success', title, message, actions });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, actions?: NotificationAction[]) => {
    return addNotification({ type: 'error', title, message, actions, duration: 0 });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, actions?: NotificationAction[]) => {
    return addNotification({ type: 'warning', title, message, actions });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, actions?: NotificationAction[]) => {
    return addNotification({ type: 'info', title, message, actions });
  }, [addNotification]);

  const value: AdminNotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
      <AdminNotificationContainer />
    </AdminNotificationContext.Provider>
  );
}

function AdminNotificationContainer() {
  const { notifications, removeNotification } = useAdminNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="admin-notification-container">
      {notifications.map((notification) => (
        <AdminNotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface AdminNotificationItemProps {
  notification: AdminNotification;
  onDismiss: () => void;
}

function AdminNotificationItem({ notification, onDismiss }: AdminNotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`admin-notification ${notification.type}`}>
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">{getIcon()}</span>
          <h4 className="notification-title">{notification.title}</h4>
          {notification.dismissible && (
            <button 
              onClick={onDismiss}
              className="notification-close"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          )}
        </div>
        
        <p className="notification-message">{notification.message}</p>
        
        {notification.actions && notification.actions.length > 0 && (
          <div className="notification-actions">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  if (!notification.persistent) {
                    onDismiss();
                  }
                }}
                className={`notification-action ${action.variant || 'secondary'}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Specialized notification hooks for common admin operations
export function useBulkOperationNotifications() {
  const { showSuccess, showError, showWarning, showInfo } = useAdminNotifications();

  const notifyBulkStart = useCallback((operation: string, count: number) => {
    return showInfo(
      'Bulk Operation Started',
      `Processing ${operation} for ${count} items...`,
      []
    );
  }, [showInfo]);

  const notifyBulkSuccess = useCallback((operation: string, successCount: number, totalCount: number) => {
    return showSuccess(
      'Bulk Operation Completed',
      `Successfully ${operation} ${successCount} of ${totalCount} items.`
    );
  }, [showSuccess]);

  const notifyBulkPartialSuccess = useCallback((
    operation: string, 
    successCount: number, 
    failureCount: number, 
    errors: Array<{ id: number; error: string }>
  ) => {
    return showWarning(
      'Bulk Operation Partially Completed',
      `${operation} completed for ${successCount} items, but ${failureCount} failed.`,
      [
        {
          label: 'View Errors',
          action: () => {
            // Show detailed error modal
            console.log('Bulk operation errors:', errors);
          },
          variant: 'secondary',
        },
        {
          label: 'Retry Failed',
          action: () => {
            // Retry failed items
            console.log('Retrying failed items:', errors.map(e => e.id));
          },
          variant: 'primary',
        },
      ]
    );
  }, [showWarning]);

  const notifyBulkError = useCallback((operation: string, error: string) => {
    return showError(
      'Bulk Operation Failed',
      `Failed to ${operation}: ${error}`,
      [
        {
          label: 'Retry',
          action: () => {
            // Retry the operation
            console.log('Retrying bulk operation');
          },
          variant: 'primary',
        },
      ]
    );
  }, [showError]);

  return {
    notifyBulkStart,
    notifyBulkSuccess,
    notifyBulkPartialSuccess,
    notifyBulkError,
  };
}

export function useAuthorizationNotifications() {
  const { showError, showWarning } = useAdminNotifications();

  const notifyUnauthorized = useCallback(() => {
    return showError(
      'Access Denied',
      'You don\'t have permission to perform this action.',
      [
        {
          label: 'Return to Dashboard',
          action: () => {
            window.location.href = '/admin';
          },
          variant: 'primary',
        },
      ]
    );
  }, [showError]);

  const notifySessionExpired = useCallback(() => {
    return showWarning(
      'Session Expired',
      'Your session has expired. Please sign in again.',
      [
        {
          label: 'Sign In',
          action: () => {
            window.location.href = '/auth/signin';
          },
          variant: 'primary',
        },
      ]
    );
  }, [showWarning]);

  const notifyCuratorRequired = useCallback(() => {
    return showError(
      'Curator Access Required',
      'This feature requires curator privileges.',
      [
        {
          label: 'Contact Admin',
          action: () => {
            // Open contact form or email
            console.log('Contact admin for curator access');
          },
          variant: 'secondary',
        },
      ]
    );
  }, [showError]);

  return {
    notifyUnauthorized,
    notifySessionExpired,
    notifyCuratorRequired,
  };
}

export function useFormValidationNotifications() {
  const { showError, showWarning } = useAdminNotifications();

  const notifyValidationErrors = useCallback((errors: Record<string, string>) => {
    const errorCount = Object.keys(errors).length;
    const firstError = Object.values(errors)[0];
    
    return showError(
      'Validation Failed',
      errorCount === 1 ? firstError : `${errorCount} validation errors found.`,
      [
        {
          label: 'Review Form',
          action: () => {
            // Scroll to first error field
            const firstErrorField = document.querySelector('.field-error');
            if (firstErrorField) {
              firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          },
          variant: 'primary',
        },
      ]
    );
  }, [showError]);

  const notifyUnsavedChanges = useCallback(() => {
    return showWarning(
      'Unsaved Changes',
      'You have unsaved changes that will be lost if you leave this page.',
      [
        {
          label: 'Save Changes',
          action: () => {
            // Trigger save
            console.log('Saving changes');
          },
          variant: 'primary',
        },
        {
          label: 'Discard Changes',
          action: () => {
            // Discard changes
            console.log('Discarding changes');
          },
          variant: 'secondary',
        },
      ]
    );
  }, [showWarning]);

  return {
    notifyValidationErrors,
    notifyUnsavedChanges,
  };
}