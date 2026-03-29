'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<AdminNotification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: AdminNotification = {
      ...notification,
      id,
      dismissible: notification.dismissible ?? true,
      duration: notification.duration ?? (notification.type === 'error' ? 0 : 5000),
    };

    setNotifications(prev => [...prev, newNotification]);

    if (newNotification.duration && newNotification.duration > 0 && !newNotification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [removeNotification]);

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
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full">
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

const TYPE_STYLES: Record<NotificationType, string> = {
  success: 'border-emerald-300 bg-emerald-50',
  error: 'border-red-300 bg-red-50',
  warning: 'border-amber-300 bg-amber-50',
  info: 'border-blue-300 bg-blue-50',
};

const TYPE_ICONS: Record<NotificationType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

function AdminNotificationItem({
  notification,
  onDismiss,
}: {
  notification: AdminNotification;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-lg animate-in slide-in-from-right ${TYPE_STYLES[notification.type]}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{TYPE_ICONS[notification.type]}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900">{notification.title}</h4>
          <p className="text-sm text-neutral-600 mt-0.5">{notification.message}</p>
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    if (!notification.persistent) onDismiss();
                  }}
                  className={
                    action.variant === 'primary'
                      ? 'btn btn--primary btn--sm'
                      : 'btn btn--ghost btn--sm'
                  }
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {notification.dismissible && (
          <button
            onClick={onDismiss}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 -mt-1 -mr-1"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
