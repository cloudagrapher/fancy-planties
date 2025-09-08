'use client';

import { forwardRef } from 'react';
import { InlineLoadingSpinner } from './LoadingSpinner';

export interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(({
  children,
  isLoading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    outline: 'btn--outline',
    danger: 'btn--danger',
    ghost: 'btn--ghost',
  };
  
  const sizeClasses = {
    sm: 'btn--sm',
    md: '',
    lg: 'btn--lg',
  };

  const isDisabled = disabled || isLoading;
  const showLoadingState = isLoading;
  const buttonText = showLoadingState && loadingText ? loadingText : children;

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'btn--full' : '',
    showLoadingState ? 'btn--loading' : '',
    isDisabled ? 'opacity-50 cursor-not-allowed' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={classes}
      aria-disabled={isDisabled}
      {...props}
    >
      <span className="flex items-center justify-center">
        {/* Loading spinner or left icon */}
        {showLoadingState ? (
          <InlineLoadingSpinner 
            size={size === 'sm' ? 'sm' : 'md'} 
            className="mr-2" 
          />
        ) : (
          icon && iconPosition === 'left' && (
            <span className="mr-2">{icon}</span>
          )
        )}
        
        {/* Button text */}
        <span>{buttonText}</span>
        
        {/* Right icon (only when not loading) */}
        {!showLoadingState && icon && iconPosition === 'right' && (
          <span className="ml-2">{icon}</span>
        )}
      </span>
      
      {/* Screen reader text for loading state */}
      {showLoadingState && (
        <span className="sr-only">
          {loadingText || 'Loading, please wait...'}
        </span>
      )}
    </button>
  );
});

AsyncButton.displayName = 'AsyncButton';

export default AsyncButton;

// Specialized variants for common use cases
export function SubmitButton({
  isLoading,
  children = 'Submit',
  loadingText = 'Submitting...',
  ...props
}: Omit<AsyncButtonProps, 'type'>) {
  return (
    <AsyncButton
      type="submit"
      isLoading={isLoading}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </AsyncButton>
  );
}

export function SaveButton({
  isLoading,
  children = 'Save',
  loadingText = 'Saving...',
  ...props
}: Omit<AsyncButtonProps, 'type'>) {
  return (
    <AsyncButton
      type="button"
      isLoading={isLoading}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </AsyncButton>
  );
}

export function DeleteButton({
  isLoading,
  children = 'Delete',
  loadingText = 'Deleting...',
  ...props
}: Omit<AsyncButtonProps, 'variant'>) {
  return (
    <AsyncButton
      variant="danger"
      isLoading={isLoading}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </AsyncButton>
  );
}

export function RetryButton({
  isLoading,
  children = 'Try Again',
  loadingText = 'Retrying...',
  ...props
}: AsyncButtonProps) {
  return (
    <AsyncButton
      variant="outline"
      isLoading={isLoading}
      loadingText={loadingText}
      icon={
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      }
      {...props}
    >
      {children}
    </AsyncButton>
  );
}