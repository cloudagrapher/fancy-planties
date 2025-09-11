import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerificationCodeInput from '../VerificationCodeInput';

describe('VerificationCodeInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders 6 input fields by default', () => {
    render(<VerificationCodeInput value="" onChange={mockOnChange} />);
    
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('renders custom number of input fields', () => {
    render(<VerificationCodeInput value="" onChange={mockOnChange} length={4} />);
    
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4);
  });

  it('displays the current value correctly', () => {
    render(<VerificationCodeInput value="123" onChange={mockOnChange} />);
    
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs[0].value).toBe('1');
    expect(inputs[1].value).toBe('2');
    expect(inputs[2].value).toBe('3');
    expect(inputs[3].value).toBe('');
  });

  it('calls onChange when typing a digit', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput value="" onChange={mockOnChange} />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    await user.type(firstInput, '5');
    
    expect(mockOnChange).toHaveBeenCalledWith('5');
  });

  it('moves focus to next input after entering a digit', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput value="" onChange={mockOnChange} />);
    
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], '1');
    
    await waitFor(() => {
      expect(inputs[1]).toHaveFocus();
    });
  });

  it('only allows numeric input', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput value="" onChange={mockOnChange} />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    
    // Try typing a letter - should not call onChange with the letter
    await act(async () => {
      await user.type(firstInput, 'a');
    });
    
    expect(mockOnChange).not.toHaveBeenCalled();
    
    // Try typing a number - should call onChange
    await act(async () => {
      await user.type(firstInput, '5');
    });
    
    expect(mockOnChange).toHaveBeenCalledWith('5');
  });

  it('handles backspace correctly', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput value="123" onChange={mockOnChange} />);
    
    const thirdInput = screen.getAllByRole('textbox')[2];
    
    await act(async () => {
      thirdInput.focus();
      await user.keyboard('{Backspace}');
    });
    
    expect(mockOnChange).toHaveBeenCalledWith('12');
  });

  it('moves to previous input on backspace when current is empty', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput value="12" onChange={mockOnChange} />);
    
    const thirdInput = screen.getAllByRole('textbox')[2];
    
    await act(async () => {
      thirdInput.focus();
      await user.keyboard('{Backspace}');
    });
    
    const secondInput = screen.getAllByRole('textbox')[1];
    await waitFor(() => {
      expect(secondInput).toHaveFocus();
    });
    expect(mockOnChange).toHaveBeenCalledWith('1');
  });

  it('handles arrow key navigation', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput value="123" onChange={mockOnChange} />);
    
    const secondInput = screen.getAllByRole('textbox')[1];
    
    await act(async () => {
      secondInput.focus();
      await user.keyboard('{ArrowRight}');
    });
    
    const thirdInput = screen.getAllByRole('textbox')[2];
    await waitFor(() => {
      expect(thirdInput).toHaveFocus();
    });
    
    await act(async () => {
      await user.keyboard('{ArrowLeft}');
    });
    
    await waitFor(() => {
      expect(secondInput).toHaveFocus();
    });
  });

  it('handles paste functionality', async () => {
    render(<VerificationCodeInput value="" onChange={mockOnChange} />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    firstInput.focus();
    
    // Simulate paste event
    const pasteEvent = new Event('paste', { bubbles: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: () => '123456'
      }
    });
    
    fireEvent(firstInput, pasteEvent);
    
    expect(mockOnChange).toHaveBeenCalledWith('123456');
  });

  it('filters non-numeric characters from paste', async () => {
    render(<VerificationCodeInput value="" onChange={mockOnChange} />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    firstInput.focus();
    
    const pasteEvent = new Event('paste', { bubbles: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: () => 'a1b2c3d4e5f6'
      }
    });
    
    fireEvent(firstInput, pasteEvent);
    
    expect(mockOnChange).toHaveBeenCalledWith('123456');
  });

  it('limits paste to input length', async () => {
    render(<VerificationCodeInput value="" onChange={mockOnChange} length={4} />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    firstInput.focus();
    
    const pasteEvent = new Event('paste', { bubbles: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: () => '123456789'
      }
    });
    
    fireEvent(firstInput, pasteEvent);
    
    expect(mockOnChange).toHaveBeenCalledWith('1234');
  });

  it('shows error state correctly', () => {
    render(
      <VerificationCodeInput 
        value="123" 
        onChange={mockOnChange} 
        error="Invalid code" 
      />
    );
    
    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toHaveTextContent('Invalid code');
    
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveClass('border-red-300');
    });
  });

  it('disables inputs when disabled prop is true', () => {
    render(<VerificationCodeInput value="123" onChange={mockOnChange} disabled />);
    
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput value="" onChange={mockOnChange} disabled />);
    
    const firstInput = screen.getAllByRole('textbox')[0];
    await user.type(firstInput, '1');
    
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('focuses first empty input on click', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput value="12" onChange={mockOnChange} />);
    
    const fifthInput = screen.getAllByRole('textbox')[4];
    
    await act(async () => {
      await user.click(fifthInput);
    });
    
    const thirdInput = screen.getAllByRole('textbox')[2];
    await waitFor(() => {
      expect(thirdInput).toHaveFocus();
    });
  });

  it('has proper accessibility attributes', () => {
    render(
      <VerificationCodeInput 
        value="123" 
        onChange={mockOnChange} 
        error="Invalid code" 
      />
    );
    
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, index) => {
      expect(input).toHaveAttribute('aria-label', `Verification code digit ${index + 1}`);
      expect(input).toHaveAttribute('aria-describedby', 'verification-code-error');
      expect(input).toHaveAttribute('inputMode', 'numeric');
      expect(input).toHaveAttribute('pattern', '[0-9]*');
    });
  });
});