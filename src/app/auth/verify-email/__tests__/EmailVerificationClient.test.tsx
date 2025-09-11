import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import EmailVerificationClient from '../EmailVerificationClient';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('EmailVerificationClient', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
    mockFetch.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the verification form correctly', () => {
    render(<EmailVerificationClient email="test@example.com" />);
    
    expect(screen.getByText('Enter verification code')).toBeInTheDocument();
    expect(screen.getByText(/We've sent a 6-digit code to your email/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify email/i })).toBeInTheDocument();
    expect(screen.getByText("Didn't receive the code? Resend it")).toBeInTheDocument();
  });

  it('auto-submits when 6-digit code is entered', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<EmailVerificationClient email="test@example.com" />);
    
    const inputs = screen.getAllByRole('textbox');
    
    // Enter 6 digits
    await act(async () => {
      await user.type(inputs[0], '1');
      await user.type(inputs[1], '2');
      await user.type(inputs[2], '3');
      await user.type(inputs[3], '4');
      await user.type(inputs[4], '5');
      await user.type(inputs[5], '6');
    });

    // Wait for auto-submit
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456',
        }),
      });
    });
  });

  it('shows success state and redirects after successful verification', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<EmailVerificationClient email="test@example.com" />);
    
    const inputs = screen.getAllByRole('textbox');
    
    // Enter complete code
    await act(async () => {
      await user.type(inputs[0], '123456');
    });

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('Email verified successfully! 🎉')).toBeInTheDocument();
      expect(screen.getByText(/Welcome to Fancy Planties/)).toBeInTheDocument();
    });

    // Fast-forward timer for redirect
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('handles different error types correctly', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    const errorCases = [
      { error: 'CODE_EXPIRED', expectedMessage: 'This code has expired. Please request a new one.' },
      { error: 'CODE_INVALID', expectedMessage: 'Invalid code. Please check and try again.' },
      { error: 'TOO_MANY_ATTEMPTS', expectedMessage: 'Too many attempts. Please request a new code.' },
      { error: 'ALREADY_VERIFIED', expectedMessage: 'Your email is already verified.' },
    ];

    for (const { error, expectedMessage } of errorCases) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error }),
      } as Response);

      const { rerender } = render(<EmailVerificationClient email="test@example.com" />);
      
      const inputs = screen.getAllByRole('textbox');
      
      await act(async () => {
        await user.type(inputs[0], '123456');
      });

      await waitFor(() => {
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      });

      // Clean up for next iteration
      rerender(<div />);
      mockFetch.mockClear();
    }
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<EmailVerificationClient email="test@example.com" />);
    
    const inputs = screen.getAllByRole('textbox');
    
    await act(async () => {
      await user.type(inputs[0], '123456');
    });

    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
    });
  });

  it('handles resend functionality correctly', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, cooldownSeconds: 60 }),
    } as Response);

    render(<EmailVerificationClient email="test@example.com" />);
    
    const resendButton = screen.getByText("Didn't receive the code? Resend it");
    
    await act(async () => {
      await user.click(resendButton);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/resend-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    // Should show cooldown
    await waitFor(() => {
      expect(screen.getByText(/Resend code in 60s/)).toBeInTheDocument();
    });
  });

  it('shows cooldown timer correctly', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, cooldownSeconds: 3 }),
    } as Response);

    render(<EmailVerificationClient email="test@example.com" />);
    
    const resendButton = screen.getByText("Didn't receive the code? Resend it");
    
    await act(async () => {
      await user.click(resendButton);
    });

    // Should show initial cooldown
    await waitFor(() => {
      expect(screen.getByText(/Resend code in 3s/)).toBeInTheDocument();
    });

    // Advance timer by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/Resend code in 2s/)).toBeInTheDocument();

    // Advance timer by 2 more seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Didn't receive the code? Resend it")).toBeInTheDocument();
  });

  it('disables inputs and buttons during loading', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Mock a slow response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      } as Response), 1000))
    );

    render(<EmailVerificationClient email="test@example.com" />);
    
    const inputs = screen.getAllByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /verify email/i });
    
    // Enter code to trigger loading
    await act(async () => {
      await user.type(inputs[0], '123456');
    });

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
    });

    // Inputs should be disabled
    inputs.forEach(input => {
      expect(input).toBeDisabled();
    });

    // Submit button should be disabled and show loading
    expect(submitButton).toBeDisabled();
  });

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'CODE_INVALID' }),
    } as Response);

    render(<EmailVerificationClient email="test@example.com" />);
    
    const inputs = screen.getAllByRole('textbox');
    
    // Enter invalid code
    await act(async () => {
      await user.type(inputs[0], '123456');
    });

    // Should show error
    await waitFor(() => {
      expect(screen.getByText('Invalid code. Please check and try again.')).toBeInTheDocument();
    });

    // Start typing new code
    await act(async () => {
      await user.clear(inputs[0]);
      await user.type(inputs[0], '1');
    });

    // Error should be cleared
    expect(screen.queryByText('Invalid code. Please check and try again.')).not.toBeInTheDocument();
  });

  it('handles manual form submission with incomplete code', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<EmailVerificationClient email="test@example.com" />);
    
    const inputs = screen.getAllByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /verify email/i });
    
    // Enter incomplete code (5 digits)
    await act(async () => {
      await user.type(inputs[0], '1');
      await user.type(inputs[1], '2');
      await user.type(inputs[2], '3');
      await user.type(inputs[3], '4');
      await user.type(inputs[4], '5');
    });

    // Manually click submit with incomplete code
    await act(async () => {
      await user.click(submitButton);
    });

    // Should show error for incomplete code
    await waitFor(() => {
      expect(screen.getByText('Please enter a 6-digit code')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<EmailVerificationClient email="test@example.com" />);
    
    // Check for proper headings
    expect(screen.getByRole('heading', { name: /enter verification code/i })).toBeInTheDocument();
    
    // Check for form
    expect(screen.getByRole('form')).toBeInTheDocument();
    
    // Check for buttons
    expect(screen.getByRole('button', { name: /verify email/i })).toBeInTheDocument();
    
    // Check for proper text content
    expect(screen.getByText(/We've sent a 6-digit code to your email/)).toBeInTheDocument();
  });
});