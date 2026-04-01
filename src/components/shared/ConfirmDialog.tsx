'use client';

import { useEffect } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable confirmation dialog with Escape key support, body scroll lock,
 * and focus trapping for keyboard accessibility.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmClassName = 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div ref={focusTrapRef} className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button onClick={onConfirm} className={confirmClassName}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
