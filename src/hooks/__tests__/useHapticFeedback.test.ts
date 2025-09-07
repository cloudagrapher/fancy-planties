import { renderHook } from '@testing-library/react';
import { useHapticFeedback } from '../useHapticFeedback';

describe('useHapticFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useHapticFeedback());
    
    expect(typeof result.current.triggerHaptic).toBe('function');
    expect(typeof result.current.isHapticSupported).toBe('boolean');
  });

  it('should detect haptic support when vibrate is available', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      writable: true,
    });
    
    const { result } = renderHook(() => useHapticFeedback());
    
    expect(result.current.isHapticSupported).toBe(true);
  });

  it('should detect no haptic support when vibrate is not available', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
    });
    
    const { result } = renderHook(() => useHapticFeedback());
    
    expect(result.current.isHapticSupported).toBe(false);
  });

  it('should trigger vibration for light haptic', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
    });
    
    const { result } = renderHook(() => useHapticFeedback());
    
    result.current.triggerHaptic('light');
    
    expect(mockVibrate).toHaveBeenCalledWith(10);
  });

  it('should trigger vibration for medium haptic', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
    });
    
    const { result } = renderHook(() => useHapticFeedback());
    
    result.current.triggerHaptic('medium');
    
    expect(mockVibrate).toHaveBeenCalledWith(20);
  });

  it('should trigger vibration for heavy haptic', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
    });
    
    const { result } = renderHook(() => useHapticFeedback());
    
    result.current.triggerHaptic('heavy');
    
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  it('should trigger pattern for selection haptic', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
    });
    
    const { result } = renderHook(() => useHapticFeedback());
    
    result.current.triggerHaptic('selection');
    
    expect(mockVibrate).toHaveBeenCalledWith([10, 10, 10]);
  });

  it('should handle vibration errors gracefully', () => {
    const mockVibrate = jest.fn().mockImplementation(() => {
      throw new Error('Vibration not supported');
    });
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
    });
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const { result } = renderHook(() => useHapticFeedback());
    
    expect(() => {
      result.current.triggerHaptic('light');
    }).not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalledWith('Vibration not supported:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should handle advanced haptic feedback when available', () => {
    const mockHapticFeedback = {
      impactOccurred: jest.fn(),
      selectionChanged: jest.fn(),
      notificationOccurred: jest.fn(),
    };
    
    Object.defineProperty(navigator, 'hapticFeedback', {
      value: mockHapticFeedback,
      writable: true,
    });
    
    const { result } = renderHook(() => useHapticFeedback());
    
    result.current.triggerHaptic('light');
    expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('light');
    
    result.current.triggerHaptic('selection');
    expect(mockHapticFeedback.selectionChanged).toHaveBeenCalled();
    
    result.current.triggerHaptic('notification');
    expect(mockHapticFeedback.notificationOccurred).toHaveBeenCalledWith('success');
  });
});