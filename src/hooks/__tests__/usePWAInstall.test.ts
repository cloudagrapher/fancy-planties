import { renderHook, act } from '@testing-library/react';
import { usePWAInstall } from '../usePWAInstall';

// Mock BeforeInstallPromptEvent
class MockBeforeInstallPromptEvent extends Event {
  prompt = jest.fn().mockResolvedValue(undefined);
  userChoice = Promise.resolve({ outcome: 'accepted' as const });
}

describe('usePWAInstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset window properties
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePWAInstall());
    
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isStandalone).toBe(false);
  });

  it('should detect standalone mode', () => {
    // Mock standalone mode
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
    
    const { result } = renderHook(() => usePWAInstall());
    
    expect(result.current.isStandalone).toBe(true);
    expect(result.current.isInstalled).toBe(true);
  });

  it('should handle beforeinstallprompt event', () => {
    const { result } = renderHook(() => usePWAInstall());
    
    act(() => {
      const event = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      window.dispatchEvent(event);
    });
    
    expect(result.current.isInstallable).toBe(true);
  });

  it('should prompt for installation', async () => {
    const { result } = renderHook(() => usePWAInstall());
    
    const mockEvent = new MockBeforeInstallPromptEvent('beforeinstallprompt');
    
    act(() => {
      window.dispatchEvent(mockEvent);
    });
    
    let promptResult;
    await act(async () => {
      promptResult = await result.current.promptInstall();
    });
    
    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(promptResult).toEqual({ outcome: 'accepted' });
  });

  it('should handle installation prompt when not available', async () => {
    const { result } = renderHook(() => usePWAInstall());
    
    let promptResult;
    await act(async () => {
      promptResult = await result.current.promptInstall();
    });
    
    expect(promptResult).toEqual({ outcome: 'not-available' });
  });

  it('should dismiss prompt', () => {
    const { result } = renderHook(() => usePWAInstall());
    
    act(() => {
      const event = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      window.dispatchEvent(event);
    });
    
    expect(result.current.isInstallable).toBe(true);
    
    act(() => {
      result.current.dismissPrompt();
    });
    
    expect(result.current.isInstallable).toBe(false);
  });

  it('should handle app installed event', () => {
    const { result } = renderHook(() => usePWAInstall());
    
    act(() => {
      const event = new MockBeforeInstallPromptEvent('beforeinstallprompt');
      window.dispatchEvent(event);
    });
    
    expect(result.current.isInstallable).toBe(true);
    
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });
});