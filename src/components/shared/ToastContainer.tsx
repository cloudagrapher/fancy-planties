'use client';

import { memo } from 'react';
import type { Toast } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const toastStyles: Record<Toast['type'], string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

/**
 * Renders a stack of toast notifications fixed to the top-right.
 * Pair with the useToast() hook.
 */
function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`rounded-lg shadow-lg border p-4 pointer-events-auto animate-in slide-in-from-right ${toastStyles[toast.type]}`}
          role="alert"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 text-current opacity-60 hover:opacity-100 flex-shrink-0 p-1 rounded -mr-1 -my-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(ToastContainer);
