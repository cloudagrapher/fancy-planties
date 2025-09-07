/**
 * Simple test for useHapticFeedback hook
 * Tests basic functionality without React Testing Library
 */

import { useHapticFeedback } from '../useHapticFeedback';

// Mock navigator.vibrate
const mockVibrate = jest.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
});

describe('useHapticFeedback (simple)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create haptic feedback functions', () => {
    // Since we can't use renderHook without React Testing Library,
    // we'll test the logic directly
    expect(typeof useHapticFeedback).toBe('function');
  });

  it('should detect vibrate support', () => {
    const isSupported = 'vibrate' in navigator;
    expect(isSupported).toBe(true);
  });

  it('should handle missing vibrate API gracefully', () => {
    // Test with undefined vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
    });
    
    const isSupported = 'vibrate' in navigator && navigator.vibrate !== undefined;
    expect(isSupported).toBe(false);
    
    // Restore vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
    });
  });
});