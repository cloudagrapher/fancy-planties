'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

export interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  length?: number;
}

export default function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
  error,
  length = 6
}: VerificationCodeInputProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first empty input when component mounts or value changes
  useEffect(() => {
    const firstEmptyIndex = value.length;
    if (firstEmptyIndex < length && inputRefs.current[firstEmptyIndex]) {
      inputRefs.current[firstEmptyIndex]?.focus();
      setFocusedIndex(firstEmptyIndex);
    }
  }, [value, length]);

  const handleInputChange = (index: number, inputValue: string) => {
    if (disabled) return;

    // Only allow digits
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    
    // If no valid digit, don't update
    if (!digit && inputValue) return;
    
    // Build new value
    const newValue = value.split('');
    newValue[index] = digit;
    
    // Update value up to current position
    const updatedValue = newValue.slice(0, index + 1).join('');
    onChange(updatedValue);

    // Move to next input if digit was entered
    if (digit && index < length - 1) {
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        setFocusedIndex(index + 1);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (value[index]) {
        // Clear current digit
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.slice(0, Math.max(index, value.length - 1)).join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.slice(0, index).join(''));
        
        const prevInput = inputRefs.current[index - 1];
        if (prevInput) {
          prevInput.focus();
          setFocusedIndex(index - 1);
        }
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      const prevInput = inputRefs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
        setFocusedIndex(index - 1);
      }
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        setFocusedIndex(index + 1);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);
    
    if (digits) {
      onChange(digits);
      
      // Focus the next empty input or the last input
      const nextFocusIndex = Math.min(digits.length, length - 1);
      const targetInput = inputRefs.current[nextFocusIndex];
      if (targetInput) {
        targetInput.focus();
        setFocusedIndex(nextFocusIndex);
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleClick = (index: number) => {
    // When clicking on an input, focus the first empty position or the clicked position
    const firstEmptyIndex = value.length;
    const targetIndex = index <= firstEmptyIndex ? index : firstEmptyIndex;
    
    const targetInput = inputRefs.current[targetIndex];
    if (targetInput) {
      targetInput.focus();
      setFocusedIndex(targetIndex);
    }
  };

  return (
    <div className="verification-code-input">
      <div className="flex justify-center gap-3 mb-2">
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            onClick={() => handleClick(index)}
            disabled={disabled}
            className={`
              w-12 h-12 text-center text-lg font-semibold
              border-2 rounded-lg
              transition-all duration-200
              ${error 
                ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200' 
                : focusedIndex === index
                  ? 'border-mint-400 bg-mint-50 text-mint-900 ring-2 ring-mint-200'
                  : value[index]
                    ? 'border-mint-300 bg-mint-50 text-mint-900'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
              focus:outline-none focus:ring-2
              ${!error && 'focus:ring-mint-200 focus:border-mint-400'}
            `}
            aria-label={`Verification code digit ${index + 1}`}
            aria-describedby={error ? 'verification-code-error' : undefined}
          />
        ))}
      </div>
      
      {error && (
        <div 
          id="verification-code-error" 
          className="text-sm text-red-600 text-center"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}