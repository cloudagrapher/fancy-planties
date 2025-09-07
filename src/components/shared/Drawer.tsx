'use client';

import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  position?: 'bottom' | 'top' | 'left' | 'right';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  height?: 'auto' | 'half' | 'full';
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  height = 'auto',
}: DrawerProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const getDrawerClasses = () => {
    const baseClasses = 'fixed bg-white shadow-2xl transition-transform duration-300 ease-out z-50';
    
    switch (position) {
      case 'bottom':
        return `${baseClasses} bottom-0 left-0 right-0 rounded-t-3xl transform ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } ${getHeightClasses()}`;
      case 'top':
        return `${baseClasses} top-0 left-0 right-0 rounded-b-3xl transform ${
          isOpen ? 'translate-y-0' : '-translate-y-full'
        } ${getHeightClasses()}`;
      case 'left':
        return `${baseClasses} top-0 bottom-0 left-0 rounded-r-3xl transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 max-w-[85vw]`;
      case 'right':
        return `${baseClasses} top-0 bottom-0 right-0 rounded-l-3xl transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-80 max-w-[85vw]`;
      default:
        return baseClasses;
    }
  };

  const getHeightClasses = () => {
    switch (height) {
      case 'half':
        return 'max-h-[50vh]';
      case 'full':
        return 'h-full';
      default:
        return 'max-h-[85vh]';
    }
  };

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
      />
      
      {/* Drawer */}
      <div className={getDrawerClasses()}>
        {/* Handle bar for bottom drawer */}
        {position === 'bottom' && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 touch-target--small"
                aria-label="Close drawer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 safe-area-inset-bottom">
          {children}
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}

// Action sheet component (bottom drawer with action buttons)
export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    variant?: 'default' | 'danger';
    disabled?: boolean;
    onClick: () => void;
  }>;
}

export function ActionSheet({ isOpen, onClose, title, actions }: ActionSheetProps) {
  const handleActionClick = (action: ActionSheetProps['actions'][0]) => {
    if (!action.disabled) {
      action.onClick();
      onClose();
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      position="bottom"
      height="auto"
    >
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={action.disabled}
            className={`
              w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors
              ${action.variant === 'danger' 
                ? 'text-red-600 hover:bg-red-50' 
                : 'text-gray-900 hover:bg-gray-50'
              }
              ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              touch-target
            `}
          >
            {action.icon && (
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {action.icon}
              </div>
            )}
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
        
        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full p-4 mt-4 text-center font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors touch-target"
        >
          Cancel
        </button>
      </div>
    </Drawer>
  );
}